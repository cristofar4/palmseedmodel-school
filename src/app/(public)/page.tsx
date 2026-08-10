import Link from 'next/link';
import { HeroContent } from '@/components/public/Hero';
import { ContactForm } from '@/components/public/ContactForm';
import { Photo } from '@/components/media/Photo';
import { Plate, Band } from '@/components/media/Plate';
import { SectionHeading } from '@/components/ui/Layout';
import { EmptyState } from '@/components/ui/Feedback';
import { PHOTOGRAPHY } from '@/lib/media';
import { publicAnnouncements } from '@/lib/data/public';
import { csrfToken } from '@/lib/security/csrf';
import { formatDate } from '@/lib/format';
import { JUNIOR_LEVELS, SENIOR_LEVELS, SCHOOL } from '@/lib/school';

export const dynamic = 'force-dynamic';

/* The index under the hero. Editorial signposting, and the fastest route into
   the four things a visitor actually came to find out. */
const INDEX = [
  { number: '01', label: 'The school', href: '#introduction' },
  { number: '02', label: 'Academics', href: '/academics' },
  { number: '03', label: 'School life', href: '/school-life' },
  { number: '04', label: 'Admissions', href: '/admissions' },
] as const;

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

const PATHWAYS = [
  { name: 'Science', body: 'For medicine, engineering, computing and the physical and life sciences.' },
  { name: 'Art', body: 'For law, languages, the humanities, media and the social sciences.' },
  { name: 'Commercial', body: 'For accounting, economics, business administration and commerce.' },
] as const;

