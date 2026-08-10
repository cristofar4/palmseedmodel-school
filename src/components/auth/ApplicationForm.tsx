'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { CheckboxField, SelectField, TextAreaField, TextField } from '@/components/ui/Field';
import { Alert } from '@/components/ui/Feedback';
import { postJson } from '@/lib/client/request';
import { CLASS_LEVELS, STREAMS, isSeniorLevel } from '@/lib/school';

/**
 * Step two of registration: the admission details, guardian and consent.
 */
export function ApplicationForm({ csrfToken }: { csrfToken: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fields, setFields] = useState<Record<string, string>>({});
  // Drives whether the pathway selector is shown, since it applies to the
  // senior school only.
  const [level, setLevel] = useState<string>('JSS 1');

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;

    setPending(true);
    setError(null);
    setFields({});

    const form = new FormData(event.currentTarget);
    const classApplyingFor = String(form.get('classApplyingFor') ?? '');
    const stream = String(form.get('streamPreference') ?? '');

    const outcome = await postJson<{ next: string }>(
      '/api/auth/application',
      {
        dateOfBirth: String(form.get('dateOfBirth') ?? ''),
        gender: String(form.get('gender') ?? '') || undefined,
        classApplyingFor,
        streamPreference: isSeniorLevel(classApplyingFor) && stream ? stream : undefined,
        previousSchool: String(form.get('previousSchool') ?? ''),
        homeAddress: String(form.get('homeAddress') ?? ''),
        guardianName: String(form.get('guardianName') ?? ''),
        guardianEmail: String(form.get('guardianEmail') ?? ''),
        guardianPhone: String(form.get('guardianPhone') ?? ''),
        guardianRelationship: String(form.get('guardianRelationship') ?? 'Guardian'),
        guardianConsent: form.get('guardianConsent') === 'on',
        acceptTerms: form.get('acceptTerms') === 'on',
      },
      csrfToken,
    );

    if (!outcome.ok) {
      setError(outcome.error ?? 'We could not submit the registration.');
      setFields(outcome.fields ?? {});
      setPending(false);
      return;
    }

    router.push(outcome.data?.next ?? '/dashboard');
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-8">
      {error ? <Alert tone="error">{error}</Alert> : null}

      <fieldset className="flex flex-col gap-5 border-0 p-0">
        <legend className="eyebrow mb-2">Student details</legend>

        <div className="grid gap-5 sm:grid-cols-2">
          <TextField
            label="Date of birth"
            name="dateOfBirth"
            type="date"
            required
            tone="light"
            error={fields.dateOfBirth}
          />
          <SelectField label="Gender" name="gender" tone="light" error={fields.gender}>
            <option value="">Prefer not to say</option>
            <option value="Female">Female</option>
            <option value="Male">Male</option>
          </SelectField>
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <SelectField
            label="Class applying for"
            name="classApplyingFor"
            required
            tone="light"
            error={fields.classApplyingFor}
            value={level}
            onChange={(event) => setLevel(event.target.value)}
          >
            {CLASS_LEVELS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </SelectField>

          {isSeniorLevel(level) ? (
            <SelectField
              label="Pathway"
              name="streamPreference"
              required
              tone="light"
              error={fields.streamPreference}
              hint="Senior students choose one pathway."
            >
              {STREAMS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </SelectField>
          ) : null}
        </div>

        <TextField
          label="Previous school"
          name="previousSchool"
          tone="light"
          error={fields.previousSchool}
          hint="Leave this empty if the student is not coming from another school."
        />

        <TextAreaField
          label="Home address"
          name="homeAddress"
          rows={3}
          tone="light"
          error={fields.homeAddress}
        />
      </fieldset>

      <fieldset className="flex flex-col gap-5 border-0 p-0">
        <legend className="eyebrow mb-2">Parent or guardian</legend>

        <div className="grid gap-5 sm:grid-cols-2">
          <TextField
            label="Guardian full name"
            name="guardianName"
            autoComplete="name"
            required
            tone="light"
            error={fields.guardianName}
          />
          <SelectField
            label="Relationship"
            name="guardianRelationship"
            required
            tone="light"
            error={fields.guardianRelationship}
            defaultValue="Guardian"
          >
            <option value="Mother">Mother</option>
            <option value="Father">Father</option>
            <option value="Guardian">Guardian</option>
          </SelectField>
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <TextField
            label="Guardian email address"
            name="guardianEmail"
            type="email"
            inputMode="email"
            required
            tone="light"
            error={fields.guardianEmail}
            hint="Approval letters and school notices also go here."
          />
          <TextField
            label="Guardian phone number"
            name="guardianPhone"
            type="tel"
            inputMode="tel"
            required
            tone="light"
            error={fields.guardianPhone}
            placeholder="08012345678"
          />
        </div>
      </fieldset>

      <fieldset className="flex flex-col gap-4 border-0 p-0">
        <legend className="eyebrow mb-2">Consent</legend>

        <CheckboxField
          name="guardianConsent"
          error={fields.guardianConsent}
          label="I am the parent or guardian, or I have their permission, and I consent to Palmseed Model School holding these details for the purpose of admission."
        />

        <CheckboxField
          name="acceptTerms"
          error={fields.acceptTerms}
          label={
            <>
              I accept the{' '}
              <Link href="/portal-terms" target="_blank" className="text-palm-red underline underline-offset-2">
                portal terms
              </Link>{' '}
              and the{' '}
              <Link href="/privacy" target="_blank" className="text-palm-red underline underline-offset-2">
                privacy policy
              </Link>
              .
            </>
          }
        />
      </fieldset>

      <div className="flex flex-col gap-3">
        <Button type="submit" size="lg" loading={pending} loadingLabel="Submitting registration">
          Submit registration
        </Button>
        <p className="text-xs leading-relaxed text-ink-400">
          The school reviews every registration. You can sign in and check the status at any time.
        </p>
      </div>
    </form>
  );
}
