import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { ANONYMOUS, AUTHENTICATOR, closePool, withPrincipal } from '@/lib/db/pool';
import { hashPassword } from '@/lib/security/password';
import { RATE_LIMITS, clearRateLimit, consumeRateLimit } from '@/lib/security/rate-limit';

/**
 * These run against a real PostgreSQL instance, using the same connection the
 * application uses. The point is to prove that the row level security policies
 * actually hold, which a mock could never show.
 */

const marker = `test-${Date.now()}`;
const created = {
  studentA: '',
  studentB: '',
  profileA: '',
  profileB: '',
  teacherUser: '',
  teacherId: '',
  classId: '',
  sessionId: '',
  termId: '',
  subjectId: '',
};

beforeAll(async () => {
  const hash = await hashPassword('integration test password 1');

  // Accounts are created through the authenticator principal, exactly as
  // public signup does.
  await withPrincipal(AUTHENTICATOR, async (tx) => {
    const a = await tx.one<{ id: string }>(
      `insert into users (email, full_name, password_hash, role, status)
       values ($1, 'Student A', $2, 'student', 'active') returning id`,
      [`a.${marker}@example.test`, hash],
    );
    const b = await tx.one<{ id: string }>(
      `insert into users (email, full_name, password_hash, role, status)
       values ($1, 'Student B', $2, 'student', 'active') returning id`,
      [`b.${marker}@example.test`, hash],
    );
    created.studentA = a.id;
    created.studentB = b.id;
  });

  await withPrincipal({ kind: 'user', userId: created.studentA, role: 'admin' }, async (tx) => {
    const session = await tx.one<{ id: string }>(
      `insert into academic_sessions (name, starts_on, ends_on, is_current)
       values ($1, '2099-09-01', '2100-07-31', false) returning id`,
      [`Test ${marker}`],
    );
    const term = await tx.one<{ id: string }>(
      `insert into terms (session_id, name, starts_on, ends_on)
       values ($1, 'First Term', '2099-09-01', '2099-12-15') returning id`,
      [session.id],
    );
    const klass = await tx.one<{ id: string }>(
      `insert into classes (level, arm) values ('JSS 2', $1) returning id`,
      [marker.slice(-1).toUpperCase().replace(/[^A-Z]/, 'Z')],
    );
    const subject = await tx.one<{ id: string }>(
      `insert into subjects (name, code, department) values ($1, $2, 'General') returning id`,
      [`Test Subject ${marker}`, `TS${marker.slice(-6)}`],
    );

    created.sessionId = session.id;
    created.termId = term.id;
    created.classId = klass.id;
    created.subjectId = subject.id;

    const profileA = await tx.one<{ id: string }>(
      `insert into student_profiles (user_id, class_id, current_session_id, admission_number)
       values ($1, $2, $3, $4) returning id`,
      [created.studentA, klass.id, session.id, `PMS/TEST/${marker.slice(-6)}A`],
    );
    const profileB = await tx.one<{ id: string }>(
      `insert into student_profiles (user_id, class_id, current_session_id, admission_number)
       values ($1, $2, $3, $4) returning id`,
      [created.studentB, klass.id, session.id, `PMS/TEST/${marker.slice(-6)}B`],
    );

    created.profileA = profileA.id;
    created.profileB = profileB.id;
  });
});

afterAll(async () => {
  // Users cascade to profiles, results and events.
  await withPrincipal({ kind: 'user', userId: created.studentA, role: 'admin' }, async (tx) => {
    await tx.exec('delete from users where email like $1', [`%${marker}@example.test`]);
    await tx.exec('delete from users where id = $1', [created.teacherUser || null]);
    await tx.exec('delete from subjects where id = $1', [created.subjectId || null]);
    await tx.exec('delete from classes where id = $1', [created.classId || null]);
    await tx.exec('delete from academic_sessions where id = $1', [created.sessionId || null]);
  });
  await closePool();
});

