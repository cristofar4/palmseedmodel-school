/**
 * The parts of the landing page that are claims about the school.
 *
 * The approved design shows a pass rate, a headcount, a staff count, years of
 * operation, a message from the principal and testimonials from parents. Every
 * one of those is a statement of fact, and this build has been given none of
 * them. So they live here as nulls, and each section on the page hides itself
 * until the value is filled in. A pass rate nobody supplied is not a design
 * detail to be sketched in; it is a claim a family will act on.
 *
 * Fill any of these in and the section appears on the next build. Delete a
 * value and the section disappears again. Nothing else has to change.
 *
 * The natural next step is to move these into the settings table so the school
 * can edit them in the administrator area rather than in a file. Until then
 * this is the one place to look.
 */

export interface Figure {
  /** The number as it should be read: "98%", "500+", "40+". */
  value: string;
  label: string;
}

export interface Testimonial {
  quote: string;
  name: string;
  /** "Parent", "Alumnus", "Guardian of a JSS 2 student". */
  relationship: string;
}

export interface PrincipalMessage {
  name: string;
  title: string;
  quote: string;
  /** Path under public/, or null while there is no portrait. */
  portrait: string | null;
}

export interface SchoolProfile {
  /** The band under the hero. Shown only when at least one figure exists. */
  figures: Figure[];
  /** The pull quote beside the figures. */
  strapline: string | null;
  principal: PrincipalMessage | null;
  testimonials: Testimonial[];
  /** Sits above the fold, under the enrolment note. */
  enrolmentNote: string | null;
  /** Opening hours for the contact band, when the school has set them. */
  officeHours: string | null;
}

export const PROFILE: SchoolProfile = {
  /* Example of what belongs here, kept as a comment so the shape is obvious:
       figures: [
         { value: '98%', label: 'Pass rate' },
         { value: '500+', label: 'Students' },
       ],
     Nothing is filled in, because nothing has been supplied. */
  figures: [],
  strapline: null,
  principal: null,
  testimonials: [],
  enrolmentNote: null,
  officeHours: null,
};

/** True when the figures band has anything to show. */
export function hasFigures(): boolean {
  return PROFILE.figures.length > 0;
}
