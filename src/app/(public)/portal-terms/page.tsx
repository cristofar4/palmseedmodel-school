import type { Metadata } from 'next';
import Link from 'next/link';
import { PageHeader, Prose } from '@/components/public/PageHeader';
import { SCHOOL } from '@/lib/school';

export const metadata: Metadata = {
  title: 'Portal terms',
  description:
    'The terms that apply to using the Palmseed Model School portal, for students, guardians and staff.',
};

export default function PortalTermsPage() {
  return (
    <>
      <PageHeader
        eyebrow="Legal"
        title="Portal terms."
        standfirst="These terms apply to everyone who holds a Palmseed portal account. Accepting them is part of registering."
      />

      <div className="bg-warm">
        <Prose>
          <h2>1. What an account is</h2>
          <p>
            A portal account belongs to one person. Creating an account starts a registration with
            the school. It does not enrol a student and it does not reserve a place. Until the
            school approves the registration, the account status is Pending Review and the enrolled
            student record is not available.
          </p>

          <h2>2. Accurate information</h2>
          <p>
            The details submitted must be true and complete. The school relies on them to decide on
            admission and to contact a parent or guardian. A registration containing information
            that is knowingly false may be rejected, and an enrolled account may be suspended.
          </p>

          <h2>3. Guardian consent</h2>
          <p>
            A registration must be made by a parent or guardian, or with their permission. Consent
            is recorded at the point of submission along with the date and time.
          </p>

          <h2>4. Keeping the account secure</h2>
          <ul>
            <li>Choose a password that you do not use anywhere else.</li>
            <li>Do not share the password or let another person sign in as you.</li>
            <li>
              Tell the school at once if you think somebody else has reached the account. Write to{' '}
              <a
                href={`mailto:${SCHOOL.replyEmail}`}
                className="text-palm-red underline underline-offset-4"
              >
                {SCHOOL.replyEmail}
              </a>
              .
            </li>
          </ul>
          <p>
            The school sends a security notice when an account is opened on a device it has not seen
            before, and whenever a password is changed. Changing a password signs every other device
            out.
          </p>

          <h2>5. Acceptable use</h2>
          <p>You agree not to:</p>
          <ul>
            <li>Attempt to reach a record that does not belong to you.</li>
            <li>Attempt to interfere with the portal or test its security without permission.</li>
            <li>Copy or republish another student’s information.</li>
            <li>Use the messaging features to harass or abuse anybody.</li>
          </ul>
          <p>
            Access attempts are logged. The school may suspend an account while a matter is
            investigated.
          </p>

          <h2>6. Teacher and staff accounts</h2>
          <p>
            Teacher accounts are created by an administrator. There is no public route to a teaching
            account. A teacher may only reach the classes and subjects assigned to them, and their
            entries into attendance and results are recorded against their name.
          </p>

          <h2>7. Records shown in the portal</h2>
          <p>
            Assessment is entered by teachers and published by the school. Until it is published it
            is not shown, so a partial set of marks is never mistaken for a final result. Where the
            school has not entered information yet, the portal says so rather than showing an
            estimate.
          </p>

          <h2>8. Availability</h2>
          <p>
            The school aims to keep the portal available at all times but does not guarantee
            uninterrupted service. Maintenance may occasionally be necessary.
          </p>

          <h2>9. Suspension and closure</h2>
          <p>
            The school may suspend or close an account where these terms are broken, where a
            registration is rejected, or where a student leaves the school. A record of the account
            is retained in line with the{' '}
            <Link href="/privacy" className="text-palm-red underline underline-offset-4">
              privacy policy
            </Link>
            .
          </p>

          <h2>10. Changes to these terms</h2>
          <p>
            If these terms change in a way that affects account holders, the school will give notice
            through the portal.
          </p>
        </Prose>
      </div>
    </>
  );
}
