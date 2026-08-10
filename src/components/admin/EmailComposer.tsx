'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { SelectField, TextAreaField, TextField } from '@/components/ui/Field';
import { Alert } from '@/components/ui/Feedback';
import { postJson } from '@/lib/client/request';
import type { ClassOption } from '@/lib/data/admin';

interface StudentChoice {
  user_id: string;
  full_name: string;
  admission_number: string | null;
}

const AUDIENCES = [
  { value: 'student', label: 'One student' },
  { value: 'guardian', label: 'One guardian' },
  { value: 'class', label: 'A complete class' },
  { value: 'all_students', label: 'All students' },
  { value: 'all_guardians', label: 'All guardians' },
  { value: 'students_and_guardians', label: 'Students and guardians together' },
] as const;

export function EmailComposer({
  csrfToken,
  classes,
  studentChoices,
  liveDelivery,
}: {
  csrfToken: string;
  classes: ClassOption[];
  studentChoices: StudentChoice[];
  liveDelivery: boolean;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);
  const [fields, setFields] = useState<Record<string, string>>({});
  const [audience, setAudience] = useState<string>('student');

  const needsStudent = audience === 'student' || audience === 'guardian';
  const needsClass = audience === 'class';

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;

    setPending(true);
    setError(null);
    setDone(null);
    setFields({});

    const formElement = event.currentTarget;
    const form = new FormData(formElement);

    const outcome = await postJson<{ recipients: number; sent: number; failed: number }>(
      '/api/admin/email',
      {
        audience,
        targetUserId: needsStudent ? String(form.get('targetUserId') ?? '') : '',
        classId: needsClass ? String(form.get('classId') ?? '') : '',
        subject: String(form.get('subject') ?? ''),
        body: String(form.get('body') ?? ''),
      },
      csrfToken,
    );

    setPending(false);

    if (!outcome.ok) {
      setError(outcome.error ?? 'We could not send that.');
      setFields(outcome.fields ?? {});
      return;
    }

    const data = outcome.data;
    setDone(
      `Sent to ${data?.recipients ?? 0} recipient${data?.recipients === 1 ? '' : 's'}.` +
        (data && data.failed > 0 ? ` ${data.failed} failed, see the delivery history below.` : ''),
    );
    formElement.reset();
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-5">
      {error ? <Alert tone="error">{error}</Alert> : null}
      {done ? <Alert tone="success">{done}</Alert> : null}

      {!liveDelivery ? (
        <Alert tone="warning" title="Delivery is not switched on">
          RESEND_API_KEY is not configured, so messages are rendered and recorded but not actually
          sent. Every one appears in the history below marked Simulated.
        </Alert>
      ) : null}

      <SelectField
        label="Send to"
        name="audience"
        value={audience}
        onChange={(event) => setAudience(event.target.value)}
        error={fields.audience}
      >
        {AUDIENCES.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </SelectField>

      {needsStudent ? (
        <SelectField
          label={audience === 'guardian' ? 'Guardian of' : 'Student'}
          name="targetUserId"
          required
          error={fields.targetUserId}
          hint={studentChoices.length === 0 ? 'There are no student accounts yet.' : undefined}
        >
          {studentChoices.map((student) => (
            <option key={student.user_id} value={student.user_id}>
              {student.full_name}
              {student.admission_number ? `, ${student.admission_number}` : ''}
            </option>
          ))}
        </SelectField>
      ) : null}

      {needsClass ? (
        <SelectField label="Class" name="classId" required error={fields.classId}>
          {classes.map((option) => (
            <option key={option.id} value={option.id}>
              {option.label}
            </option>
          ))}
        </SelectField>
      ) : null}

      <TextField label="Subject" name="subject" required error={fields.subject} />

      <TextAreaField
        label="Message"
        name="body"
        rows={9}
        required
        error={fields.body}
        hint="Leave a blank line between paragraphs. The school branding and footer are added automatically."
      />

      <div>
        <Button type="submit" loading={pending} loadingLabel="Sending">
          Send message
        </Button>
      </div>
    </form>
  );
}
