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

/**
 * Brand palette, sampled from the school crest. Mirrors the CSS custom
 * properties in globals.css, and used where a colour has to be an inline
 * value: email templates, the canvas field, the browser theme colour.
 */
export const BRAND = {
  /** The seed red, exactly as it appears in the crest. */
  seed: '#DE0C0F',
  /** The working red. Holds its contrast on paper at small sizes. */
  brand: '#D21B1F',
  brandDeep: '#A2141A',
  /** The accent for dark surfaces, where the pure red vibrates against black. */
  brandLight: '#F04A4E',
  ink: '#141414',
  warm: '#F7F5F1',
  white: '#FFFFFF',
  muted: '#6B6660',
  hairline: '#E9E5DF',
} as const;

export function siteUrl(): string {
  const configured = process.env.NEXT_PUBLIC_SITE_URL;
  if (configured && configured.length > 0) return configured.replace(/\/$/, '');
  return 'http://localhost:3000';
}
