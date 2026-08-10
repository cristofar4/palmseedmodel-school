'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { CheckboxField, SelectField, TextField } from '@/components/ui/Field';
import { Alert } from '@/components/ui/Feedback';
import { postJson } from '@/lib/client/request';
import { CLASS_LEVELS, STREAMS, isSeniorLevel } from '@/lib/school';
import type { SessionOption } from '@/lib/data/admin';

/** Shared submit handling for the four small setup forms on this page. */
function useSetupForm(csrfToken: string) {
  const router = useRouter();
  const [pending, setPending] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);
  const [fields, setFields] = useState<Record<string, string>>({});

  async function submit(kind: string, payload: Record<string, unknown>, formElement: HTMLFormElement) {
    setPending(kind);
    setError(null);
    setDone(null);
    setFields({});

    const outcome = await postJson<{ message: string }>(
      '/api/admin/academics',
      { kind, ...payload },
      csrfToken,
    );

    setPending(null);

    if (!outcome.ok) {
      setError(outcome.error ?? 'That did not work.');
      setFields(outcome.fields ?? {});
      return;
    }

    setDone(outcome.data?.message ?? 'Created.');
    formElement.reset();
    router.refresh();
  }

  return { pending, error, done, fields, submit };
}

export function AcademicsForms({
  csrfToken,
  sessions,
}: {
  csrfToken: string;
  sessions: SessionOption[];
}) {
  const { pending, error, done, fields, submit } = useSetupForm(csrfToken);
  const [level, setLevel] = useState<string>('JSS 1');

  return (
    <div className="flex flex-col gap-6">
      {error ? <Alert tone="error">{error}</Alert> : null}
      {done ? <Alert tone="success">{done}</Alert> : null}

      {/* Session ---------------------------------------------------------- */}
      <form
        onSubmit={(event) => {
          event.preventDefault();
          const form = new FormData(event.currentTarget);
          void submit(
            'session',
            {
              name: String(form.get('name') ?? ''),
              startsOn: String(form.get('startsOn') ?? ''),
              endsOn: String(form.get('endsOn') ?? ''),
              makeCurrent: form.get('makeCurrent') === 'on',
            },
            event.currentTarget,
          );
        }}
        className="flex flex-col gap-4 border border-ink-100 p-5"
      >
        <h3 className="font-display text-[1.0625rem]">Academic session</h3>
        <div className="grid gap-4 sm:grid-cols-3">
          <TextField
            label="Name"
            name="name"
            required
            placeholder="2025/2026"
            error={fields.name}
          />
          <TextField label="Starts on" name="startsOn" type="date" required error={fields.startsOn} />
          <TextField label="Ends on" name="endsOn" type="date" required error={fields.endsOn} />
        </div>
        <CheckboxField name="makeCurrent" defaultChecked label="Make this the current session" />
        <div>
          <Button type="submit" size="sm" loading={pending === 'session'} loadingLabel="Creating">
            Create session
          </Button>
        </div>
      </form>

      {/* Term -------------------------------------------------------------- */}
      <form
        onSubmit={(event) => {
          event.preventDefault();
          const form = new FormData(event.currentTarget);
          void submit(
            'term',
            {
              sessionId: String(form.get('sessionId') ?? ''),
              name: String(form.get('name') ?? ''),
              startsOn: String(form.get('startsOn') ?? ''),
              endsOn: String(form.get('endsOn') ?? ''),
              makeCurrent: form.get('makeCurrent') === 'on',
            },
            event.currentTarget,
          );
        }}
        className="flex flex-col gap-4 border border-ink-100 p-5"
      >
        <h3 className="font-display text-[1.0625rem]">Term</h3>

        {sessions.length === 0 ? (
          <Alert tone="info">Create an academic session first. A term belongs to one.</Alert>
        ) : (
          <>
            <div className="grid gap-4 sm:grid-cols-2">
              <SelectField label="Session" name="sessionId" required error={fields.sessionId}>
                {sessions.map((session) => (
                  <option key={session.id} value={session.id}>
                    {session.name}
                    {session.is_current ? ' (current)' : ''}
                  </option>
                ))}
              </SelectField>
              <SelectField label="Term" name="name" required error={fields.name}>
                <option value="First Term">First Term</option>
                <option value="Second Term">Second Term</option>
                <option value="Third Term">Third Term</option>
              </SelectField>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <TextField label="Starts on" name="startsOn" type="date" required error={fields.startsOn} />
              <TextField label="Ends on" name="endsOn" type="date" required error={fields.endsOn} />
            </div>
            <CheckboxField name="makeCurrent" defaultChecked label="Make this the current term" />
            <div>
              <Button type="submit" size="sm" loading={pending === 'term'} loadingLabel="Creating">
                Create term
              </Button>
            </div>
          </>
        )}
      </form>

      {/* Class -------------------------------------------------------------- */}
      <form
        onSubmit={(event) => {
          event.preventDefault();
          const form = new FormData(event.currentTarget);
          const chosenLevel = String(form.get('level') ?? '');
          const stream = String(form.get('stream') ?? '');
          const capacity = String(form.get('capacity') ?? '');

          void submit(
            'class',
            {
              level: chosenLevel,
              arm: String(form.get('arm') ?? 'A').toUpperCase(),
              stream: isSeniorLevel(chosenLevel) && stream ? stream : undefined,
              capacity: capacity ? Number(capacity) : undefined,
            },
            event.currentTarget,
          );
        }}
        className="flex flex-col gap-4 border border-ink-100 p-5"
      >
        <h3 className="font-display text-[1.0625rem]">Class</h3>
        <div className="grid gap-4 sm:grid-cols-4">
          <SelectField
            label="Level"
            name="level"
            required
            value={level}
            onChange={(event) => setLevel(event.target.value)}
            error={fields.level}
          >
            {CLASS_LEVELS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </SelectField>

          {isSeniorLevel(level) ? (
            <SelectField label="Pathway" name="stream" required error={fields.stream}>
              {STREAMS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </SelectField>
          ) : null}

          <TextField
            label="Arm"
            name="arm"
            defaultValue="A"
            maxLength={1}
            required
            error={fields.arm}
            hint="A single capital letter."
          />
          <TextField
            label="Capacity"
            name="capacity"
            type="number"
            min={1}
            max={200}
            error={fields.capacity}
            hint="Optional."
          />
        </div>
        <div>
          <Button type="submit" size="sm" loading={pending === 'class'} loadingLabel="Creating">
            Create class
          </Button>
        </div>
      </form>

      {/* Subject ------------------------------------------------------------- */}
      <form
        onSubmit={(event) => {
          event.preventDefault();
          const form = new FormData(event.currentTarget);
          void submit(
            'subject',
            {
              name: String(form.get('name') ?? ''),
              code: String(form.get('code') ?? '').toUpperCase(),
              department: String(form.get('department') ?? 'General'),
            },
            event.currentTarget,
          );
        }}
        className="flex flex-col gap-4 border border-ink-100 p-5"
      >
        <h3 className="font-display text-[1.0625rem]">Subject</h3>
        <div className="grid gap-4 sm:grid-cols-3">
          <TextField label="Name" name="name" required placeholder="Mathematics" error={fields.name} />
          <TextField label="Code" name="code" required placeholder="MTH" maxLength={16} error={fields.code} />
          <SelectField label="Department" name="department" defaultValue="General" error={fields.department}>
            <option value="General">General</option>
            <option value="Science">Science</option>
            <option value="Art">Art</option>
            <option value="Commercial">Commercial</option>
          </SelectField>
        </div>
        <div>
          <Button type="submit" size="sm" loading={pending === 'subject'} loadingLabel="Creating">
            Create subject
          </Button>
        </div>
      </form>
    </div>
  );
}
