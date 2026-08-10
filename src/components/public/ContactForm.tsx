'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { TextAreaField, TextField } from '@/components/ui/Field';
import { Alert } from '@/components/ui/Feedback';
import { postJson } from '@/lib/client/request';

export function ContactForm({ csrfToken }: { csrfToken: string }) {
  const [pending, setPending] = useState(false);
  const [sent, setSent] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [fields, setFields] = useState<Record<string, string>>({});

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;

    setPending(true);
    setError(null);
    setFields({});

    const formElement = event.currentTarget;
    const form = new FormData(formElement);

    const outcome = await postJson<{ message: string }>(
      '/api/contact',
      {
        name: String(form.get('name') ?? ''),
        email: String(form.get('email') ?? ''),
        phone: String(form.get('phone') ?? ''),
        subject: String(form.get('subject') ?? ''),
        message: String(form.get('message') ?? ''),
        website: String(form.get('website') ?? ''),
      },
      csrfToken,
    );

    setPending(false);

    if (!outcome.ok) {
      setError(outcome.error ?? 'We could not send your message.');
      setFields(outcome.fields ?? {});
      return;
    }

    setSent(outcome.data?.message ?? 'Thank you. Your message has reached the school office.');
    formElement.reset();
  }

  if (sent) {
    return (
      <Alert tone="success" title="Message sent">
        {sent}
      </Alert>
    );
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-5">
      {error ? <Alert tone="error">{error}</Alert> : null}

      <div className="grid gap-5 sm:grid-cols-2">
        <TextField label="Your name" name="name" autoComplete="name" required error={fields.name} />
        <TextField
          label="Email address"
          name="email"
          type="email"
          inputMode="email"
          autoComplete="email"
          required
          error={fields.email}
        />
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <TextField
          label="Phone number"
          name="phone"
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          error={fields.phone}
          hint="Optional."
        />
        <TextField label="Subject" name="subject" required error={fields.subject} />
      </div>

      <TextAreaField
        label="Message"
        name="message"
        rows={6}
        required
        error={fields.message}
        placeholder="Tell us how we can help."
      />

      {/* Left empty by people, filled in by simple bots. */}
      <div aria-hidden="true" className="absolute h-0 w-0 overflow-hidden opacity-0">
        <label htmlFor="contact-website">Do not fill this in</label>
        <input id="contact-website" name="website" type="text" tabIndex={-1} autoComplete="off" />
      </div>

      <div>
        <Button type="submit" size="lg" loading={pending} loadingLabel="Sending your message">
          Send message
        </Button>
      </div>
    </form>
  );
}
