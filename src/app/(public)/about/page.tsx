import type { Metadata } from 'next';
import { PageHeader, Prose } from '@/components/public/PageHeader';
import { Plate } from '@/components/media/Plate';
import { PHOTOGRAPHY } from '@/lib/media';
import { SCHOOL } from '@/lib/school';

export const metadata: Metadata = {
  title: 'About Palmseed',
  description:
    'Palmseed Model School is a Nigerian secondary school teaching the national curriculum from JSS 1 to SS 3, with Science, Art and Commercial pathways.',
};

export default function AboutPage() {
  return (
    <>
      <PageHeader
        eyebrow="About Palmseed"
        title="A secondary school with a plain purpose."
        standfirst="Palmseed Model School exists to make young people capable. The motto, Always Useful, is the standard we hold every lesson and every rule against."
              photo={PHOTOGRAPHY.teaching}
      />

      <section className="bg-warm">
        <div className="shell pt-20 lg:pt-28">
          {/* The reading room, not the teaching plate: the masthead already
              carries that one and a page should not show the same image twice. */}
          <Plate
            photo={PHOTOGRAPHY.schoolLife}
            aspect="21 / 9"
            sizes="100vw"
            
          />
        </div>

        <Prose>
          <h2>What the school is</h2>
          <p>
            Palmseed Model School is a secondary school in {SCHOOL.country}. It teaches the Nigerian
            national curriculum across the six years of secondary education, from JSS 1 through to
            SS 3, and prepares students for the national examinations at the end of each stage.
          </p>
          <p>
            The school is organised around two ideas. The first is that a student should be able to
            do something with what they have learnt. The second is that a family should never be
            guessing about how their child is doing.
          </p>

          <h2>Always Useful</h2>
          <p>
            A motto is only worth having if it decides something. Ours decides what we teach and how
            we teach it. When a topic is introduced, the question the teacher has to answer is what
            the student will be able to do afterwards that they could not do before.
          </p>
          <p>
            It applies to conduct as much as to lessons. Punctuality, honesty and care for other
            people are useful. They are taught, expected and noticed.
          </p>

          <h2>Junior and Senior Secondary</h2>
          <p>
            Junior Secondary covers JSS 1 to JSS 3 and follows the basic education curriculum. It
            ends with the Basic Education Certificate Examination.
          </p>
          <p>
            Senior Secondary covers SS 1 to SS 3. Students take one of three pathways, Science, Art
            or Commercial, chosen with the school after looking at junior results and what the
            student intends to study next.
          </p>

          <h2>How families stay informed</h2>
          <p>
            Every enrolled student has a portal account. Teachers enter assessment and attendance,
            the school publishes it, and students and guardians see the same record at the same
            time. Notices are sent by email as well as posted in the portal.
          </p>
          <p>
            A student can only ever see their own record. Teachers can only reach the classes and
            subjects they are assigned to. This is enforced by the system, not by convention.
          </p>

          <h2>Contact</h2>
          <p>
            Enquiries reach the school office at{' '}
            <a
              href={`mailto:${SCHOOL.replyEmail}`}
              className="text-brand underline underline-offset-4"
            >
              {SCHOOL.replyEmail}
            </a>
            . You can also use the contact form and you will receive an acknowledgement immediately.
          </p>
        </Prose>
      </section>
    </>
  );
}
