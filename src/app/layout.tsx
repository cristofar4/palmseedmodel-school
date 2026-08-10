import type { Metadata, Viewport } from 'next';
import { Fraunces, Inter } from 'next/font/google';
import { SCHOOL, siteUrl } from '@/lib/school';
import './globals.css';

/**
 * Fraunces carries the editorial voice, Inter does the working text.
 * Both are self hosted by next/font at build time, so there is no render
 * blocking request to a font CDN and no layout shift on first paint.
 */
const fraunces = Fraunces({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-fraunces',
});

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
});

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl()),
  title: {
    default: `${SCHOOL.name}, ${SCHOOL.motto}`,
    template: `%s, ${SCHOOL.name}`,
  },
  description:
    'Palmseed Model School is a Nigerian secondary school offering Junior and Senior Secondary education, with Science, Art and Commercial pathways, and a secure portal for students, guardians and teachers.',
  applicationName: SCHOOL.name,
  keywords: [
    'Palmseed Model School',
    'Nigerian secondary school',
    'JSS',
    'SS',
    'school portal',
    'admissions',
  ],
  openGraph: {
    type: 'website',
    siteName: SCHOOL.name,
    title: `${SCHOOL.name}, ${SCHOOL.motto}`,
    description:
      'A Nigerian secondary school built on careful teaching, clear standards and a portal that keeps families informed.',
    locale: 'en_NG',
  },
  robots: { index: true, follow: true },
  icons: { icon: '/brand/palmseed-logo.png' },
};

export const viewport: Viewport = {
  themeColor: '#141414',
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en-NG" className={`${fraunces.variable} ${inter.variable}`}>
      <body>
        <a
          href="#main"
          className="sr-only-focusable absolute left-4 top-4 z-[100] bg-ink px-4 py-2 text-sm font-medium text-warm"
        >
          Skip to main content
        </a>
        {children}
      </body>
    </html>
  );
}