describe('row level security', () => {
  it('shows a student exactly one user row, their own', async () => {
    const rows = await withPrincipal(
      { kind: 'user', userId: created.studentA, role: 'student' },
      (tx) => tx.rows<{ id: string; email: string }>('select id, email from users'),
    );

    expect(rows).toHaveLength(1);
    expect(rows[0]?.id).toBe(created.studentA);
  });

  it('stops a student reaching another student profile', async () => {
    const rows = await withPrincipal(
      { kind: 'user', userId: created.studentA, role: 'student' },
      (tx) =>
        tx.rows<{ id: string }>('select id from student_profiles where id = $1', [
          created.profileB,
        ]),
    );

    // The predicate names the other student explicitly, and still returns
    // nothing, because the policy filters it out.
    expect(rows).toHaveLength(0);
  });

  it('shows anonymous visitors no accounts and no security events', async () => {
    const users = await withPrincipal(ANONYMOUS, (tx) =>
      tx.rows<{ id: string }>('select id from users'),
    );
    const events = await withPrincipal(ANONYMOUS, (tx) =>
      tx.rows<{ id: string }>('select id from auth_events'),
    );

    expect(users).toHaveLength(0);
    expect(events).toHaveLength(0);
  });

  it('lets an administrator see both students', async () => {
    const rows = await withPrincipal(
      { kind: 'user', userId: created.studentA, role: 'admin' },
      (tx) =>
        tx.rows<{ id: string }>('select id from users where email like $1', [
          `%${marker}@example.test`,
        ]),
    );

    expect(rows).toHaveLength(2);
  });

  it('hides unpublished results from the student they belong to', async () => {
    await withPrincipal({ kind: 'user', userId: created.studentA, role: 'admin' }, (tx) =>
      tx.exec(
        `insert into results (student_profile_id, class_id, subject_id, session_id, term_id, ca_score, exam_score)
         values ($1,$2,$3,$4,$5,32,50)`,
        [created.profileA, created.classId, created.subjectId, created.sessionId, created.termId],
      ),
    );

    const beforePublish = await withPrincipal(
      { kind: 'user', userId: created.studentA, role: 'student' },
      (tx) => tx.rows<{ id: string }>('select id from results'),
    );
    expect(beforePublish).toHaveLength(0);

    await withPrincipal({ kind: 'user', userId: created.studentA, role: 'admin' }, (tx) =>
      tx.exec('update results set published_at = now() where student_profile_id = $1', [
        created.profileA,
      ]),
    );

    const afterPublish = await withPrincipal(
      { kind: 'user', userId: created.studentA, role: 'student' },
      (tx) =>
        tx.rows<{ total_score: string; grade: string }>('select total_score, grade from results'),
    );

    expect(afterPublish).toHaveLength(1);
    expect(Number(afterPublish[0]?.total_score)).toBe(82);
  });

  it('does not leak a published result to a different student', async () => {
    const rows = await withPrincipal(
      { kind: 'user', userId: created.studentB, role: 'student' },
      (tx) => tx.rows<{ id: string }>('select id from results'),
    );
    expect(rows).toHaveLength(0);
  });
});

describe('grade computation', () => {
  it('derives the total and the grade from the two entered scores', async () => {
    const cases: Array<[number, number, number, string]> = [
      [40, 60, 100, 'A1'],
      [30, 45, 75, 'A1'],
      [30, 40, 70, 'B2'],
      [25, 40, 65, 'B3'],
      [20, 40, 60, 'C4'],
      [20, 35, 55, 'C5'],
      [20, 30, 50, 'C6'],
      [15, 30, 45, 'D7'],
      [10, 30, 40, 'E8'],
      [5, 20, 25, 'F9'],
    ];

    for (const [ca, exam, total, grade] of cases) {
      const row = await withPrincipal(ANONYMOUS, (tx) =>
        tx.one<{ total: string; grade: string }>(
          'select ($1::numeric + $2::numeric) as total, palmseed_grade($1::numeric + $2::numeric) as grade',
          [ca, exam],
        ),
      );

      expect(Number(row.total)).toBe(total);
      expect(row.grade).toBe(grade);
    }
  });

  it('refuses a continuous assessment score above 40', async () => {
    await expect(
      withPrincipal({ kind: 'user', userId: created.studentA, role: 'admin' }, (tx) =>
        tx.exec(
          `insert into results (student_profile_id, class_id, subject_id, session_id, term_id, ca_score)
           values ($1,$2,$3,$4,$5,41)`,
          [created.profileB, created.classId, created.subjectId, created.sessionId, created.termId],
        ),
      ),
    ).rejects.toThrow(/ca_score/);
  });
});

describe('admission numbers', () => {
  it('allocates sequential numbers without repeating', async () => {
    const year = 2098;

    const numbers = await withPrincipal(
      { kind: 'user', userId: created.studentA, role: 'admin' },
      async (tx) => {
        const out: string[] = [];
        for (let index = 0; index < 5; index += 1) {
          const row = await tx.one<{ n: string }>(
            'select palmseed_next_admission_number($1::int) as n',
            [year],
          );
          out.push(row.n);
        }
        return out;
      },
    );

    expect(new Set(numbers).size).toBe(5);
    expect(numbers[0]).toMatch(/^PMS\/2098\/\d{4}$/);

    // Cleanup so a repeat run starts from the same place.
    await withPrincipal({ kind: 'user', userId: created.studentA, role: 'admin' }, (tx) =>
      tx.exec('delete from admission_number_counters where session_year = $1', [year]),
    );
  });
});

