import Link from 'next/link';
import { HeroContent } from '@/components/public/Hero';
import { ContactForm } from '@/components/public/ContactForm';
import { Photo, hasPhotograph } from '@/components/media/Photo';
import { Plate } from '@/components/media/Plate';
import { EmptyState } from '@/components/ui/Feedback';
import { PHOTOGRAPHY } from '@/lib/media';
import { PROFILE } from '@/lib/data/profile';
import { publicAnnouncements } from '@/lib/data/public';
import { csrfToken } from '@/lib/security/csrf';
import { formatDate } from '@/lib/format';
import { JUNIOR_LEVELS, SENIOR_LEVELS, SCHOOL } from '@/lib/school';

export const dynamic = 'force-dynamic';

/* ------------------------------------------------------------------ copy */
/* Everything below describes how the school works, which this build does
   know. Nothing here is a number, a name or an achievement, because those are
   claims. Those live in src/lib/data/profile.ts, where the school fills them
   in or the section stays hidden. */

const PILLARS = [
  {
    title: 'Our vision',
    body: 'To be a leading secondary school in Nigeria, recognised for academic excellence and moral uprightness.',
    icon: 'eye',
  },
  {
    title: 'Our mission',
    body: 'To provide an education that helps every student discover what they are capable of and contribute to the society around them.',
    icon: 'target',
  },
] as const;

const VALUES = [
  'Academic excellence',
  'Service',
  'Discipline',
  'Leadership',
  'Integrity',
  'Compassion',
] as const;

const PROGRAMMES = [
  {
    title: 'Junior Secondary',
    note: `${JUNIOR_LEVELS[0]} to ${JUNIOR_LEVELS.at(-1)}`,
    icon: 'seedling',
  },
  {
    title: 'Senior Secondary',
    note: `${SENIOR_LEVELS[0]} to ${SENIOR_LEVELS.at(-1)}`,
    icon: 'shield',
  },
  { title: 'Science', note: 'Build, explore, innovate', icon: 'flask' },
  { title: 'Art', note: 'Creativity shapes tomorrow', icon: 'palette' },
  { title: 'Commercial', note: 'Business skills for life', icon: 'chart' },
  { title: 'Computer studies', note: 'Digital skills for a brighter future', icon: 'monitor' },
  { title: 'Library', note: 'A world of knowledge', icon: 'book' },
  { title: 'Clubs and sport', note: 'Teamwork and leadership', icon: 'ball' },
] as const;

const ADVANTAGES = [
  { title: 'Qualified and caring teachers', icon: 'badge' },
  { title: 'Conducive learning environment', icon: 'building' },
  { title: 'Holistic development', icon: 'sparkle' },
  { title: 'Leadership opportunities', icon: 'star' },
  { title: 'A record every family can see', icon: 'chart' },
  { title: 'A vibrant school community', icon: 'people' },
] as const;

const STEPS = [
  { title: 'Create an account', body: 'Register with a valid email address.' },
  { title: 'Fill the application form', body: 'Provide the required student information.' },
  {
    title: 'Upload documents',
    body: 'Birth certificate, last school report and a passport photograph.',
  },
  { title: 'The school reviews it', body: 'Every registration is read by the admissions office.' },
  { title: 'Receive confirmation', body: 'You are notified by email, with the decision.' },
] as const;

const FACILITIES = [
  {
    title: 'Modern classrooms',
    body: 'Spacious, well equipped learning spaces.',
    photo: PHOTOGRAPHY.junior,
  },
  {
    title: 'Science laboratory',
    body: 'Hands on discovery and practical work.',
    photo: PHOTOGRAPHY.senior,
  },
  {
    title: 'Teaching and support',
    body: 'Guidance for every student who needs it.',
    photo: PHOTOGRAPHY.teaching,
  },
  {
    title: 'Digital learning',
    body: 'Computer studies and coursework in the portal.',
    photo: PHOTOGRAPHY.digital,
  },
  {
    title: 'Admissions office',
    body: 'Families are met, not processed.',
    photo: PHOTOGRAPHY.admissions,
  },
] as const;

