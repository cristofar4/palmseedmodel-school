import type { Metadata } from 'next';
import Link from 'next/link';
import { PageHeader } from '@/components/public/PageHeader';
import { SectionHeading } from '@/components/ui/Layout';
import { Photo } from '@/components/media/Photo';
import { PHOTOGRAPHY } from '@/lib/media';
import { JUNIOR_LEVELS, SENIOR_LEVELS } from '@/lib/school';

export const metadata: Metadata = {
  title: 'Academics',
  description:
    'The academic programme at Palmseed Model School, covering Junior Secondary, Senior Secondary and the Science, Art and Commercial pathways.',
};

const PATHWAYS = [
  {
    name: 'Science',
    lead: 'For medicine, engineering, computing, agriculture and the physical and life sciences.',
    core: ['Mathematics', 'English Language', 'Biology', 'Chemistry', 'Physics'],
  },
  {
    name: 'Art',
    lead: 'For law, languages, the humanities, media, education and the social sciences.',
    core: ['Mathematics', 'English Language', 'Literature in English', 'Government', 'History'],
  },
  {
    name: 'Commercial',
    lead: 'For accounting, economics, banking, business administration and commerce.',
    core: ['Mathematics', 'English Language', 'Economics', 'Financial Accounting', 'Commerce'],
  },
] as const;

export default function AcademicsPage() {
  return (
    <>
      <PageHeader
        eyebrow="Academics"
        title="Six years, one standard."
        standfirst="Palmseed follows the Nigerian national curriculum. What follows is how the programme is organised, how students are assessed and how results reach families."
              photo={PHOTOGRAPHY.senior}
      />

      {/* Structure ---------------------------------------------------------- */}
      <section className="bg-warm py-20 lg:py-28">
        <div className="shell grid gap-14 lg:grid-cols-2 lg:gap-20">
          <div data-vortex-item className="border border-ink-100 bg-white p-8 lg:p-10">
            <p className="eyebrow mb-5">Junior Secondary</p>
            <h2 className="text-[1.6rem] leading-snug">JSS 1 to JSS 3</h2>
            <p className="mt-5 text-[1rem] leading-[1.8] text-ink-600">
              The junior years cover the basic education curriculum. The emphasis is on reading
              closely, writing clearly and reasoning in numbers, because everything in the senior
              school rests on those three.
            </p>
            <p className="mt-4 text-[1rem] leading-[1.8] text-ink-600">
              Junior Secondary ends with the Basic Education Certificate Examination. Results from
              the junior years also inform the pathway a student takes into SS 1.
            </p>
            <ul className="mt-8 flex flex-wrap gap-2.5">
              {JUNIOR_LEVELS.map((level) => (
                <li
                  key={level}
                  className="border border-ink-200 px-3.5 py-1.5 text-[0.8125rem] font-medium text-ink-700"
                >
                  {level}
                </li>
              ))}
            </ul>
          </div>

          <div data-vortex-item className="border border-ink-100 bg-white p-8 lg:p-10">
            <p className="eyebrow mb-5">Senior Secondary</p>
            <h2 className="text-[1.6rem] leading-snug">SS 1 to SS 3</h2>
            <p className="mt-5 text-[1rem] leading-[1.8] text-ink-600">
              Senior students specialise. Each takes a core of compulsory subjects alongside the
              subjects belonging to their pathway, and works towards the senior school certificate
              examinations.
            </p>
            <p className="mt-4 text-[1rem] leading-[1.8] text-ink-600">
              The pathway is chosen with the school. It is a decision about what a student is going
              to study next, so it is made with the evidence in front of everyone.
            </p>
            <ul className="mt-8 flex flex-wrap gap-2.5">
              {SENIOR_LEVELS.map((level) => (
                <li
                  key={level}
                  className="border border-ink-200 px-3.5 py-1.5 text-[0.8125rem] font-medium text-ink-700"
                >
                  {level}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* Pathways ------------------------------------------------------------ */}
      <section className="border-y border-ink-100 bg-white py-20 lg:py-28">
        <div className="shell">
          <SectionHeading
            eyebrow="Senior pathways"
            title="Three routes through the senior school."
            standfirst="Mathematics and English Language are compulsory on every pathway. The subjects listed here are the spine of each route, not the complete timetable."
            className="mb-16"
          />

          <div className="grid gap-px border border-ink-100 bg-ink-100 lg:grid-cols-3">
            {PATHWAYS.map((pathway) => (
              <article key={pathway.name} data-vortex-item className="bg-white p-8 lg:p-10">
                <h3 className="font-display text-[1.4rem] text-brand">{pathway.name}</h3>
                <p className="mt-4 text-[0.9375rem] leading-[1.75] text-ink-600">{pathway.lead}</p>

                <p className="mt-8 text-[0.6875rem] font-semibold uppercase tracking-[0.14em] text-ink-400">
                  Core subjects
                </p>
                <ul className="mt-4 divide-y divide-ink-100 border-t border-ink-100">
                  {pathway.core.map((subject) => (
                    <li key={subject} className="py-2.5 text-[0.9375rem] text-ink-700">
                      {subject}
                    </li>
                  ))}
                </ul>
              </article>
            ))}
          </div>

          <p className="mt-8 max-w-[62ch] text-[0.875rem] leading-relaxed text-ink-400">
            The full subject list for each class is published in the portal once the school sets the
            timetable for the session.
          </p>
        </div>
      </section>

      {/* Assessment ----------------------------------------------------------- */}
      <section className="bg-ink py-20 text-warm lg:py-28">
        <div className="shell grid gap-14 lg:grid-cols-[1fr_0.85fr] lg:gap-20">
          <div data-vortex-item>
            <SectionHeading
              eyebrow="Assessment"
              title="How a score is made."
              onDark
              standfirst="Assessment is split so that steady work through the term counts, not only the examination at the end of it."
            />

            <dl className="mt-12 divide-y divide-white/10 border-y border-white/10">
              {[
                {
                  term: 'Continuous assessment, 40 marks',
                  detail:
                    'Class work, tests, assignments and practical work recorded through the term by the subject teacher.',
                },
                {
                  term: 'Examination, 60 marks',
                  detail: 'The end of term examination in each subject.',
                },
                {
                  term: 'Total, 100 marks',
                  detail:
                    'Calculated by the system from the two parts above. It is never typed in by hand, so it cannot disagree with them.',
                },
                {
                  term: 'Grade',
                  detail:
                    'Derived from the total on the standard nine point scale, from A1 at 75 marks and above down to F9 below 40.',
                },
              ].map((row) => (
                <div key={row.term} className="py-5">
                  <dt className="font-display text-[1.0625rem] text-warm">{row.term}</dt>
                  <dd className="mt-2 text-[0.9375rem] leading-[1.7] text-warm/60">{row.detail}</dd>
                </div>
              ))}
            </dl>

            <p className="mt-10 text-[0.9375rem] leading-[1.8] text-warm/60">
              Results are entered by the subject teacher and published by the school. Until the
              school publishes them they are not visible to students or guardians, so a partial set
              of marks is never mistaken for a final one.
            </p>

            <div className="mt-10">
              <Link
                href="/admissions"
                className="border border-warm/30 px-7 py-3.5 text-sm font-medium text-warm transition-colors hover:border-warm hover:bg-warm hover:text-ink"
              >
                How to apply
              </Link>
            </div>
          </div>

          <div data-vortex-item className="relative aspect-[3/4] overflow-hidden bg-ink-800">
            <Photo photo={PHOTOGRAPHY.senior} sizes="(max-width: 1024px) 100vw, 42vw" />
          </div>
        </div>
      </section>
    </>
  );
}
