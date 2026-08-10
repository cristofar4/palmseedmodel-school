import Link from 'next/link';
import { HeroContent } from '@/components/public/Hero';
import { ContactForm } from '@/components/public/ContactForm';
import { Photo } from '@/components/media/Photo';
import { SectionHeading } from '@/components/ui/Layout';
import { EmptyState } from '@/components/ui/Feedback';
import { PHOTOGRAPHY } from '@/lib/media';
import { publicAnnouncements } from '@/lib/data/public';
import { csrfToken } from '@/lib/security/csrf';
import { formatDate } from '@/lib/format';
import { JUNIOR_LEVELS, SENIOR_LEVELS } from '@/lib/school';

export const dynamic = 'force-dynamic';

const VALUES = [
  {
    title: 'Useful knowledge',
    body: 'Every subject is taught so that a student can do something with it. Understanding first, then fluency, then application.',
  },
  {
    title: 'Clear standards',
    body: 'Students know what is expected, how they are assessed and where they stand. Nothing about a grade should be a surprise.',
  },
  {
    title: 'Steady character',
    body: 'Punctuality, honesty and respect are taught with the same seriousness as any examination subject.',
  },
  {
    title: 'Families informed',
    body: 'Guardians receive results, attendance and notices through the portal, not through rumour or a lost letter.',
  },
] as const;

