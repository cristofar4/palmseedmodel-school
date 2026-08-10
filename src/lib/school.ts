/**
 * Single source of truth for school identity.
 *
 * Anything the school has not supplied is null on purpose. Every surface that
 * reads these values hides the row when it is null rather than inventing a
 * placeholder, so the site never publishes a detail that is not real.
 */
export const SCHOOL = {
  name: 'Palmseed Model School',
  shortName: 'Palmseed',
  motto: 'Always Useful',
  country: 'Nigeria',
  timezone: 'Africa/Lagos',

  /** Reply address for enquiries, also the administrator notification inbox. */
  replyEmail: 'christopherpraise864@gmail.com',

  /* Not yet supplied by the school. Left null so nothing is fabricated. */
  streetAddress: null as string | null,
  city: null as string | null,
  state: null as string | null,
  phone: null as string | null,
  whatsapp: null as string | null,
  socials: [] as Array<{ label: string; href: string }>,
} as const;

export const CLASS_LEVELS = ['JSS 1', 'JSS 2', 'JSS 3', 'SS 1', 'SS 2', 'SS 3'] as const;
export type ClassLevel = (typeof CLASS_LEVELS)[number];

export const JUNIOR_LEVELS = ['JSS 1', 'JSS 2', 'JSS 3'] as const;
export const SENIOR_LEVELS = ['SS 1', 'SS 2', 'SS 3'] as const;

export const STREAMS = ['Science', 'Art', 'Commercial'] as const;
export type Stream = (typeof STREAMS)[number];

export function isSeniorLevel(level: string): boolean {
  return level.startsWith('SS');
}

/** Brand palette, taken from the school logo. Mirrors the CSS custom properties. */
export const BRAND = {
  red: '#E51F2B',
  redDeep: '#B0151F',
  ink: '#0B0B0C',
  warm: '#F6F1EA',
  white: '#FFFFFF',
  muted: '#5B5B66',
  hairline: '#E8E4DD',
} as const;

export function siteUrl(): string {
  const configured = process.env.NEXT_PUBLIC_SITE_URL;
  if (configured && configured.length > 0) return configured.replace(/\/$/, '');
  return 'http://localhost:3000';
}
