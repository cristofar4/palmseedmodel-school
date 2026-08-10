/**
 * Photography manifest.
 *
 * Every photograph the site uses is declared here and stored locally under
 * public/photography. Nothing is hotlinked.
 *
 * These are licensed stock photographs of African secondary school students
 * and teachers. They illustrate the pages. They are not presented as
 * photographs of Palmseed students, and no caption claims otherwise. When the
 * school supplies its own photography, drop the files in at the same paths and
 * update the credit lines.
 *
 * Run `npm run media:fetch` to download them. Until then each slot renders a
 * composed brand panel rather than a broken image.
 */

export interface Photograph {
  /** Local path under public/. */
  src: string;
  /**
   * Original artwork drawn by scripts/generate-artwork.ts, shown when no
   * photograph has been installed. It is a finished image in its own right,
   * not a grey placeholder.
   */
  artwork: string;
  /** Source page, kept for attribution and licence checking. */
  sourceUrl: string;
  photographer: string;
  /** Direct download URL used by scripts/fetch-media.ts. */
  downloadUrl: string;
  alt: string;
  /** Focal point, so the crop keeps faces in frame on narrow screens. */
  position?: string;
}

const PEXELS = (id: string, size = 1920) =>
  `https://images.pexels.com/photos/${id}/pexels-photo-${id}.jpeg?auto=compress&cs=tinysrgb&w=${size}`;

export const PHOTOGRAPHY = {
  hero: {
    artwork: '/artwork/hero.svg',
    src: '/photography/hero-assembly.jpg',
    sourceUrl: 'https://www.pexels.com/photo/8926648/',
    photographer: 'Kampus Production',
    downloadUrl: PEXELS('8926648', 2400),
    alt: 'Secondary school students in uniform standing together outside a classroom block',
    position: '50% 35%',
  },
  junior: {
    artwork: '/artwork/junior.svg',
    src: '/photography/junior-classroom.jpg',
    sourceUrl: 'https://www.pexels.com/photo/8500352/',
    photographer: 'Kampus Production',
    downloadUrl: PEXELS('8500352'),
    alt: 'Junior secondary students working at their desks during a lesson',
    position: '50% 40%',
  },
  senior: {
    artwork: '/artwork/senior.svg',
    src: '/photography/senior-laboratory.jpg',
    sourceUrl: 'https://www.pexels.com/photo/8471835/',
    photographer: 'RF._.studio',
    downloadUrl: PEXELS('8471835'),
    alt: 'Senior secondary students carrying out a practical exercise in a science laboratory',
    position: '50% 45%',
  },
  teaching: {
    artwork: '/artwork/teaching.svg',
    src: '/photography/teacher-guidance.jpg',
    sourceUrl: 'https://www.pexels.com/photo/8617542/',
    photographer: 'Kampus Production',
    downloadUrl: PEXELS('8617542'),
    alt: 'A teacher explaining written work to a student at a desk',
    position: '50% 40%',
  },
  digital: {
    artwork: '/artwork/digital.svg',
    src: '/photography/digital-learning.jpg',
    sourceUrl: 'https://www.pexels.com/photo/5905445/',
    photographer: 'Katerina Holmes',
    downloadUrl: PEXELS('5905445'),
    alt: 'Students working at computers during a digital learning session',
    position: '50% 40%',
  },
  schoolLife: {
    artwork: '/artwork/school-life.svg',
    src: '/photography/school-life.jpg',
    sourceUrl: 'https://www.pexels.com/photo/8613089/',
    photographer: 'Kampus Production',
    downloadUrl: PEXELS('8613089'),
    alt: 'Students talking together in a school courtyard between lessons',
    position: '50% 40%',
  },
  admissions: {
    artwork: '/artwork/admissions.svg',
    src: '/photography/admissions.jpg',
    sourceUrl: 'https://www.pexels.com/photo/8199562/',
    photographer: 'Kampus Production',
    downloadUrl: PEXELS('8199562'),
    alt: 'A parent and a student meeting a member of school staff at a desk',
    position: '50% 35%',
  },
} as const satisfies Record<string, Photograph>;

export type PhotographKey = keyof typeof PHOTOGRAPHY;

/** Credit line shown in the page footer, one entry per photographer used. */
export function photographyCredits(): string[] {
  return Array.from(new Set(Object.values(PHOTOGRAPHY).map((p) => p.photographer))).sort();
}
