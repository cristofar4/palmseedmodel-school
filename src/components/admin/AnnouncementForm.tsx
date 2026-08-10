'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { CheckboxField, SelectField, TextAreaField, TextField } from '@/components/ui/Field';
import { Alert } from '@/components/ui/Feedback';
import { postJson } from '@/lib/client/request';
import type { ClassOption } from '@/lib/data/admin';

export function AnnouncementForm({
  csrfToken,
  classes,
}: {
  csrfToken: string;
  classes: ClassOption[];
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);
  const [fields, setFields] = useState<Record<string, string>>({});
  const [audience, setAudience] = useState('public');

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;

    setPending(true);
    setError(null);
    setDone(null);
    setFields({});

    const formElement = event.currentTarget;
    const form = new FormData(formElement);

    const outcome = await postJson<{ message: string }>(
      '/api/admin/announcements',
      {
        title: String(form.get('title') ?? ''),
        body: String(form.get('body') ?? ''),
        audience,
        classId: audience === 'class' ? String(form.get('classId') ?? '') : '',
        publish: form.get('publish') === 'on',
        isPinned: form.get('isPinned') === 'on',
      },
      csrfToken,
    );

    setPending(false);

    if (!outcome.ok) {
      setError(outcome.error ?? 'We could not save that.');
      setFields(outcome.fields ?? {});
      return;
    }

    setDone(outcome.data?.message ?? 'Saved.');
    formElement.reset();
    setAudience('public');
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-5">
      {error ? <Alert tone="error">{error}</Alert> : null}
      {done ? <Alert tone="success">{done}</Alert> : null}

      <TextField label="Title" name="title" required error={fields.title} />

      <TextAreaField
        label="Announcement"
        name="body"
        rows={6}
        required
        error={fields.body}
        hint="Leave a blank line between paragraphs."
      />

      <div className="grid gap-5 sm:grid-cols-2">
        <SelectField
          label="Audience"
          name="audience"
          value={audience}
          onChange={(event) => setAudience(event.target.value)}
          error={fields.audience}
          hint="Public notices also appear on the website."
        >
          <option value="public">Public, website and portal</option>
          <option value="students">Students</option>
          <option value="guardians">Guardians</option>
          <option value="teachers">Teachers</option>
          <option value="class">One class</option>
        </SelectField>

        {audience === 'class' ? (
          <SelectField label="Class" name="classId" required error={fields.classId}>
            {classes.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
          </SelectField>
        ) : null}
      </div>

      <div className="flex flex-col gap-3">
        <CheckboxField name="publish" defaultChecked label="Publish immediately" />
        <CheckboxField name="isPinned" label="Pin to the top of the notice board" />
      </div>

      <div>
        <Button type="submit" loading={pending} loadingLabel="Saving">
          Save announcement
        </Button>
      </div>
    </form>
  );
}