/* ----------------------------------------------------------------- icons */
/* Drawn here rather than pulled from a set, so they share one stroke weight
   and the page carries no icon font. */

function Icon({ name, className = '' }: { name: string; className?: string }) {
  const s = {
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.5,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
  };

  const paths: Record<string, React.ReactNode> = {
    eye: (
      <>
        <path d="M1 10s3.5-6 9-6 9 6 9 6-3.5 6-9 6-9-6-9-6Z" {...s} />
        <circle cx="10" cy="10" r="2.6" {...s} />
      </>
    ),
    target: (
      <>
        <circle cx="10" cy="10" r="7.5" {...s} />
        <circle cx="10" cy="10" r="3" {...s} />
      </>
    ),
    seedling: (
      <>
        <path d="M10 17v-6" {...s} />
        <path d="M10 11c0-3 2.4-5 5-5 0 3-2 5-5 5Z" {...s} />
        <path d="M10 12c0-2.6-2-4.4-4.4-4.4C5.6 10 7.6 12 10 12Z" {...s} />
      </>
    ),
    shield: <path d="M10 2.5 16.5 5v5c0 4-3 6.7-6.5 7.8C6.5 16.7 3.5 14 3.5 10V5L10 2.5Z" {...s} />,
    flask: (
      <>
        <path d="M8 2.5h4M8.8 2.5v5L4.6 15a1.6 1.6 0 0 0 1.4 2.4h8a1.6 1.6 0 0 0 1.4-2.4l-4.2-7.5v-5" {...s} />
        <path d="M6.2 12.2h7.6" {...s} />
      </>
    ),
    palette: (
      <>
        <path d="M10 2.5a7.5 7.5 0 0 0 0 15c1 0 1.6-.7 1.6-1.5 0-1.4 1-1.9 2.2-1.9h1.2A4.5 4.5 0 0 0 10 2.5Z" {...s} />
        <circle cx="7" cy="8" r="1" fill="currentColor" stroke="none" />
        <circle cx="11" cy="6.5" r="1" fill="currentColor" stroke="none" />
      </>
    ),
    chart: (
      <>
        <path d="M3 17h14" {...s} />
        <path d="M6 17V9M10 17V4.5M14 17v-5" {...s} />
      </>
    ),
    monitor: (
      <>
        <rect x="2.5" y="4" width="15" height="10" rx="1.4" {...s} />
        <path d="M7.5 17.5h5M10 14v3.5" {...s} />
      </>
    ),
    book: (
      <>
        <path d="M3.5 4.2A1.7 1.7 0 0 1 5.2 2.5H16v13H5.2a1.7 1.7 0 0 0-1.7 1.7V4.2Z" {...s} />
        <path d="M3.5 15.5A1.7 1.7 0 0 1 5.2 13.8H16" {...s} />
      </>
    ),
    ball: (
      <>
        <circle cx="10" cy="10" r="7.5" {...s} />
        <path d="M10 2.6 12.6 7l-2.6 3-2.6-3 2.6-4.4ZM3 9.4l4.4.6M17 9.4l-4.4.6M6.6 16.6 8 12.4M13.4 16.6 12 12.4" {...s} />
      </>
    ),
    badge: (
      <>
        <circle cx="10" cy="8" r="4.5" {...s} />
        <path d="M7 12.2 6 18l4-2 4 2-1-5.8" {...s} />
      </>
    ),
    building: (
      <>
        <path d="M3.5 17.5V6.6L10 3l6.5 3.6v10.9" {...s} />
        <path d="M3.5 17.5h13M8 17.5v-4h4v4" {...s} />
      </>
    ),
    sparkle: <path d="M10 2.5 11.8 8 17.5 10 11.8 12 10 17.5 8.2 12 2.5 10 8.2 8 10 2.5Z" {...s} />,
    star: <path d="m10 2.8 2.2 4.6 5 .7-3.6 3.5.9 5-4.5-2.4-4.5 2.4.9-5L2.8 8.1l5-.7L10 2.8Z" {...s} />,
    people: (
      <>
        <circle cx="7.6" cy="7.4" r="2.7" {...s} />
        <path d="M2.6 16.4a5 5 0 0 1 10 0" {...s} />
        <path d="M13.4 5a2.7 2.7 0 0 1 0 5.2M14.4 12.2a5 5 0 0 1 3 4.2" {...s} />
      </>
    ),
    check: <path d="m4 10.4 4 4 8-9" {...s} />,
    phone: (
      <path
        d="M6.6 3.2 8.4 7l-1.7 1.6a10 10 0 0 0 4.7 4.7L13 11.6l3.8 1.8v3a1.4 1.4 0 0 1-1.5 1.4A13.4 13.4 0 0 1 2.2 4.7 1.4 1.4 0 0 1 3.6 3.2h3Z"
        {...s}
      />
    ),
    mail: (
      <>
        <rect x="2.5" y="4.5" width="15" height="11" rx="1.4" {...s} />
        <path d="m2.9 5.6 7.1 5 7.1-5" {...s} />
      </>
    ),
    pin: (
      <>
        <path d="M10 17.5s6-5.2 6-9.3a6 6 0 1 0-12 0c0 4.1 6 9.3 6 9.3Z" {...s} />
        <circle cx="10" cy="8.1" r="2.2" {...s} />
      </>
    ),
    clock: (
      <>
        <circle cx="10" cy="10" r="7.5" {...s} />
        <path d="M10 5.6V10l3 1.8" {...s} />
      </>
    ),
    help: (
      <>
        <circle cx="10" cy="10" r="7.5" {...s} />
        <path d="M7.9 7.8a2.2 2.2 0 1 1 2.8 2.1c-.5.2-.7.6-.7 1.1v.4" {...s} />
        <circle cx="10" cy="14" r=".9" fill="currentColor" stroke="none" />
      </>
    ),
  };

  return (
    <svg width="20" height="20" viewBox="0 0 20 20" aria-hidden="true" className={className}>
      {paths[name] ?? paths.sparkle}
    </svg>
  );
}

