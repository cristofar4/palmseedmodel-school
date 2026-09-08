/**
 * Image manifest.
 *
 * Every image slot on the public site is declared here. Nothing is hotlinked:
 * a file either exists under public/ or it does not, and the page adapts.
 *
 * Each slot has two sources, in order of preference.
 *
 *   1. A photograph at `src`, under public/photography. This is what the
 *      school should install: its own pictures of its own building, its own
 *      students and its own staff. Save the file at the exact path and it is
 *      picked up on the next build. No code change, no download step.
 *      `npm run media:check` prints the paths and the sizes to aim for.
 *
 *   2. The original artwork at `artwork`, drawn by scripts/generate-artwork.ts.
 *      Used whenever no photograph is installed. It is a finished illustration
 *      rather than a grey placeholder, so the site is complete either way.
 *
 * The footer states which of the two the page is showing, so a visitor is
 * never left to guess whether an image is a photograph of the real school.
 *
 * The stock entries below are a licensing record for the `npm run media:fetch`
 * route, kept so that anyone using it can check the source and the
 * photographer. They are not a claim that these pictures show Palmseed.
 */

/**
 * The image slots the site has. Declared here rather than derived from the
 * manifest, because Photograph refers to it and deriving would make the type
 * reference itself through its own elements.
 */
export type PhotographKey =
  | 'hero'
  | 'junior'
  | 'senior'
  | 'teaching'
  | 'digital'
  | 'schoolLife'
  | 'admissions';

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
  /**
   * Another slot to borrow from while this one has no photograph of its own.
   *
   * The alternative is an empty hero, and a school's landing page should not
   * open on a colour field when there are usable photographs a scroll further
   * down. The borrowed image keeps its own alt text, because the description
   * has to match the picture a screen reader is actually being told about,
   * not the picture this slot is waiting for.
   */
  standIn?: PhotographKey;
}

const PEXELS = (id: string, size = 1920) =>
  `https://images.pexels.com/photos/${id}/pexels-photo-${id}.jpeg?auto=compress&cs=tinysrgb&w=${size}`;

export const PHOTOGRAPHY = {
  hero: {
    /* Borrows the teaching photograph until an exterior of the school arrives.
       That one is the widest of the set, so it survives the hero crop, and it
       is the least seen elsewhere. */
    standIn: 'teaching',
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
    /* Borrows the laboratory photograph until a courtyard shot arrives. */
    standIn: 'senior',
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
} as const satisfies Record<PhotographKey, Photograph>;


/** Credit line shown in the page footer, one entry per photographer used. */
export function photographyCredits(): string[] {
  return Array.from(new Set(Object.values(PHOTOGRAPHY).map((p) => p.photographer))).sort();
}

/**
 * The footer line used when photographs are installed that did not come from
 * the stock manifest above, which is the normal case once the school has
 * supplied its own files.
 *
 * It deliberately claims nothing about who is pictured. The school knows the
 * provenance of its own images and this build does not, so the wording states
 * only what is certain. Two cases need it changed by hand:
 *
 *   - If these are genuine photographs of Palmseed students or staff, say so,
 *     and make sure written consent is held for every identifiable person.
 *   - If they were generated rather than taken, say that too. Presenting a
 *     generated image as a photograph of a real school misleads families, and
 *     the disclosure belongs on the page rather than in a commit message.
 */
export const PHOTOGRAPHY_NOTE =
  'Photographs on this website are used for illustration. They are not a record of any named individual.';
