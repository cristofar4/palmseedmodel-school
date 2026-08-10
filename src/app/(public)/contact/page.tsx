import type { Metadata } from 'next';
import { PHOTOGRAPHY } from '@/lib/media';
import { PageHeader } from '@/components/public/PageHeader';
import { ContactForm } from '@/components/public/ContactForm';
import { csrfToken } from '@/lib/security/csrf';
import { SCHOOL } from '@/lib/school';

export const metadata: Metadata = {
  title: 'Contact',
  description: 'Contact the Palmseed Model School office.',
};

export const dynamic = 'force-dynamic';

export default async function ContactPage() {
  const token = await csrfToken();

  return (
    <>
      <PageHeader
        eyebrow="Contact"
        title="Speak to the school office."
        standfirst="Send a message and a member of staff will reply by email. You will receive an acknowledgement straight away."
              photo={PHOTOGRAPHY.schoolLife}
      />

      <section className="bg-warm py-20 lg:py-28">
        <div className="shell grid gap-14 lg:grid-cols-[0.7fr_1fr] lg:gap-20">
          <div data-vortex-item>
            <h2 className="font-display text-[1.35rem]">Ways to reach us</h2>

            <dl className="mt-8 divide-y divide-ink-100 border-y border-ink-100">
              <div className="py-5">
                <dt className="text-[0.6875rem] font-semibold uppercase tracking-[0.14em] text-ink-400">
                  Email
                </dt>
                <dd className="mt-2 text-[0.9375rem]">
                  <a
                    href={`mailto:${SCHOOL.replyEmail}`}
                    className="text-ink underline underline-offset-4 hover:text-brand"
                  >
                    {SCHOOL.replyEmail}
                  </a>
                </dd>
              </div>

              {/* Address and telephone appear here once the school supplies
                  them. They are not guessed at in the meantime. */}
              {SCHOOL.streetAddress ? (
                <div className="py-5">
                  <dt className="text-[0.6875rem] font-semibold uppercase tracking-[0.14em] text-ink-400">
                    Address
                  </dt>
                  <dd className="mt-2 text-[0.9375rem] text-ink-700">{SCHOOL.streetAddress}</dd>
                </div>
              ) : null}

              {SCHOOL.phone ? (
                <div className="py-5">
                  <dt className="text-[0.6875rem] font-semibold uppercase tracking-[0.14em] text-ink-400">
                    Telephone
                  </dt>
                  <dd className="mt-2 text-[0.9375rem] text-ink-700">{SCHOOL.phone}</dd>
                </div>
              ) : null}

              <div className="py-5">
                <dt className="text-[0.6875rem] font-semibold uppercase tracking-[0.14em] text-ink-400">
                  Office hours
                </dt>
                <dd className="mt-2 text-[0.9375rem] text-ink-700">
                  Messages are read on school days. All times are Lagos time.
                </dd>
              </div>
            </dl>

            <p className="mt-8 max-w-[46ch] text-[0.875rem] leading-relaxed text-ink-500">
              For anything about an existing registration, please sign in to the portal first. The
              status is shown there and it is always current.
            </p>
          </div>

          <div data-vortex-item className="border border-ink-100 bg-white p-7 sm:p-9">
            <ContactForm csrfToken={token} />
          </div>
        </div>
      </section>
    </>
  );
}
