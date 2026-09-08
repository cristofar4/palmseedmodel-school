import { existsSync } from 'node:fs';
import path from 'node:path';
import Image from 'next/image';
import { PHOTOGRAPHY, type Photograph } from '@/lib/media';

/**
 * Formats accepted for an installed photograph, in the order they are tried.
 *
 * The manifest declares one path per slot, but nobody should have to convert a
 * file just to install it. Whatever the school actually has, under the right
 * name, is used. WebP and AVIF come first because they are already compressed
 * better than a JPEG of the same quality.
 */
const EXTENSIONS = ['.avif', '.webp', '.jpg', '.jpeg', '.png'] as const;

/**
 * The file on disk for a declared slot, or null when none has been installed.
 *
 * Resolved once per path and remembered, because this runs during render on
 * the server and the filesystem does not change between requests.
 */
const resolved = new Map<string, string | null>();

function resolveSource(src: string): string | null {
  const cached = resolved.get(src);
  if (cached !== undefined) return cached;

  const withoutExtension = src.replace(/\.[^./]+$/, '');
  const declared = path.extname(src);
  const candidates = declared ? [declared, ...EXTENSIONS] : [...EXTENSIONS];

  let hit: string | null = null;
  for (const extension of candidates) {
    const candidate = `${withoutExtension}${extension}`;
    if (existsSync(path.join(process.cwd(), 'public', candidate.replace(/^\//, '')))) {
      hit = candidate;
      break;
    }
  }

  resolved.set(src, hit);
  return hit;
}

function isPresent(src: string): boolean {
  return resolveSource(src) !== null;
}

/**
 * The slot actually rendered for a declared slot.
 *
 * A slot with no photograph of its own may borrow one from elsewhere in the
 * manifest, declared as `standIn`. The whole borrowed entry is returned, alt
 * text included, because the description has to match the picture a screen
 * reader is being told about rather than the picture this slot is waiting for.
 *
 * Borrowing is one hop. A stand in that has no photograph either falls through
 * to the tonal panel rather than searching further, so the manifest can never
 * chase itself around a loop.
 */
function effective(photo: Photograph): Photograph {
  if (isPresent(photo.src) || !photo.standIn) return photo;

  const borrowed = PHOTOGRAPHY[photo.standIn];
  return isPresent(borrowed.src) ? borrowed : photo;
}

interface PhotoProps {
  photo: Photograph;
  /** Loads eagerly and raises fetch priority. Use for the hero only. */
  priority?: boolean;
  sizes?: string;
  className?: string;
  /** Rendered behind the photograph, and used alone when it is absent. */
  toneClassName?: string;
}

/**
 * Renders a photograph, or a composed brand panel when the file has not been
 * installed.
 *
 * The fallback is a deliberate treatment rather than a grey box, so a build
 * without the photography still looks finished. It carries no text, so it is
 * never mistaken for missing content.
 */
export function Photo({
  photo: declared,
  priority = false,
  sizes = '100vw',
  className = '',
  toneClassName = '',
}: PhotoProps) {
  const photo = effective(declared);
  const installed = resolveSource(photo.src);

  if (installed === null) {
    /* Original artwork, drawn by scripts/generate-artwork.ts and served from
       public/artwork. A plain img rather than next/image because the source is
       an SVG, which the optimiser would only pass through anyway.

       This is a finished image, not a placeholder, so the page is complete
       whether or not photography has been installed. */
    return (
      // next/image cannot optimise an SVG, and turning on dangerouslyAllowSVG
      // to route it through the optimiser would loosen that setting for every
      // image in the project to gain nothing here.
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={photo.artwork}
        alt=""
        aria-hidden="true"
        loading={priority ? 'eager' : 'lazy'}
        fetchPriority={priority ? 'high' : 'auto'}
        decoding="async"
        className={`absolute inset-0 h-full w-full object-cover ${toneClassName} ${className}`}
        style={{ objectPosition: photo.position ?? '50% 50%' }}
      />
    );
  }

  return (
    <Image
      src={installed}
      alt={photo.alt}
      fill
      priority={priority}
      sizes={sizes}
      quality={82}
      className={`object-cover ${className}`}
      style={{ objectPosition: photo.position ?? '50% 50%' }}
    />
  );
}

/**
 * Whether a real photograph has been installed for this slot.
 *
 * Layouts branch on this. A section built around a picture looks unfinished
 * when half of it is a holding panel, so those sections fall back to a type
 * led arrangement until the photograph arrives, and switch back on their own
 * once it does.
 */
export function hasPhotograph(photo: Photograph): boolean {
  return isPresent(effective(photo).src);
}

/** True when at least one photograph is installed, used to decide on credits. */
export function anyPhotographyInstalled(photos: Photograph[]): boolean {
  return photos.some((p) => isPresent(p.src));
}
