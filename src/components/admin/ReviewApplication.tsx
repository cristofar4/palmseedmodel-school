'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { SelectField, TextAreaField } from '@/components/ui/Field';
import { Alert } from '@/components/ui/Feedback';
import { postJson } from '@/lib/client/request';
import type { ClassOption, SessionOption } from '@/lib/data/admin';

/**
 * Approve or reject one registration.
 *
 * Approving needs a class and a session, because that is what an admission
 * number is issued against. If either list is empty the control says so rather
 * than presenting an empty selector.
 */
export function ReviewApplication({
  csrfToken,
  applicationId,
  studentName,
  classes,
  sessions,
  suggestedLevel,
  suggestedStream,
}: {
  csrfToken: string;
  applicationId: string;
  studentName: string;
  classes: ClassOption[];
  sessions: SessionOption[];
  suggestedLevel: string;
  suggestedStream: string | null;
}) {
  const router = useRouter();
  const [pending, setPending] = useState<'approve' | 'reject' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);
  const [fields, setFields] = useState<Record<string, string>>({});
  const [confirmingReject, setConfirmingReject] = useState(false);

  // Pre select the class that matches what the family applied for.
  const preferred =
    classes.find(
      (option) =>
        option.level === suggestedLevel && (option.stream ?? null) === (suggestedStream ?? null),
    ) ?? classes.find((option) => option.level === suggestedLevel);

  const currentSession = sessions.find((session) => session.is_current) ?? sessions[0];

  const ready = classes.length > 0 && sessions.length > 0;

  async function submit(decision: 'approve' | 'reject', form: FormData) {
    setPending(decision);
    setError(null);
    setFields({});

    const payload =
      decision === 'approve'
        ? {
            decision,
            applicationId,
            classId: String(form.get('classId') ?? ''),
            sessionId: String(form.get('sessionId') ?? ''),
            note: String(form.get('note') ?? ''),
          }
        : {
            decision,
            applicationId,
            note: String(form.get('note') ?? ''),
          };

    const outcome = await postJson<{ status: string; admissionNumber?: string }>(
      '/api/admin/applications/review',
      payload,
      csrfToken,
    );

    setPending(null);

    if (!outcome.ok) {
      setError(outcome.error ?? 'That did not work.');
      setFields(outcome.fields ?? {});
      return;
    }

    setDone(
      outcome.data?.status === 'approved'
        ? `${studentName} has been admitted as ${outcome.data.admissionNumber}. The approval email has been sent to the student and the guardian.`
        : `The registration has been rejected and both parties have been emailed.`,
    );
    router.refresh();
  }

  if (done) {
    return (
      <Alert tone="success" title="Decision recorded">
        {done}
      </Alert>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {error ? <Alert tone="error">{error}</Alert> : null}

      {!ready ? (
        <Alert tone="warning" title="Academic setup is not complete">
          A registration can only be approved once an academic session and at least one class exist.
          Create them under Academic setup first.
        </Alert>
      ) : null}

      <form
        onSubmit={(event) => {
          event.preventDefault();
          if (pending) return;
          void submit('approve', new FormData(event.currentTarget));
        }}
        className="flex flex-col gap-5 border border-ink-100 p-5"
      >
        <h3 className="font-display text-[1.0625rem]">Approve and admit</h3>

        <div className="grid gap-5 sm:grid-cols-2">
          <SelectField
            label="Class"
            name="classId"
            required
            disabled={!ready}
            defaultValue={preferred?.id}
            error={fields.classId}
            hint={preferred ? undefined : 'No class matches the level applied for.'}
          >
            {classes.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
          </SelectField>

          <SelectField
            label="Academic session"
            name="sessionId"
            required
            disabled={!ready}
            defaultValue={currentSession?.id}
            error={fields.sessionId}
          >
            {sessions.map((option) => (
              <option key={option.id} value={option.id}>
                {option.name}
                {option.is_current ? ' (current)' : ''}
              </option>
            ))}
          </SelectField>
        </div>

        <TextAreaField
          label="Note for the family"
          name="note"
          rows={2}
          error={fields.note}
          hint="Optional. Included in the approval email."
        />

        <div>
          <Button
            type="submit"
            disabled={!ready}
            loading={pending === 'approve'}
            loadingLabel="Admitting"
          >
            Approve and issue an admission number
          </Button>
        </div>
      </form>

      <form
        onSubmit={(event) => {
          event.preventDefault();
          if (pending) return;
          // A rejection sends an email that cannot be recalled, so it takes a
          // second deliberate action.
          if (!confirmingReject) {
            setConfirmingReject(true);
            return;
          }
          void submit('reject', new FormData(event.currentTarget));
        }}
        className="flex flex-col gap-5 border border-ink-100 p-5"
      >
        <h3 className="font-display text-[1.0625rem]">Reject</h3>

        <TextAreaField
          label="Reason"
          name="note"
          rows={3}
          required
          error={fields.note}
          hint="Included in the email to the student and the guardian. Please be clear and courteous."
        />

        {confirmingReject ? (
          <Alert tone="warning">
            This emails {studentName} and the guardian immediately and cannot be undone. Press again
            to confirm.
          </Alert>
        ) : null}

        <div className="flex flex-wrap gap-3">
          <Button type="submit" variant="danger" loading={pending === 'reject'} loadingLabel="Rejecting">
            {confirmingReject ? 'Confirm rejection' : 'Reject this registration'}
          </Button>
          {confirmingReject ? (
            <Button type="button" variant="ghost" onClick={() => setConfirmingReject(false)}>
              Cancel
            </Button>
          ) : null}
        </div>
      </form>
    </div>
  );
}
