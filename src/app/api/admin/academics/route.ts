import { z } from 'zod';
import { fail, guardMutation, ok, parseBody, readJson } from '@/lib/api';
import { requireApiAdmin } from '@/lib/auth/api-guards';
import { recordAudit } from '@/lib/auth/events';
import { withPrincipal } from '@/lib/db/pool';
import { requestContext } from '@/lib/security/request-context';
import { CLASS_LEVELS, STREAMS } from '@/lib/school';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Sets up the academic structure: sessions, terms, classes and subjects.
 * These are the records an approval depends on, so they come first when a new
 * school year is being prepared.
 */
const schema = z.discriminatedUnion('kind', [
  z.object({
    kind: z.literal('session'),
    name: z.string().trim().regex(/^\d{4}\/\d{4}$/, 'Use the form 2025/2026.'),
    startsOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Choose a start date.'),
    endsOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Choose an end date.'),
    makeCurrent: z.boolean().default(true),
  }),
  z.object({
    kind: z.literal('term'),
    sessionId: z.uuid(),
    name: z.enum(['First Term', 'Second Term', 'Third Term']),
    startsOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Choose a start date.'),
    endsOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Choose an end date.'),
    makeCurrent: z.boolean().default(true),
  }),
  z.object({
    kind: z.literal('class'),
    level: z.enum(CLASS_LEVELS),
    arm: z.string().trim().regex(/^[A-Z]$/, 'Use a single capital letter.').default('A'),
    stream: z.enum(STREAMS).optional(),
    capacity: z.number().int().positive().max(200).optional(),
  }),
  z.object({
    kind: z.literal('subject'),
    name: z.string().trim().min(2).max(80),
    code: z.string().trim().min(2).max(16).toUpperCase(),
    department: z.enum(['Science', 'Art', 'Commercial', 'General']).default('General'),
  }),
]);

export async function POST(request: Request): Promise<Response> {
  const body = await readJson(request);

  const blocked = await guardMutation(body);
  if (blocked) return blocked;

  const auth = await requireApiAdmin();
  if ('response' in auth) return auth.response;
  const { principal } = auth;

  const parsed = parseBody(schema, body);
  if (parsed.response) return parsed.response;
  const input = parsed.data;

  try {
    const created = await withPrincipal(principal, async (tx) => {
      switch (input.kind) {
        case 'session': {
          // Only one session may be current, enforced by a partial unique
          // index, so the previous one is stood down first.
          if (input.makeCurrent) {
            await tx.exec('update academic_sessions set is_current = false where is_current');
          }
          const row = await tx.one<{ id: string }>(
            `insert into academic_sessions (name, starts_on, ends_on, is_current)
             values ($1, $2, $3, $4) returning id`,
            [input.name, input.startsOn, input.endsOn, input.makeCurrent],
          );
          return { id: row.id, label: input.name };
        }

        case 'term': {
          if (input.makeCurrent) {
            await tx.exec('update terms set is_current = false where is_current');
          }
          const row = await tx.one<{ id: string }>(
            `insert into terms (session_id, name, starts_on, ends_on, is_current)
             values ($1, $2, $3, $4, $5) returning id`,
            [input.sessionId, input.name, input.startsOn, input.endsOn, input.makeCurrent],
          );
          return { id: row.id, label: input.name };
        }

        case 'class': {
          const row = await tx.one<{ id: string; label: string }>(
            `insert into classes (level, arm, stream, capacity)
             values ($1, $2, $3, $4)
             returning id, palmseed_class_label(level, stream, arm) as label`,
            [input.level, input.arm, input.stream ?? null, input.capacity ?? null],
          );
          return { id: row.id, label: row.label };
        }

        case 'subject': {
          const row = await tx.one<{ id: string }>(
            `insert into subjects (name, code, department) values ($1, $2, $3) returning id`,
            [input.name, input.code, input.department],
          );
          return { id: row.id, label: input.name };
        }
      }
    });

    const context = await requestContext();
    await recordAudit({
      principal,
      action: `academics.${input.kind}.create`,
      entityType: input.kind,
      entityId: created.id,
      summary: `Created the ${input.kind} ${created.label}`,
      ipHash: context.ipHash,
    });

    return ok({ id: created.id, message: `${created.label} created.` }, { status: 201 });
  } catch (error) {
    if (error instanceof Error) {
      if (/unique|duplicate/i.test(error.message)) {
        return fail('That record already exists.', 409);
      }
      if (/classes_stream_rule/.test(error.message)) {
        return fail('A pathway can only be set on a senior class.', 422);
      }
      if (/_range/.test(error.message)) {
        return fail('The end date must come after the start date.', 422);
      }
    }
    throw error;
  }
}
