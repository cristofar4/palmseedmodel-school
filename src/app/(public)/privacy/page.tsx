import type { Metadata } from 'next';
import Link from 'next/link';
import { PageHeader, Prose } from '@/components/public/PageHeader';
import { SCHOOL } from '@/lib/school';

export const metadata: Metadata = {
  title: 'Privacy policy',
  description:
    'How Palmseed Model School collects, uses and protects personal information belonging to students, guardians and staff.',
};

export default function PrivacyPage() {
  return (
    <>
      <PageHeader
        eyebrow="Legal"
        title="Privacy policy."
        standfirst="What Palmseed Model School collects, why it is collected, who can see it and how long it is kept."
      />

      <div className="bg-warm">
        <Prose>
          <h2>Who this covers</h2>
          <p>
            This policy covers everybody who uses this website or the Palmseed portal. That includes
            prospective students, enrolled students, parents and guardians, teachers and
            administrative staff.
          </p>

          <h2>What we collect</h2>
          <p>During registration and enrolment the school collects:</p>
          <ul>
            <li>Student name, date of birth, gender where given, and home address where given.</li>
            <li>Contact details, meaning an email address and a phone number.</li>
            <li>
              Parent or guardian name, relationship, email address and phone number.
            </li>
            <li>Previous school, where the student is transferring from one.</li>
            <li>
              Academic records once enrolled, meaning subjects, timetable, attendance, continuous
              assessment, examination scores, grades and teacher remarks.
            </li>
            <li>Fee records, where the school records them.</li>
          </ul>

          <p>The portal also records information about the use of the account itself:</p>
          <ul>
            <li>
              Sign in and sign out events, account creation, email confirmation, password reset
              requests and password changes.
            </li>
            <li>
              The type of device, the browser and the operating system, taken from the request your
              browser sends.
            </li>
            <li>
              A coarse region label where the hosting network provides one. We do not carry out
              geolocation ourselves.
            </li>
            <li>
              A protected one way hash of the network address. The address itself is not written to
              the database and cannot be recovered from the stored value.
            </li>
          </ul>

          <h2>Why we collect it</h2>
          <ul>
            <li>To decide on admission and to enrol a student.</li>
            <li>To teach, assess and report on a student, which is the core purpose of a school.</li>
            <li>To keep parents and guardians informed.</li>
            <li>
              To keep accounts secure. Security events are what allow the school to notice an
              account being attacked and to tell the account holder about it.
            </li>
            <li>To meet record keeping obligations that apply to a school.</li>
          </ul>

          <h2>Who can see it</h2>
          <p>
            Access is restricted by role, and the restriction is enforced by the system rather than
            by policy alone.
          </p>
          <ul>
            <li>A student can see their own record and nothing belonging to any other student.</li>
            <li>
              A teacher can see only the classes and subjects they are assigned to for the current
              session.
            </li>
            <li>
              Administrative staff can see student and guardian records because approving admissions
              and publishing results requires it.
            </li>
            <li>
              Parents and guardians receive information about the student they are named against.
            </li>
          </ul>

          <h2>Email</h2>
          <p>
            The school sends transactional email, meaning confirmation links, password reset codes,
            security notices, admission decisions and school announcements. These are sent through a
            third party delivery provider. A record of every message the school sends is kept, so
            that a family can be told exactly what was sent and when.
          </p>

          <h2>Cookies</h2>
          <p>
            The portal sets two cookies and neither is used for advertising or tracking. One holds
            the session, so that you stay signed in. The other holds a token that protects forms
            against cross site request forgery. Both are marked http only, which means they cannot
            be read by scripts running in the page.
          </p>
          <p>
            Authentication tokens are never placed in local storage or session storage.
          </p>

          <h2>How long it is kept</h2>
          <p>
            Student academic records are retained for as long as the school is required to hold
            them. Security events and audit records are retained so that an incident can be
            investigated afterwards. A registration that is not approved is retained so that the
            school can answer questions about the decision.
          </p>

          <h2>Your rights</h2>
          <p>
            You may ask what the school holds about you, ask for a correction where something is
            wrong, and ask about deletion where the school is not obliged to keep it. Write to{' '}
            <a
              href={`mailto:${SCHOOL.replyEmail}`}
              className="text-palm-red underline underline-offset-4"
            >
              {SCHOOL.replyEmail}
            </a>{' '}
            and say what you are asking for.
          </p>

          <h2>Changes</h2>
          <p>
            If this policy changes in a way that affects how information is used, the school will
            say so through the portal.
          </p>

          <p>
            See also the{' '}
            <Link href="/portal-terms" className="text-palm-red underline underline-offset-4">
              portal terms
            </Link>
            .
          </p>
        </Prose>
      </div>
    </>
  );
}
