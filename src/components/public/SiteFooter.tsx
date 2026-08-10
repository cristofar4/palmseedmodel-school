import Link from 'next/link';
import { Logo } from '@/components/brand/Logo';
import { SCHOOL } from '@/lib/school';
import { PHOTOGRAPHY, PHOTOGRAPHY_NOTE } from '@/lib/media';
import { anyPhotographyInstalled } from '@/components/media/Photo';

const COLUMNS = [
  {
    heading: 'The school',
    links: [
      { href: '/about', label: 'About Palmseed' },
      { href: '/academics', label: 'Academics' },
      { href: '/school-life', label: 'School Life' },
      { href: '/news', label: 'News and announcements' },
    ],
  },
  {
    heading: 'Families',
    links: [
      { href: '/admissions', label: 'Admissions' },
      { href: '/signup', label: 'Start a registration' },
      { href: '/signin', label: 'Portal sign in' },
      { href: '/contact', label: 'Contact the school' },
    ],
  },
  {
    heading: 'Legal',
    links: [
      { href: '/privacy', label: 'Privacy policy' },
      { href: '/portal-terms', label: 'Portal terms' },
    ],
  },
] as const;

export function SiteFooter() {
  const year = new Date().getFullYear();
  // Credits are only shown once the photographs are actually installed.
  const showCredits = anyPhotographyInstalled(Object.values(PHOTOGRAPHY));

  return (
    <footer data-vortex-item className="border-t border-white/10 bg-ink text-warm">
      <div className="shell py-16 lg:py-20">
        <div className="grid gap-12 lg:grid-cols-[1.4fr_repeat(3,1fr)]">
          <div>
            <Logo size={52} tone="light" />
            <p className="mt-6 max-w-xs text-[0.875rem] leading-relaxed text-warm/55">
              A Nigerian secondary school built on careful teaching, clear standards and steady
              communication with families.
            </p>
          </div>

          {COLUMNS.map((column) => (
            <nav key={column.heading} aria-label={column.heading}>
              <h2 className="text-[0.6875rem] font-semibold uppercase tracking-[0.18em] text-gold">
                {column.heading}
              </h2>
              <ul className="mt-5 flex flex-col gap-3">
                {column.links.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="text-[0.875rem] text-warm/65 transition-colors hover:text-warm"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>

        <div className="mt-14 border-t border-white/10 pt-8">
          <dl className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            <div>
              <dt className="text-[0.6875rem] font-semibold uppercase tracking-[0.16em] text-warm/40">
                Enquiries
              </dt>
              <dd className="mt-2 text-[0.875rem]">
                <a
                  href={`mailto:${SCHOOL.replyEmail}`}
                  className="text-warm/75 underline underline-offset-4 hover:text-warm"
                >
                  {SCHOOL.replyEmail}
                </a>
              </dd>
            </div>

            {/* Address and phone appear here as soon as the school supplies
                them. Nothing is invented in the meantime. */}
            {SCHOOL.streetAddress ? (
              <div>
                <dt className="text-[0.6875rem] font-semibold uppercase tracking-[0.16em] text-warm/40">
                  Address
                </dt>
                <dd className="mt-2 text-[0.875rem] text-warm/75">{SCHOOL.streetAddress}</dd>
              </div>
            ) : null}

            {SCHOOL.phone ? (
              <div>
                <dt className="text-[0.6875rem] font-semibold uppercase tracking-[0.16em] text-warm/40">
                  Telephone
                </dt>
                <dd className="mt-2 text-[0.875rem] text-warm/75">{SCHOOL.phone}</dd>
              </div>
            ) : null}

            <div>
              <dt className="text-[0.6875rem] font-semibold uppercase tracking-[0.16em] text-warm/40">
                Country
              </dt>
              <dd className="mt-2 text-[0.875rem] text-warm/75">
                {SCHOOL.country}. All times shown in Lagos time.
              </dd>
            </div>
          </dl>
        </div>

        <div className="mt-12 flex flex-col gap-4 border-t border-white/10 pt-8 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-warm/40">
            Copyright {year} {SCHOOL.name}. All rights reserved.
          </p>
          <p className="text-xs text-warm/40">{SCHOOL.motto}</p>
        </div>

        {/* Whichever imagery is installed, the page says what it is. Nobody
            should have to guess what a picture here is showing them. */}
        <p className="mt-6 text-[0.6875rem] leading-relaxed text-warm/30">
          {showCredits
            ? PHOTOGRAPHY_NOTE
            : 'The images on this website are placeholder panels, not photographs. Palmseed has not yet supplied its own photography.'}
        </p>
      </div>
    </footer>
  );
}