export default async function HomePage() {
  const [announcements, token] = await Promise.all([publicAnnouncements(4), csrfToken()]);

  return (
    <>
      {/* 1. Cinematic hero ------------------------------------------------ */}
      <section className="relative isolate min-h-[92svh] overflow-hidden bg-ink grain">
        <Photo photo={PHOTOGRAPHY.hero} priority sizes="100vw" />

        {/* Controlled darkening. Two layers so the type stays legible at the
            top left without flattening the whole photograph. */}
        <div
          aria-hidden="true"
          className="absolute inset-0"
          style={{
            background:
              'linear-gradient(102deg, rgba(10,20,16,0.94) 0%, rgba(10,20,16,0.78) 38%, rgba(10,20,16,0.34) 68%, rgba(10,20,16,0.55) 100%)',
          }}
        />
        <div
          aria-hidden="true"
          className="absolute inset-x-0 bottom-0 h-56"
          style={{ background: 'linear-gradient(to top, #0A1410 0%, transparent 100%)' }}
        />

        <div className="relative flex min-h-[92svh] items-center">
          <HeroContent />
        </div>
      </section>

      {/* 2. Introduction --------------------------------------------------- */}
      <section id="introduction" className="scroll-mt-24 bg-warm py-24 lg:py-32">
        <div className="shell grid gap-14 lg:grid-cols-[0.85fr_1fr] lg:gap-20">
          <div data-vortex-item>
            <p className="eyebrow mb-5">The school</p>
            <h2 className="text-[clamp(1.9rem,4.4vw,3.1rem)] leading-[1.08] tracking-[-0.02em]">
              Palmseed Model School
            </h2>
            <p className="mt-5 font-display text-[1.35rem] italic text-brand">Always Useful</p>
          </div>

          <div data-vortex-item className="max-w-[58ch]">
            <p className="text-[1.0625rem] leading-[1.8] text-ink-700">
              Palmseed Model School is a secondary school in Nigeria. We follow the national
              curriculum through Junior Secondary and Senior Secondary, and we prepare students for
              the examinations that decide what comes next.
            </p>
            <p className="mt-6 text-[1.0625rem] leading-[1.8] text-ink-600">
              The motto is not decoration. It is the test we apply to a lesson, a rule and a report.
              If a thing does not help a student become more capable, it does not belong in the
              school day.
            </p>
            <p className="mt-6 text-[1.0625rem] leading-[1.8] text-ink-600">
              This website and the portal behind it exist so that a family can see the same record
              the school sees. Results, attendance and notices arrive in one place, on time.
            </p>

            <div className="mt-10 flex flex-wrap gap-4">
              <Link
                href="/about"
                className="border border-ink px-6 py-3.5 text-sm font-medium text-ink transition-colors hover:bg-ink hover:text-warm"
              >
                More about Palmseed
              </Link>
              <Link
                href="/academics"
                className="px-6 py-3.5 text-sm font-medium text-ink underline underline-offset-4 transition-colors hover:text-brand"
              >
                See the academic programme
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* 3. Values --------------------------------------------------------- */}
      <section className="border-y border-ink-100 bg-white py-24 lg:py-28">
        <div className="shell">
          <SectionHeading
            eyebrow="What we hold to"
            title="Four commitments that shape the school day."
            className="mb-16"
          />

          <ul className="grid gap-px border border-ink-100 bg-ink-100 sm:grid-cols-2 lg:grid-cols-4">
            {VALUES.map((value, index) => (
              <li key={value.title} data-vortex-item className="bg-white p-8">
                <span className="font-display text-[0.8125rem] text-brand">
                  {String(index + 1).padStart(2, '0')}
                </span>
                <h3 className="mt-5 text-[1.1875rem] leading-snug">{value.title}</h3>
                <p className="mt-3 text-[0.9375rem] leading-[1.7] text-ink-500">{value.body}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* 4. Junior Secondary ----------------------------------------------- */}
      <section className="bg-warm py-24 lg:py-32">
        <div className="shell grid items-center gap-14 lg:grid-cols-2 lg:gap-20">
          <div data-vortex-item className="relative aspect-[4/3] overflow-hidden bg-ink">
            <Photo photo={PHOTOGRAPHY.junior} sizes="(max-width: 1024px) 100vw, 50vw" />
          </div>

          <div data-vortex-item>
            <p className="eyebrow mb-5">Junior Secondary</p>
            <h2 className="text-[clamp(1.75rem,3.6vw,2.6rem)] leading-[1.12]">
              JSS 1 to JSS 3, where the habits are set.
            </h2>
            <p className="mt-6 text-[1.0625rem] leading-[1.8] text-ink-600">
              The junior school builds the foundation the senior years depend on. Students take the
              full basic education curriculum, and the emphasis is on reading closely, writing
              clearly and reasoning in numbers.
            </p>
            <p className="mt-5 text-[1.0625rem] leading-[1.8] text-ink-600">
              Junior Secondary ends with the Basic Education Certificate Examination, which also
              informs the pathway a student takes into the senior school.
            </p>

            <ul className="mt-9 flex flex-wrap gap-2.5">
              {JUNIOR_LEVELS.map((level) => (
                <li
                  key={level}
                  className="border border-ink-200 px-4 py-2 text-[0.8125rem] font-medium tracking-wide text-ink-700"
                >
                  {level}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* 5. Senior Secondary ----------------------------------------------- */}
      <section className="bg-ink py-24 text-warm lg:py-32">
        <div className="shell grid items-center gap-14 lg:grid-cols-2 lg:gap-20">
          <div data-vortex-item className="order-2 lg:order-1">
            <p className="eyebrow mb-5">Senior Secondary</p>
            <h2 className="text-[clamp(1.75rem,3.6vw,2.6rem)] leading-[1.12] text-warm">
              SS 1 to SS 3, and a pathway that fits.
            </h2>
            <p className="mt-6 text-[1.0625rem] leading-[1.8] text-warm/65">
              Senior students choose one of three pathways. The choice is made with the school after
              looking at junior results, aptitude and what the student intends to study next.
            </p>

            <dl className="mt-10 divide-y divide-white/10 border-y border-white/10">
              {[
                {
                  name: 'Science',
                  body: 'For medicine, engineering, computing and the physical and life sciences.',
                },
                {
                  name: 'Art',
                  body: 'For law, languages, the humanities, media and the social sciences.',
                },
                {
                  name: 'Commercial',
                  body: 'For accounting, economics, business administration and commerce.',
                },
              ].map((pathway) => (
                <div key={pathway.name} className="flex flex-wrap gap-x-8 gap-y-2 py-5">
                  <dt className="w-28 shrink-0 font-display text-[1.0625rem] text-gold">
                    {pathway.name}
                  </dt>
                  <dd className="flex-1 text-[0.9375rem] leading-[1.7] text-warm/60">
                    {pathway.body}
                  </dd>
                </div>
              ))}
            </dl>

            <ul className="mt-9 flex flex-wrap gap-2.5">
              {SENIOR_LEVELS.map((level) => (
                <li
                  key={level}
                  className="border border-white/20 px-4 py-2 text-[0.8125rem] font-medium tracking-wide text-warm/80"
                >
                  {level}
                </li>
              ))}
            </ul>
          </div>

          <div
            data-vortex-item
            className="relative order-1 aspect-[4/3] overflow-hidden bg-ink-800 lg:order-2"
          >
            <Photo photo={PHOTOGRAPHY.senior} sizes="(max-width: 1024px) 100vw, 50vw" />
          </div>
        </div>
      </section>

      {/* 6. Digital learning ------------------------------------------------ */}
      <section className="bg-white py-24 lg:py-32">
        <div className="shell">
          <SectionHeading
            eyebrow="Digital learning"
            title="Technology where it earns its place."
            standfirst="Screens are a tool, not a timetable. Palmseed uses them for the things they genuinely do better than paper."
            className="mb-16"
          />

          <div className="grid gap-14 lg:grid-cols-[1fr_0.9fr] lg:gap-20">
            <ul className="grid gap-px self-start border border-ink-100 bg-ink-100">
              {[
                {
                  title: 'Records that reach home the same day',
                  body: 'Scores, attendance and remarks are entered by teachers and published by the school. Guardians are notified.',
                },
                {
                  title: 'Coursework that does not get lost',
                  body: 'Assignments are set, submitted and returned in the portal, with the deadline visible to everyone.',
                },
                {
                  title: 'Computer studies as a subject',
                  body: 'Students learn to use a computer properly, from keyboard fluency to spreadsheets and safe conduct online.',
                },
              ].map((item) => (
                <li key={item.title} data-vortex-item className="bg-white p-8">
                  <h3 className="text-[1.125rem] leading-snug">{item.title}</h3>
                  <p className="mt-3 text-[0.9375rem] leading-[1.7] text-ink-500">{item.body}</p>
                </li>
              ))}
            </ul>

            <div data-vortex-item className="relative aspect-[4/5] overflow-hidden bg-ink">
              <Photo photo={PHOTOGRAPHY.digital} sizes="(max-width: 1024px) 100vw, 45vw" />
            </div>
          </div>
        </div>
      </section>

      {/* 7. School life ------------------------------------------------------ */}
      <section className="relative isolate overflow-hidden bg-ink py-28 text-warm lg:py-36">
        <Photo photo={PHOTOGRAPHY.schoolLife} sizes="100vw" className="opacity-30" />
        <div
          aria-hidden="true"
          className="absolute inset-0"
          style={{
            background:
              'linear-gradient(96deg, rgba(10,20,16,0.95) 0%, rgba(10,20,16,0.8) 45%, rgba(10,20,16,0.62) 100%)',
          }}
        />

        <div className="relative shell">
          <div data-vortex-item className="max-w-2xl">
            <p className="eyebrow mb-5">School life</p>
            <h2 className="text-[clamp(1.9rem,4.2vw,2.9rem)] leading-[1.1] text-warm">
              A school day has more in it than lessons.
            </h2>
            <p className="mt-6 text-[1.0625rem] leading-[1.8] text-warm/65">
              Assembly, clubs, sport, debate and service run alongside the timetable. They are where
              students learn to speak in front of others, to lose well, to organise something and to
              finish what they started.
            </p>
          </div>

          <ul className="mt-14 grid gap-px border border-white/10 bg-white/10 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { title: 'Assembly', body: 'The day opens together, with notices, standards and recognition.' },
              { title: 'Clubs and societies', body: 'Debate, press, science, literary and cultural groups.' },
              { title: 'Sport', body: 'Inter house competition and regular physical education.' },
              { title: 'Service', body: 'Responsibilities that keep the school running and teach ownership.' },
            ].map((item) => (
              <li key={item.title} data-vortex-item className="bg-ink p-8">
                <h3 className="text-[1.0625rem] text-warm">{item.title}</h3>
                <p className="mt-3 text-[0.875rem] leading-[1.7] text-warm/55">{item.body}</p>
              </li>
            ))}
          </ul>

          <div className="mt-12">
            <Link
              href="/school-life"
              className="border border-warm/30 px-7 py-3.5 text-sm font-medium text-warm transition-colors hover:border-warm hover:bg-warm hover:text-ink"
            >
              More on school life
            </Link>
          </div>
        </div>
      </section>

      {/* 8. Admissions ------------------------------------------------------- */}
      <section className="bg-warm py-24 lg:py-32">
        <div className="shell grid items-center gap-14 lg:grid-cols-[1fr_0.85fr] lg:gap-20">
          <div data-vortex-item>
            <p className="eyebrow mb-5">Admissions</p>
            <h2 className="text-[clamp(1.85rem,4vw,2.8rem)] leading-[1.1]">
              Registration is open for {JUNIOR_LEVELS.join(', ')} and {SENIOR_LEVELS.join(', ')}.
            </h2>
            <p className="mt-6 max-w-[54ch] text-[1.0625rem] leading-[1.8] text-ink-600">
              Start by creating an account. You will be asked for the student details, the class you
              are applying for and a parent or guardian contact. The school reviews every
              registration and replies by email.
            </p>

            <ol className="mt-10 divide-y divide-ink-100 border-y border-ink-100">
              {[
                'Create an account and confirm your email address.',
                'Complete the admission details and give guardian consent.',
                'The school reviews the registration.',
                'On approval, an admission number and class are issued and the full portal opens.',
              ].map((step, index) => (
                <li key={step} className="flex gap-5 py-4">
                  <span className="font-display text-[0.8125rem] text-brand">
                    {String(index + 1).padStart(2, '0')}
                  </span>
                  <span className="text-[0.9375rem] leading-[1.7] text-ink-700">{step}</span>
                </li>
              ))}
            </ol>

            <div className="mt-10 flex flex-wrap gap-4">
              <Link
                href="/signup"
                className="bg-brand px-7 py-4 text-[0.9375rem] font-medium text-white transition-colors hover:bg-brand-deep"
              >
                Begin a registration
              </Link>
              <Link
                href="/admissions"
                className="border border-ink px-7 py-4 text-[0.9375rem] font-medium text-ink transition-colors hover:bg-ink hover:text-warm"
              >
                Read the admissions guide
              </Link>
            </div>
          </div>

          <div data-vortex-item className="relative aspect-[3/4] overflow-hidden bg-ink">
            <Photo photo={PHOTOGRAPHY.admissions} sizes="(max-width: 1024px) 100vw, 42vw" />
          </div>
        </div>
      </section>

      {/* 9. Announcements ----------------------------------------------------- */}
      <section className="border-t border-ink-100 bg-white py-24 lg:py-28">
        <div className="shell">
          <div className="mb-14 flex flex-wrap items-end justify-between gap-6">
            <SectionHeading eyebrow="Notice board" title="News and announcements" />
            <Link
              href="/news"
              className="text-sm font-medium text-ink underline underline-offset-4 transition-colors hover:text-brand"
            >
              All announcements
            </Link>
          </div>

          {announcements.length === 0 ? (
            <EmptyState
              title="No announcements have been published yet."
              description="When the school publishes a notice it appears here and in the portal. Registered families are emailed at the same time."
            />
          ) : (
            <ul className="grid gap-px border border-ink-100 bg-ink-100 md:grid-cols-2">
              {announcements.map((item) => (
                <li key={item.id} data-vortex-item className="bg-white p-8">
                  <div className="flex items-center gap-3">
                    <time
                      dateTime={new Date(item.published_at).toISOString()}
                      className="text-[0.6875rem] font-semibold uppercase tracking-[0.14em] text-ink-400"
                    >
                      {formatDate(item.published_at)}
                    </time>
                    {item.is_pinned ? (
                      <span className="border border-brand/30 px-2 py-0.5 text-[0.625rem] font-semibold uppercase tracking-[0.12em] text-brand">
                        Pinned
                      </span>
                    ) : null}
                  </div>
                  <h3 className="mt-4 text-[1.1875rem] leading-snug">{item.title}</h3>
                  <p className="mt-3 line-clamp-4 text-[0.9375rem] leading-[1.7] text-ink-500">
                    {item.body}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      {/* 10. Contact ---------------------------------------------------------- */}
      <section id="contact" className="scroll-mt-24 bg-warm py-24 lg:py-32">
        <div className="shell grid gap-14 lg:grid-cols-[0.8fr_1fr] lg:gap-20">
          <div data-vortex-item>
            <SectionHeading
              eyebrow="Contact"
              title="Speak to the school office."
              standfirst="Send a message and a member of staff will reply by email. Registration questions, visits and general enquiries are all welcome."
            />
            <p className="mt-8 text-[0.9375rem] leading-relaxed text-ink-500">
              You will receive an acknowledgement immediately, and a reply from the office after
              that.
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
