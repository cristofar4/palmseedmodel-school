import type { Metadata } from 'next';
import { PageHeader } from '@/components/public/PageHeader';
import { SectionHeading } from '@/components/ui/Layout';
import { Photo } from '@/components/media/Photo';
import { PHOTOGRAPHY } from '@/lib/media';

export const metadata: Metadata = {
  title: 'School Life',
  description:
    'Assembly, clubs, sport, service and pastoral care at Palmseed Model School, and how the school day is organised.',
};

const AREAS = [
  {
    title: 'Assembly',
    body: 'The day begins together. Notices are given, standards are restated and work worth recognising is recognised in front of everybody.',
  },
  {
    title: 'Clubs and societies',
    body: 'Debate, press, science, literary and cultural groups meet through the week. Students run them, with a member of staff attached to each.',
  },
  {
    title: 'Sport and physical education',
    body: 'Regular physical education for every year group, and inter house competition through the session.',
  },
  {
    title: 'Service and responsibility',
    body: 'Prefects, class monitors and duty roles. Real responsibilities with real consequences, which is the only way responsibility is learnt.',
  },
  {
    title: 'Pastoral care',
    body: 'Every class has a form teacher who knows the students in it and is the first point of contact for a guardian.',
  },
  {
    title: 'Guidance for the next step',
    body: 'Senior students are advised on pathway choice, examination entry and what different courses of study require.',
  },
] as const;

export default function SchoolLifePage() {
  return (
    <>
      <PageHeader
        eyebrow="School Life"
        title="What happens between the lessons."
        standfirst="A timetable teaches subjects. The rest of the school day teaches everything else, and it is planned with the same care."
      />

      <section className="bg-warm">
        <div className="shell pt-20 lg:pt-28">
          <div data-vortex-item className="relative aspect-[21/9] overflow-hidden bg-ink">
            <Photo photo={PHOTOGRAPHY.schoolLife} sizes="100vw" />
          </div>
        </div>

        <div className="shell py-20 lg:py-28">
          <SectionHeading
            eyebrow="Around the timetable"
            title="Six parts of the week that are not lessons."
            className="mb-16"
          />

          <ul className="grid gap-px border border-ink-100 bg-ink-100 md:grid-cols-2 lg:grid-cols-3">
            {AREAS.map((area) => (
              <li key={area.title} data-vortex-item className="bg-white p-8">
                <h3 className="text-[1.125rem] leading-snug">{area.title}</h3>
                <p className="mt-3 text-[0.9375rem] leading-[1.75] text-ink-500">{area.body}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="border-t border-ink-100 bg-ink py-20 text-warm lg:py-28">
        <div className="shell grid gap-14 lg:grid-cols-2 lg:gap-20">
          <div data-vortex-item>
            <SectionHeading eyebrow="Conduct" title="What is expected." onDark />
            <p className="mt-8 text-[1.0625rem] leading-[1.8] text-warm/65">
              Palmseed expects punctuality, honesty, and respect for other people and for the
              school. These are not slogans on a wall. They are recorded, discussed with guardians
              when necessary, and they carry weight.
            </p>
            <p className="mt-5 text-[1.0625rem] leading-[1.8] text-warm/65">
              Attendance is taken every day and is visible to guardians in the portal. Where a
              pattern develops, the school raises it early rather than at the end of term.
            </p>
          </div>

          <div data-vortex-item className="relative aspect-[4/3] overflow-hidden bg-ink-800">
            <Photo photo={PHOTOGRAPHY.teaching} sizes="(max-width: 1024px) 100vw, 48vw" />
          </div>
        </div>
      </section>
    </>
  );
}
