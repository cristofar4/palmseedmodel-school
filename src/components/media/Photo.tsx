import { existsSync } from 'node:fs';
import path from 'node:path';
import Image from 'next/image';
import type { Photograph } from '@/lib/media';

/**
 * Whether a declared photograph has actually been downloaded yet.
 *
 * Checked once per path and remembered, because this runs during render on the
 * server and the filesystem does not change between requests.
 */
const presence = new Map<string, boolean>();

function isPresent(src: string): boolean {
  const cached = presence.get(src);
  if (cached !== undefined) return cached;

  const onDisk = existsSync(path.join(process.cwd(), 'public', src.replace(/^\//, '')));
  presence.set(src, onDisk);
  return onDisk;
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
  photo,
  priority = false,
  sizes = '100vw',
  className = '',
  toneClassName = '',
}: PhotoProps) {
  if (!isPresent(photo.src)) {
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
      src={photo.src}
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

/** True when at least one photograph is installed, used to decide on credits. */
export function anyPhotographyInstalled(photos: Photograph[]): boolean {
  return photos.some((p) => isPresent(p.src));
}
