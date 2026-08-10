import type { Metadata } from 'next';
import Link from 'next/link';
import { PageHeader } from '@/components/public/PageHeader';
import { SectionHeading } from '@/components/ui/Layout';
import { Photo } from '@/components/media/Photo';
import { PHOTOGRAPHY } from '@/lib/media';
import { CLASS_LEVELS, SCHOOL } from '@/lib/school';

export const metadata: Metadata = {
  title: 'Admissions',
  description:
    'How to register for a place at Palmseed Model School, what the school asks for, and what happens after a registration is submitted.',
};

const STEPS = [
  {
    title: 'Create an account',
    body: 'Give the student name, an email address, a phone number and a password. A confirmation link is sent to the address you enter.',
  },
  {
    title: 'Complete the admission details',
    body: 'Date of birth, the class being applied for, the previous school if there is one, and a parent or guardian contact. A senior applicant also chooses a pathway.',
  },
  {
    title: 'Give consent and accept the terms',
    body: 'A parent or guardian must consent to the school holding the details, and the portal terms must be accepted before the form can be submitted.',
  },
  {
    title: 'The school reviews',
    body: 'The registration appears in the school office immediately. The account is open in the meantime with the status Pending Review, and shows what was submitted.',
  },
  {
    title: 'A decision is sent',
    body: 'You and the guardian are emailed either way. On approval an admission number, class and session are issued and the full portal opens.',
  },
] as const;

export default function AdmissionsPage() {
  return (
    <>
      <PageHeader
        eyebrow="Admissions"
        title="Registering at Palmseed."
        standfirst="Registration is online and takes about two minutes to start. Nothing is decided automatically. Every registration is read by the school office."
      />

      <section className="bg-warm py-20 lg:py-28">
        <div className="shell grid gap-16 lg:grid-cols-[1fr_0.8fr] lg:gap-20">
          <div>
            <SectionHeading eyebrow="The process" title="Five steps, in order." className="mb-12" />

            <ol className="divide-y divide-ink-100 border-y border-ink-100">
              {STEPS.map((step, index) => (
                <li key={step.title} data-vortex-item className="flex gap-6 py-7">
                  <span className="w-8 shrink-0 font-display text-[0.875rem] text-brand">
                    {String(index + 1).padStart(2, '0')}
                  </span>
                  <div>
                    <h3 className="text-[1.125rem] leading-snug">{step.title}</h3>
                    <p className="mt-2.5 text-[0.9375rem] leading-[1.75] text-ink-600">
                      {step.body}
                    </p>
                  </div>
                </li>
              ))}
            </ol>

            <div className="mt-12 flex flex-wrap gap-4">
              <Link
                href="/signup"
                className="bg-brand px-7 py-4 text-[0.9375rem] font-medium text-white transition-colors hover:bg-brand-deep"
              >
                Begin a registration
              </Link>
              <Link
                href="/contact"
                className="border border-ink px-7 py-4 text-[0.9375rem] font-medium text-ink transition-colors hover:bg-ink hover:text-warm"
              >
                Ask a question first
              </Link>
            </div>
          </div>

          <aside className="flex flex-col gap-8">
            <div data-vortex-item className="relative aspect-[4/5] overflow-hidden bg-ink">
              <Photo photo={PHOTOGRAPHY.admissions} sizes="(max-width: 1024px) 100vw, 40vw" />
            </div>

            <div data-vortex-item className="border border-ink-100 bg-white p-7">
              <h2 className="font-display text-[1.125rem]">Classes open to registration</h2>
              <ul className="mt-5 flex flex-wrap gap-2">
                {CLASS_LEVELS.map((level) => (
                  <li
                    key={level}
                    className="border border-ink-200 px-3 py-1.5 text-[0.8125rem] font-medium text-ink-700"
                  >
                    {level}
                  </li>
                ))}
              </ul>
              <p className="mt-6 text-[0.875rem] leading-relaxed text-ink-500">
                A place in a specific class depends on availability and on the review. Registering
                does not reserve a place.
              </p>
            </div>
          </aside>
        </div>
      </section>

      <section className="border-t border-ink-100 bg-white py-20 lg:py-24">
        <div className="shell">
          <SectionHeading eyebrow="Questions" title="Things families ask." className="mb-14" />

          <dl className="grid gap-px border border-ink-100 bg-ink-100 md:grid-cols-2">
            {[
              {
                q: 'Does creating an account enrol my child',
                a: 'No. It starts a registration. The account status stays as Pending Review until the school approves it, and the enrolled student record only opens after that.',
              },
              {
                q: 'What can we see while we wait',
                a: 'You can sign in and see everything that was submitted, the registration status and any school announcements. Private student records are not shown until a place is offered.',
              },
              {
                q: 'My child is already a Palmseed student',
                a: 'Enrolled students do not register here. The school creates the account and sends an activation email to set a password.',
              },
              {
                q: 'Can we sign in with an admission number',
                a: 'Yes. Once a place is offered and an admission number is issued, it can be used in place of the email address.',
              },
              {
                q: 'What are the fees',
                a: 'Fee information is published in the portal for enrolled students. For current figures, contact the school office.',
              },
              {
                q: 'How long does a review take',
                a: 'The school office reads registrations as they arrive. You are emailed as soon as a decision is made, and the status in the portal changes at the same time.',
              },
            ].map((item) => (
              <div key={item.q} data-vortex-item className="bg-white p-8">
                <dt className="text-[1.0625rem] leading-snug">{item.q}</dt>
                <dd className="mt-3 text-[0.9375rem] leading-[1.75] text-ink-500">{item.a}</dd>
              </div>
            ))}
          </dl>

          <p className="mt-10 text-[0.9375rem] text-ink-500">
            Anything else, write to{' '}
            <a
              href={`mailto:${SCHOOL.replyEmail}`}
              className="text-brand underline underline-offset-4"
            >
              {SCHOOL.replyEmail}
            </a>
            .
          </p>
        </div>
      </section>
    </>
  );
}