export default async function HomePage() {
  const [announcements, token] = await Promise.all([publicAnnouncements(4), csrfToken()]);

  return (
    <>
      {/* 1. Hero. The image runs full height beside the type, not behind it. */}
      <section className="relative isolate grid bg-ink lg:min-h-[92svh] lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1fr)]">
        <div className="order-2 flex items-center lg:order-1">
          <HeroContent />
        </div>

        <div className="relative order-1 min-h-[46svh] overflow-hidden lg:order-2 lg:min-h-full">
          <Photo photo={PHOTOGRAPHY.hero} priority sizes="(max-width: 1024px) 100vw, 55vw" />
          {/* Seats the image against the type column. Only across the seam, so
              the picture itself is left alone. */}
          <div
            aria-hidden="true"
            className="absolute inset-0 hidden lg:block"
            style={{
              background:
                'linear-gradient(to right, #0A1410 0%, rgba(10,20,16,0.2) 30%, transparent 58%)',
            }}
          />
          <div
            aria-hidden="true"
            className="absolute inset-x-0 bottom-0 h-32 lg:hidden"
            style={{ background: 'linear-gradient(to top, #0A1410 0%, transparent 100%)' }}
          />
        </div>
      </section>

      {/* 2. Index strip ---------------------------------------------------- */}
      <nav aria-label="Page sections" className="border-y border-white/10 bg-ink">
        <ol className="shell grid grid-cols-2 lg:grid-cols-4">
          {INDEX.map((item, i) => (
            <li
              key={item.label}
              className={`border-white/10 ${i % 2 === 1 ? '' : 'border-r'} ${
                i < 2 ? 'border-b lg:border-b-0' : ''
              } lg:border-r lg:last:border-r-0`}
            >
              <Link
                href={item.href}
                className="flex items-baseline gap-4 px-1 py-6 transition-colors hover:text-gold lg:px-6"
              >
                <span className="font-display text-[0.75rem] text-gold">{item.number}</span>
                <span className="text-[0.9375rem] text-warm/80">{item.label}</span>
              </Link>
            </li>
          ))}
        </ol>
      </nav>

      {/* 3. Introduction. Light from here on, which is the change. ---------- */}
      <section id="introduction" className="scroll-mt-24 bg-warm py-24 lg:py-36">
        <div className="shell grid gap-12 lg:grid-cols-[15rem_minmax(0,1fr)] lg:gap-24">
          <div data-vortex-item>
            <p className="eyebrow">The school</p>
            <p className="mt-6 font-display text-[1.5rem] italic leading-tight text-brand">
              {SCHOOL.motto}
            </p>
          </div>

          <div data-vortex-item>
            <h2 className="max-w-[20ch] text-[clamp(2rem,4.6vw,3.4rem)] leading-[1.06] tracking-[-0.025em]">
              A secondary school with nothing hidden from the people it serves.
            </h2>

            <div className="mt-12 grid gap-10 sm:grid-cols-2">
              <p className="text-[1.0625rem] leading-[1.8] text-ink-600">
                Palmseed Model School follows the national curriculum through Junior Secondary and
                Senior Secondary, and prepares students for the examinations that decide what comes
                next.
              </p>
              <p className="text-[1.0625rem] leading-[1.8] text-ink-600">
                The motto is not decoration. It is the test we apply to a lesson, a rule and a
                report. If a thing does not help a student become more capable, it does not belong
                in the school day.
              </p>
            </div>

            <div className="mt-12 flex flex-wrap gap-4">
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

      {/* 4. Commitments. A numbered editorial list, not four boxes. --------- */}
      <section className="border-t border-ink-100 bg-pure py-24 lg:py-32">
        <div className="shell">
          <SectionHeading
            eyebrow="What we hold to"
            title="Four commitments that shape the school day."
            className="mb-16"
          />

          <ol className="border-t border-ink-100">
            {VALUES.map((value, index) => (
              <li
                key={value.title}
                data-vortex-item
                className="grid gap-4 border-b border-ink-100 py-8 sm:grid-cols-[5rem_16rem_minmax(0,1fr)] sm:gap-10 lg:py-10"
              >
                <span className="font-display text-[1.75rem] leading-none text-gold-deep">
                  {String(index + 1).padStart(2, '0')}
                </span>
                <h3 className="text-[1.25rem] leading-snug">{value.title}</h3>
                <p className="max-w-[56ch] text-[0.9375rem] leading-[1.8] text-ink-500">
                  {value.body}
                </p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* 5. Junior Secondary. Image half the screen, edge to edge. ---------- */}
      <section className="grid bg-warm lg:grid-cols-2">
        <div data-vortex-item className="relative min-h-[52svh] overflow-hidden bg-ink lg:min-h-[80svh]">
          <Photo photo={PHOTOGRAPHY.junior} sizes="(max-width: 1024px) 100vw, 50vw" />
        </div>

        <div data-vortex-item className="flex items-center px-6 py-20 sm:px-10 lg:px-14 xl:px-20">
          <div className="max-w-[34rem]">
            <p className="eyebrow mb-5">Junior Secondary</p>
            <h2 className="text-[clamp(1.75rem,3.6vw,2.7rem)] leading-[1.1]">
              JSS 1 to JSS 3, where the habits are set.
            </h2>
            <p className="mt-7 text-[1.0625rem] leading-[1.8] text-ink-600">
              The junior school builds the foundation the senior years depend on. Students take the
              full basic education curriculum, and the emphasis is on reading closely, writing
              clearly and reasoning in numbers.
            </p>
            <p className="mt-5 text-[1.0625rem] leading-[1.8] text-ink-600">
              Junior Secondary ends with the Basic Education Certificate Examination, which also
              informs the pathway a student takes into the senior school.
            </p>

            <ul className="mt-10 flex flex-wrap gap-2.5">
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

      {/* 6. Senior Secondary ------------------------------------------------ */}
      <section className="grid bg-ink text-warm lg:grid-cols-2">
        <div
          data-vortex-item
          className="order-2 flex items-center px-6 py-20 sm:px-10 lg:order-1 lg:px-14 xl:px-20"
        >
          <div className="max-w-[34rem]">
            <p className="eyebrow mb-5 text-gold">Senior Secondary</p>
            <h2 className="text-[clamp(1.75rem,3.6vw,2.7rem)] leading-[1.1] text-warm">
              SS 1 to SS 3, and a pathway that fits.
            </h2>
            <p className="mt-7 text-[1.0625rem] leading-[1.8] text-warm/65">
              Senior students choose one of three pathways. The choice is made with the school after
              looking at junior results, aptitude and what the student intends to study next.
            </p>

            <dl className="mt-10 border-t border-white/10">
              {PATHWAYS.map((pathway) => (
                <div
                  key={pathway.name}
                  className="flex flex-wrap gap-x-8 gap-y-2 border-b border-white/10 py-5"
                >
                  <dt className="w-24 shrink-0 font-display text-[1.0625rem] text-gold">
                    {pathway.name}
                  </dt>
                  <dd className="flex-1 text-[0.9375rem] leading-[1.7] text-warm/60">
                    {pathway.body}
                  </dd>
                </div>
              ))}
            </dl>

            <ul className="mt-10 flex flex-wrap gap-2.5">
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
        </div>

        <div
          data-vortex-item
          className="relative order-1 min-h-[52svh] overflow-hidden bg-ink lg:order-2 lg:min-h-[80svh]"
        >
          <Photo photo={PHOTOGRAPHY.senior} sizes="(max-width: 1024px) 100vw, 50vw" />
        </div>
      </section>

      {/* 7. School life. One full bleed band, the image at full strength. --- */}
      <section className="relative">
        <Band photo={PHOTOGRAPHY.schoolLife} sizes="100vw" className="min-h-[78svh]">
          <div className="relative flex min-h-[78svh] items-end">
            <div className="shell pb-16 lg:pb-20">
              <div data-vortex-item className="max-w-2xl">
                <p className="eyebrow mb-5 text-gold">School life</p>
                <h2 className="text-[clamp(1.9rem,4.2vw,3rem)] leading-[1.08] text-warm">
                  A school day has more in it than lessons.
                </h2>
                <p className="mt-6 text-[1.0625rem] leading-[1.8] text-warm/70">
                  Assembly, clubs, sport, debate and service run alongside the timetable. They are
                  where students learn to speak in front of others, to lose well, to organise
                  something and to finish what they started.
                </p>
                <Link
                  href="/school-life"
                  className="mt-9 inline-block border border-warm/30 px-7 py-3.5 text-sm font-medium text-warm transition-colors hover:border-warm hover:bg-warm hover:text-ink"
                >
                  More on school life
                </Link>
              </div>
            </div>
          </div>
        </Band>

        <ul className="grid bg-ink sm:grid-cols-2 lg:grid-cols-4">
          {[
            { title: 'Assembly', body: 'The day opens together, with notices, standards and recognition.' },
            { title: 'Clubs and societies', body: 'Debate, press, science, literary and cultural groups.' },
            { title: 'Sport', body: 'Inter house competition and regular physical education.' },
            { title: 'Service', body: 'Responsibilities that keep the school running and teach ownership.' },
          ].map((item) => (
            <li
              key={item.title}
              data-vortex-item
              className="border-b border-white/10 p-8 sm:border-r sm:last:border-r-0 lg:border-b-0"
            >
              <h3 className="text-[1.0625rem] text-warm">{item.title}</h3>
              <p className="mt-3 text-[0.875rem] leading-[1.7] text-warm/55">{item.body}</p>
            </li>
          ))}
        </ul>
      </section>

      {/* 8. Digital learning ------------------------------------------------ */}
      <section className="bg-pure py-24 lg:py-32">
        <div className="shell">
          <SectionHeading
            eyebrow="Digital learning"
            title="Technology where it earns its place."
            standfirst="Screens are a tool, not a timetable. Palmseed uses them for the things they genuinely do better than paper."
            className="mb-16"
          />

          <div className="grid gap-12 lg:grid-cols-[1fr_0.82fr] lg:gap-20">
            <ol className="border-t border-ink-100">
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
              ].map((item, index) => (
                <li
                  key={item.title}
                  data-vortex-item
                  className="grid gap-3 border-b border-ink-100 py-7 sm:grid-cols-[4rem_minmax(0,1fr)] sm:gap-8"
                >
                  <span className="font-display text-[1.5rem] leading-none text-gold-deep">
                    {String(index + 1).padStart(2, '0')}
                  </span>
                  <div>
                    <h3 className="text-[1.125rem] leading-snug">{item.title}</h3>
                    <p className="mt-3 text-[0.9375rem] leading-[1.75] text-ink-500">{item.body}</p>
                  </div>
                </li>
              ))}
            </ol>

            <Plate
              photo={PHOTOGRAPHY.digital}
              aspect="4 / 5"
              sizes="(max-width: 1024px) 100vw, 42vw"
              className="self-start"
            />
          </div>
        </div>
      </section>

      {/* 9. Admissions ------------------------------------------------------ */}
      <section className="bg-warm py-24 lg:py-32">
        <div className="shell grid items-center gap-14 lg:grid-cols-[1fr_0.8fr] lg:gap-20">
          <div data-vortex-item>
            <p className="eyebrow mb-5">Admissions</p>
            <h2 className="text-[clamp(1.85rem,4vw,2.9rem)] leading-[1.08]">
              Registration is open for {JUNIOR_LEVELS.join(', ')} and {SENIOR_LEVELS.join(', ')}.
            </h2>
            <p className="mt-7 max-w-[54ch] text-[1.0625rem] leading-[1.8] text-ink-600">
              Start by creating an account. You will be asked for the student details, the class you
              are applying for and a parent or guardian contact. The school reviews every
              registration and replies by email.
            </p>

            <ol className="mt-11 border-t border-ink-200">
              {[
                'Create an account and confirm your email address.',
                'Complete the admission details and give guardian consent.',
                'The school reviews the registration.',
                'On approval, an admission number and class are issued and the full portal opens.',
              ].map((step, index) => (
                <li key={step} className="flex gap-6 border-b border-ink-200 py-4">
                  <span className="font-display text-[0.875rem] text-gold-deep">
                    {String(index + 1).padStart(2, '0')}
                  </span>
                  <span className="text-[0.9375rem] leading-[1.7] text-ink-700">{step}</span>
                </li>
              ))}
            </ol>

            <div className="mt-11 flex flex-wrap gap-4">
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

          <Plate
            photo={PHOTOGRAPHY.admissions}
            aspect="3 / 4"
            sizes="(max-width: 1024px) 100vw, 40vw"
            className="self-center"
          />
        </div>
      </section>

      {/* 10. Announcements -------------------------------------------------- */}
      <section className="border-t border-ink-100 bg-pure py-24 lg:py-28">
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
                <li key={item.id} data-vortex-item className="bg-pure p-8">
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

      {/* 11. Contact. Dark again, running into the footer. ------------------- */}
      <section id="contact" className="scroll-mt-24 bg-ink py-24 text-warm lg:py-32">
        <div className="shell grid gap-14 lg:grid-cols-[0.8fr_1fr] lg:gap-20">
          <div data-vortex-item>
            <p className="eyebrow mb-5 text-gold">Contact</p>
            <h2 className="text-[clamp(1.75rem,3.6vw,2.6rem)] leading-[1.1] text-warm">
              Speak to the school office.
            </h2>
            <p className="mt-7 max-w-[46ch] text-[1.0625rem] leading-[1.8] text-warm/65">
              Send a message and a member of staff will reply by email. Registration questions,
              visits and general enquiries are all welcome.
            </p>
            <p className="mt-8 text-[0.9375rem] leading-relaxed text-warm/45">
              You will receive an acknowledgement immediately, and a reply from the office after
              that.
            </p>
          </div>

          <div data-vortex-item className="border border-white/10 bg-warm p-7 sm:p-9">
            <ContactForm csrfToken={token} />
          </div>
        </div>
      </section>
    </>
  );
}