describe('rate limiting', () => {
  it('blocks after the limit and reports how long to wait', async () => {
    const identifier = `rate-${marker}`;
    const rule = { ...RATE_LIMITS.signin, limit: 3, blockSeconds: 60 };

    await clearRateLimit(rule, identifier);

    const first = await consumeRateLimit(rule, identifier);
    expect(first.allowed).toBe(true);
    expect(first.remaining).toBe(2);

    await consumeRateLimit(rule, identifier);
    await consumeRateLimit(rule, identifier);

    const blocked = await consumeRateLimit(rule, identifier);
    expect(blocked.allowed).toBe(false);
    expect(blocked.retryAfterSeconds).toBeGreaterThan(0);

    // A success clears the bucket, so one good sign in forgives earlier misses.
    await clearRateLimit(rule, identifier);
    const afterClear = await consumeRateLimit(rule, identifier);
    expect(afterClear.allowed).toBe(true);

    await clearRateLimit(rule, identifier);
  });
});

describe('constraints that protect the record', () => {
  it('refuses a duplicate email address regardless of case', async () => {
    await expect(
      withPrincipal(AUTHENTICATOR, (tx) =>
        tx.exec(
          `insert into users (email, full_name, password_hash) values ($1, 'Duplicate', 'x')`,
          [`A.${marker}@EXAMPLE.TEST`],
        ),
      ),
    ).rejects.toThrow(/users_email_unique/);
  });

  it('refuses an application without guardian consent', async () => {
    await expect(
      withPrincipal(AUTHENTICATOR, (tx) =>
        tx.exec(
          `insert into applications
             (user_id, class_applying_for, date_of_birth, guardian_name, guardian_email,
              guardian_phone, guardian_consent, terms_accepted_at)
           values ($1, 'JSS 1', '2012-01-01', 'G', 'g@example.test', '08012345678', false, now())`,
          [created.studentB],
        ),
      ),
    ).rejects.toThrow(/applications_consent_required/);
  });

  it('refuses a pathway on a junior class', async () => {
    await expect(
      withPrincipal({ kind: 'user', userId: created.studentA, role: 'admin' }, (tx) =>
        tx.exec(`insert into classes (level, arm, stream) values ('JSS 1', 'Z', 'Science')`),
      ),
    ).rejects.toThrow(/classes_stream_rule/);
  });

  it('refuses attendance dated in the future', async () => {
    await expect(
      withPrincipal({ kind: 'user', userId: created.studentA, role: 'admin' }, (tx) =>
        tx.exec(
          `insert into attendance (student_profile_id, class_id, session_id, term_id, attendance_date, status)
           values ($1,$2,$3,$4, current_date + 5, 'present')`,
          [created.profileA, created.classId, created.sessionId, created.termId],
        ),
      ),
    ).rejects.toThrow(/attendance_not_future/);
  });

  it('refuses a fee payment larger than the amount billed', async () => {
    await expect(
      withPrincipal({ kind: 'user', userId: created.studentA, role: 'admin' }, (tx) =>
        tx.exec(
          `insert into fees (student_profile_id, session_id, term_id, description, amount_kobo, amount_paid_kobo)
           values ($1,$2,$3,'Test fee', 1000, 2000)`,
          [created.profileA, created.sessionId, created.termId],
        ),
      ),
    ).rejects.toThrow(/fees_payment_bounds/);
  });
});

describe('email ledger', () => {
  it('records a message and its delivery outcome', async () => {
    const { sendEmail } = await import('@/lib/email/send');
    const { verificationEmail } = await import('@/lib/email/templates');

    const result = await sendEmail({
      to: `ledger.${marker}@example.test`,
      toName: 'Ledger Test',
      template: 'email_verification',
      relatedUserId: created.studentA,
      document: verificationEmail({
        fullName: 'Ledger Test',
        verifyUrl: 'https://example.test/verify?token=x',
      }),
    });

    // No RESEND_API_KEY in the test environment, so the send is recorded as
    // simulated rather than silently skipped.
    expect(result.status).toBe('simulated');

    const row = await withPrincipal(
      { kind: 'user', userId: created.studentA, role: 'admin' },
      (tx) =>
        tx.maybeOne<{ status: string; subject: string; sent_at: Date | null }>(
          'select status, subject, sent_at from email_logs where id = $1',
          [result.logId],
        ),
    );

    expect(row?.status).toBe('simulated');
    expect(row?.subject).toContain('Confirm your email');
    expect(row?.sent_at).not.toBeNull();

    await withPrincipal({ kind: 'user', userId: created.studentA, role: 'admin' }, (tx) =>
      tx.exec('delete from email_logs where id = $1', [result.logId]),
    );
  });
});