/** The gold rule and label that opens each section. */
function Eyebrow({ children, onDark = false }: { children: React.ReactNode; onDark?: boolean }) {
  return (
    <p className="mb-4 flex items-center gap-3 text-[0.6875rem] font-semibold uppercase tracking-[0.18em]">
      <span aria-hidden="true" className="h-px w-6 bg-accent" />
      <span className={onDark ? 'text-accent' : 'text-accent-deep'}>{children}</span>
    </p>
  );
}

function Arrow() {
  return (
    <svg width="13" height="9" viewBox="0 0 13 9" aria-hidden="true" className="shrink-0">
      <path
        d="M0 4.5h11M7.5 1l3.5 3.5L7.5 8"
        stroke="currentColor"
        strokeWidth="1.5"
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/* ------------------------------------------------------------------ page */

export default async function HomePage() {
  const [announcements, token] = await Promise.all([publicAnnouncements(3), csrfToken()]);

  const heroHasPhoto = hasPhotograph(PHOTOGRAPHY.hero);
  const aboutHasPhoto = hasPhotograph(PHOTOGRAPHY.schoolLife);
  const advantageHasPhoto = hasPhotograph(PHOTOGRAPHY.digital);

  return (
    <>
      {/* 1. Hero ---------------------------------------------------------- */}
      <section className="relative isolate overflow-hidden bg-brand-wash">
        {heroHasPhoto ? (
          <div aria-hidden="true" className="absolute inset-y-0 right-0 hidden w-[58%] lg:block">
            <Photo photo={PHOTOGRAPHY.hero} priority sizes="60vw" />
            {/* Fades the picture into the type column. Only across the seam, so
                the photograph itself is left alone. */}
            <div
              className="absolute inset-0"
              style={{
                background:
                  'linear-gradient(to right, #F4F8F5 0%, rgba(244,248,245,0.94) 20%, rgba(244,248,245,0.12) 60%, transparent 100%)',
              }}
            />
          </div>
        ) : null}

        <div className="relative">
          <HeroContent variant="full" />
        </div>

        {heroHasPhoto ? (
          <div className="relative h-[40svh] w-full overflow-hidden lg:hidden">
            <Photo photo={PHOTOGRAPHY.hero} sizes="100vw" />
          </div>
        ) : null}
      </section>

      {/* 2. Figures. Present only when the school has supplied any. -------- */}
      {PROFILE.figures.length > 0 || PROFILE.strapline ? (
        <section className="border-y border-ink-100 bg-pure">
          <div className="shell flex flex-wrap items-center justify-between gap-x-12 gap-y-8 py-8">
            {PROFILE.figures.length > 0 ? (
              <dl className="flex flex-wrap items-center gap-x-14 gap-y-6">
                {PROFILE.figures.map((figure) => (
                  <div key={figure.label} data-vortex-item className="flex items-center gap-3.5">
                    <span className="flex h-11 w-11 items-center justify-center rounded-full bg-brand-tint text-brand">
                      <Icon name="star" />
                    </span>
                    <div>
                      <dd className="font-display text-[1.4rem] leading-none text-ink">
                        {figure.value}
                      </dd>
                      <dt className="mt-1.5 text-[0.8125rem] text-ink-500">{figure.label}</dt>
                    </div>
                  </div>
                ))}
              </dl>
            ) : null}

            {PROFILE.strapline ? (
              <p className="max-w-sm border-l-2 border-accent pl-5 font-display text-[0.9375rem] italic leading-relaxed text-ink-600">
                {PROFILE.strapline}
              </p>
            ) : null}
          </div>
        </section>
      ) : null}

      {/* 3. About --------------------------------------------------------- */}
      <section id="introduction" className="scroll-mt-24 bg-brand-wash py-20 lg:py-24">
        <div className="shell grid items-start gap-10 lg:grid-cols-[0.85fr_1.15fr]">
          <div data-vortex-item>
            <Eyebrow>Who we are</Eyebrow>
            <h2 className="text-[clamp(1.75rem,3.4vw,2.5rem)] leading-[1.15]">About our school</h2>
            <p className="mt-6 max-w-[46ch] text-[0.9375rem] leading-[1.85] text-ink-600">
              {SCHOOL.name} teaches the Nigerian national curriculum through Junior and Senior
              Secondary. Academic work, moral discipline and leadership together, so that students
              leave able to do something with what they have learnt.
            </p>
            <p className="mt-5 max-w-[46ch] text-[0.9375rem] leading-[1.85] text-ink-600">
              The motto is not decoration. It is the test we apply to a lesson, a rule and a report.
            </p>
            <Link
              href="/about"
              className="mt-8 inline-flex items-center gap-2.5 rounded-full bg-brand px-6 py-3 text-[0.8125rem] font-semibold text-white transition-colors hover:bg-brand-deep"
            >
              Learn more about us
              <Arrow />
            </Link>
          </div>

          <div className={`grid gap-6 ${aboutHasPhoto ? 'sm:grid-cols-[1.5fr_1fr]' : ''}`}>
            {aboutHasPhoto ? (
              <Plate
                photo={PHOTOGRAPHY.schoolLife}
                aspect="4 / 3"
                sizes="(max-width: 640px) 100vw, 45vw"
                className="rounded-2xl"
                frame={false}
              />
            ) : null}

            <div
              data-vortex-item
              className="flex flex-col justify-center rounded-2xl border border-ink-100 bg-pure p-7"
            >
              <span className="flex h-11 w-11 items-center justify-center rounded-full bg-brand-tint text-brand">
                <Icon name="building" />
              </span>
              <h3 className="mt-5 text-[1.125rem]">Our story</h3>
              <p className="mt-3 text-[0.875rem] leading-[1.75] text-ink-500">
                A community of learners, teachers and families working towards the same thing.
              </p>
              <Link
                href="/about"
                className="mt-6 inline-flex items-center gap-2 text-[0.8125rem] font-semibold text-brand hover:text-brand-deep"
              >
                Read our story
                <Arrow />
              </Link>
            </div>
          </div>
        </div>

        <div className="shell mt-6 grid gap-6 lg:grid-cols-[repeat(2,1fr)_1.25fr]">
          {PILLARS.map((pillar) => (
            <div
              key={pillar.title}
              data-vortex-item
              className="rounded-2xl border border-ink-100 bg-pure p-7"
            >
              <span className="flex h-11 w-11 items-center justify-center rounded-full bg-brand-tint text-brand">
                <Icon name={pillar.icon} />
              </span>
              <h3 className="mt-5 text-[1.125rem]">{pillar.title}</h3>
              <p className="mt-3 text-[0.875rem] leading-[1.75] text-ink-500">{pillar.body}</p>
            </div>
          ))}

          <div data-vortex-item className="rounded-2xl border border-ink-100 bg-pure p-7">
            <span className="flex h-11 w-11 items-center justify-center rounded-full bg-brand-tint text-brand">
              <Icon name="sparkle" />
            </span>
            <h3 className="mt-5 text-[1.125rem]">Our core values</h3>
            <ul className="mt-4 grid gap-x-6 gap-y-2.5 sm:grid-cols-2">
              {VALUES.map((value) => (
                <li key={value} className="flex items-center gap-2.5 text-[0.875rem] text-ink-600">
                  <span className="text-brand-mid">
                    <Icon name="check" className="h-4 w-4" />
                  </span>
                  {value}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* 4. Academics ------------------------------------------------------ */}
      <section className="bg-pure py-20 lg:py-24">
        <div className="shell grid items-start gap-10 lg:grid-cols-[0.7fr_1.3fr]">
          <div data-vortex-item>
            <Eyebrow>Excellence in education</Eyebrow>
            <h2 className="text-[clamp(1.6rem,3vw,2.2rem)] leading-[1.15]">
              Academics and learning programmes
            </h2>
            <p className="mt-5 max-w-[42ch] text-[0.9375rem] leading-[1.8] text-ink-500">
              A full curriculum and the room to find what a student is good at.
            </p>
            <ul className="mt-7 flex flex-wrap gap-2">
              {[...JUNIOR_LEVELS, ...SENIOR_LEVELS].map((level) => (
                <li
                  key={level}
                  className="rounded-full border border-ink-200 px-3.5 py-1.5 text-[0.75rem] font-medium text-ink-600"
                >
                  {level}
                </li>
              ))}
            </ul>

            <Link
              href="/academics"
              className="mt-7 inline-flex items-center gap-2.5 rounded-full border border-ink-200 px-6 py-3 text-[0.8125rem] font-semibold text-ink transition-colors hover:border-brand hover:text-brand"
            >
              Explore our academics
              <Arrow />
            </Link>
          </div>

          <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-4">
            {PROGRAMMES.map((programme) => (
              <li
                key={programme.title}
                data-vortex-item
                className="rounded-2xl border border-ink-100 bg-brand-wash p-5 text-center transition-colors hover:border-brand-light"
              >
                <span className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-pure text-brand">
                  <Icon name={programme.icon} />
                </span>
                <h3 className="mt-4 text-[0.875rem] font-semibold text-ink">{programme.title}</h3>
                <p className="mt-1.5 text-[0.75rem] leading-relaxed text-ink-400">
                  {programme.note}
                </p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* 5. Why choose Palmseed -------------------------------------------- */}
      <section className="relative isolate overflow-hidden bg-brand py-16 text-white lg:py-20">
        {advantageHasPhoto ? (
          <div aria-hidden="true" className="absolute inset-y-0 right-0 hidden w-[34%] lg:block">
            <Photo photo={PHOTOGRAPHY.digital} sizes="35vw" />
            <div
              className="absolute inset-0"
              style={{
                background:
                  'linear-gradient(to right, #12603C 0%, rgba(18,96,60,0.74) 45%, rgba(18,96,60,0.34) 100%)',
              }}
            />
          </div>
        ) : null}

        <div className="relative shell grid items-center gap-10 lg:grid-cols-[0.75fr_1.25fr]">
          <div data-vortex-item>
            <Eyebrow onDark>The Palmseed advantage</Eyebrow>
            <h2 className="text-[clamp(1.6rem,3vw,2.2rem)] leading-[1.15] text-white">
              Why choose Palmseed?
            </h2>
            <p className="mt-5 max-w-[38ch] text-[0.9375rem] leading-[1.8] text-white/70">
              A nurturing environment, dedicated teachers, and a record every family can see.
            </p>
            <Link
              href="/about"
              className="mt-7 inline-flex items-center gap-2.5 rounded-full border border-white/35 px-6 py-3 text-[0.8125rem] font-semibold text-white transition-colors hover:bg-white hover:text-brand"
            >
              Discover the difference
              <Arrow />
            </Link>
          </div>

          <ul className="grid grid-cols-2 gap-x-6 gap-y-8 sm:grid-cols-3">
            {ADVANTAGES.map((item) => (
              <li key={item.title} data-vortex-item className="text-center">
                <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full border border-white/25 text-accent">
                  <Icon name={item.icon} />
                </span>
                <h3 className="mt-3.5 text-[0.8125rem] font-medium leading-snug text-white/90">
                  {item.title}
                </h3>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* 6. How to apply ---------------------------------------------------- */}
      <section className="bg-brand-wash py-20 lg:py-24">
        <div className="shell grid items-start gap-10 lg:grid-cols-[0.62fr_1.38fr]">
          <div data-vortex-item>
            <Eyebrow>Join our community</Eyebrow>
            <h2 className="text-[clamp(1.6rem,3vw,2.2rem)] leading-[1.15]">How to apply</h2>
            <p className="mt-5 max-w-[38ch] text-[0.9375rem] leading-[1.8] text-ink-500">
              Five steps to a place at Palmseed. Registration is open for {JUNIOR_LEVELS.join(', ')}{' '}
              and {SENIOR_LEVELS.join(', ')}.
            </p>
            <Link
              href="/signup"
              className="mt-7 inline-flex items-center gap-2.5 rounded-full bg-brand px-6 py-3 text-[0.8125rem] font-semibold text-white transition-colors hover:bg-brand-deep"
            >
              Apply now
              <Arrow />
            </Link>
          </div>

          <div className="grid gap-6 lg:grid-cols-[1fr_15rem]">
            <ol className="grid gap-x-4 gap-y-8 sm:grid-cols-3 lg:grid-cols-5">
              {STEPS.map((step, index) => (
                <li key={step.title} data-vortex-item className="relative text-center">
                  {index < STEPS.length - 1 ? (
                    <span
                      aria-hidden="true"
                      className="absolute left-[calc(50%+1.5rem)] right-[-0.9rem] top-4 hidden border-t border-dashed border-ink-200 lg:block"
                    />
                  ) : null}
                  <span className="relative mx-auto flex h-8 w-8 items-center justify-center rounded-full bg-brand text-[0.75rem] font-semibold text-white">
                    {index + 1}
                  </span>
                  <h3 className="mt-4 text-[0.8125rem] font-semibold leading-snug text-ink">
                    {step.title}
                  </h3>
                  <p className="mt-2 text-[0.75rem] leading-relaxed text-ink-400">{step.body}</p>
                </li>
              ))}
            </ol>

            <div
              data-vortex-item
              className="self-start rounded-2xl border border-ink-100 bg-pure p-6"
            >
              <span className="flex items-center gap-2.5 text-[0.875rem] font-semibold text-ink">
                <span className="text-brand">
                  <Icon name="help" />
                </span>
                Need help?
              </span>
              <p className="mt-3 text-[0.8125rem] leading-relaxed text-ink-500">
                The admissions office will answer any question before you start.
              </p>
              <Link
                href="/contact"
                className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-full border border-ink-200 px-4 py-2.5 text-[0.8125rem] font-semibold text-ink transition-colors hover:border-brand hover:text-brand"
              >
                Contact admissions
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* 7. Life at Palmseed ------------------------------------------------ */}
      <section className="bg-pure py-20 lg:py-24">
        <div className="shell grid items-start gap-10 lg:grid-cols-[0.55fr_1.45fr]">
          <div data-vortex-item>
            <Eyebrow>A vibrant community</Eyebrow>
            <h2 className="text-[clamp(1.6rem,3vw,2.2rem)] leading-[1.15]">Life at Palmseed</h2>
            <p className="mt-5 max-w-[36ch] text-[0.9375rem] leading-[1.8] text-ink-500">
              Assembly, clubs, sport and service run alongside the timetable.
            </p>
            <Link
              href="/school-life"
              className="mt-7 inline-flex items-center gap-2.5 rounded-full border border-ink-200 px-6 py-3 text-[0.8125rem] font-semibold text-ink transition-colors hover:border-brand hover:text-brand"
            >
              Explore school life
              <Arrow />
            </Link>
          </div>

          <ul className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {FACILITIES.map((facility) => (
              <li key={facility.title} data-vortex-item>
                <Plate
                  photo={facility.photo}
                  aspect="4 / 3"
                  sizes="(max-width: 640px) 100vw, 30vw"
                  className="rounded-xl"
                  frame={false}
                />
                <h3 className="mt-3.5 text-[0.875rem] font-semibold text-ink">{facility.title}</h3>
                <p className="mt-1.5 text-[0.75rem] leading-relaxed text-ink-400">{facility.body}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* 8. Principal, news and testimonials -------------------------------- */}
      <section className="bg-brand-wash py-20 lg:py-24">
        <div className="shell grid gap-10 lg:grid-cols-2">
          {/* A named quotation is a claim, so it appears only once the school
              has supplied one. */}
          {PROFILE.principal ? (
            <div data-vortex-item className="rounded-2xl border border-ink-100 bg-pure p-8">
              <Eyebrow>Leadership</Eyebrow>
              <h2 className="text-[1.5rem] leading-tight">A message from our principal</h2>
              <blockquote className="mt-6 border-l-2 border-accent pl-5 text-[0.9375rem] leading-[1.85] text-ink-600">
                {PROFILE.principal.quote}
              </blockquote>
              <p className="mt-5 font-display text-[1rem] text-ink">{PROFILE.principal.name}</p>
              <p className="text-[0.8125rem] text-ink-400">{PROFILE.principal.title}</p>
            </div>
          ) : null}

          <div data-vortex-item className={PROFILE.principal ? '' : 'lg:col-span-2'}>
            <div className="mb-7 flex flex-wrap items-end justify-between gap-4">
              <div>
                <Eyebrow>Stay informed</Eyebrow>
                <h2 className="text-[1.5rem] leading-tight">Latest news and events</h2>
              </div>
              <Link
                href="/news"
                className="inline-flex items-center gap-2 rounded-full border border-ink-200 px-5 py-2.5 text-[0.8125rem] font-semibold text-ink transition-colors hover:border-brand hover:text-brand"
              >
                View all news
                <Arrow />
              </Link>
            </div>

            {announcements.length === 0 ? (
              <EmptyState
                title="No announcements have been published yet."
                description="When the school publishes a notice it appears here and in the portal. Registered families are emailed at the same time."
              />
            ) : (
              <ul className={`grid gap-4 ${PROFILE.principal ? '' : 'md:grid-cols-3'}`}>
                {announcements.map((item) => (
                  <li
                    key={item.id}
                    className="rounded-2xl border border-ink-100 bg-pure p-5 transition-colors hover:border-brand-light"
                  >
                    <time
                      dateTime={new Date(item.published_at).toISOString()}
                      className="text-[0.6875rem] font-semibold uppercase tracking-[0.12em] text-ink-400"
                    >
                      {formatDate(item.published_at)}
                    </time>
                    <h3 className="mt-2 text-[1rem] leading-snug">{item.title}</h3>
                    <p className="mt-2 line-clamp-2 text-[0.8125rem] leading-relaxed text-ink-500">
                      {item.body}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {PROFILE.testimonials.length > 0 ? (
          <div className="shell mt-12">
            <Eyebrow>Testimonials</Eyebrow>
            <h2 className="text-[1.5rem] leading-tight">What people say</h2>
            <ul className="mt-7 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
              {PROFILE.testimonials.map((item) => (
                <li
                  key={item.name}
                  data-vortex-item
                  className="rounded-2xl border border-ink-100 bg-pure p-7"
                >
                  <span
                    aria-hidden="true"
                    className="font-display text-[2rem] leading-none text-accent"
                  >
                    &ldquo;
                  </span>
                  <blockquote className="mt-2 text-[0.9375rem] leading-[1.8] text-ink-600">
                    {item.quote}
                  </blockquote>
                  <p className="mt-5 text-[0.875rem] font-semibold text-ink">{item.name}</p>
                  <p className="text-[0.75rem] text-ink-400">{item.relationship}</p>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </section>

      {/* 9. Contact --------------------------------------------------------- */}
      <section id="contact" className="scroll-mt-24 bg-brand py-16 text-white lg:py-20">
        <div className="shell">
          <div className="flex flex-wrap items-start justify-between gap-10">
            <div data-vortex-item className="max-w-xl">
              <Eyebrow onDark>Get in touch</Eyebrow>
              <h2 className="text-[clamp(1.6rem,3vw,2.2rem)] leading-[1.15] text-white">
                Let us build a brighter tomorrow together
              </h2>
              <p className="mt-4 text-[0.9375rem] leading-[1.8] text-white/70">
                Send a message and a member of staff will reply by email.
              </p>
            </div>

            <dl className="flex flex-wrap gap-x-12 gap-y-6">
              <div className="flex items-start gap-3">
                <span className="mt-0.5 text-accent">
                  <Icon name="mail" />
                </span>
                <div>
                  <dt className="text-[0.6875rem] font-semibold uppercase tracking-[0.14em] text-white/50">
                    Email us
                  </dt>
                  <dd className="mt-1 text-[0.875rem]">
                    <a href={`mailto:${SCHOOL.replyEmail}`} className="underline underline-offset-4">
                      {SCHOOL.replyEmail}
                    </a>
                  </dd>
                </div>
              </div>

              {/* Telephone, address and hours appear the moment the school
                  supplies them. Nothing is invented meanwhile. */}
              {SCHOOL.phone ? (
                <div className="flex items-start gap-3">
                  <span className="mt-0.5 text-accent">
                    <Icon name="phone" />
                  </span>
                  <div>
                    <dt className="text-[0.6875rem] font-semibold uppercase tracking-[0.14em] text-white/50">
                      Call us
                    </dt>
                    <dd className="mt-1 text-[0.875rem]">{SCHOOL.phone}</dd>
                  </div>
                </div>
              ) : null}

              {SCHOOL.streetAddress ? (
                <div className="flex items-start gap-3">
                  <span className="mt-0.5 text-accent">
                    <Icon name="pin" />
                  </span>
                  <div>
                    <dt className="text-[0.6875rem] font-semibold uppercase tracking-[0.14em] text-white/50">
                      Visit us
                    </dt>
                    <dd className="mt-1 text-[0.875rem]">{SCHOOL.streetAddress}</dd>
                  </div>
                </div>
              ) : null}

              {PROFILE.officeHours ? (
                <div className="flex items-start gap-3">
                  <span className="mt-0.5 text-accent">
                    <Icon name="clock" />
                  </span>
                  <div>
                    <dt className="text-[0.6875rem] font-semibold uppercase tracking-[0.14em] text-white/50">
                      School hours
                    </dt>
                    <dd className="mt-1 text-[0.875rem]">{PROFILE.officeHours}</dd>
                  </div>
                </div>
              ) : null}
            </dl>
          </div>

          <div
            data-vortex-item
            className="mt-10 rounded-2xl bg-warm p-7 text-ink sm:p-9 lg:max-w-3xl"
          >
            <ContactForm csrfToken={token} />
          </div>
        </div>
      </section>
    </>
  );
}
