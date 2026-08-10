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
    return (
      <div
        aria-hidden="true"
        className={`absolute inset-0 overflow-hidden bg-ink ${toneClassName} ${className}`}
      >
        <div
          className="absolute inset-0"
          style={{
            background:
              'radial-gradient(120% 90% at 22% 12%, rgba(229,31,43,0.30) 0%, transparent 58%),' +
              'radial-gradient(90% 70% at 88% 92%, rgba(229,31,43,0.14) 0%, transparent 62%),' +
              'linear-gradient(168deg, #16161A 0%, #0B0B0C 55%, #000000 100%)',
          }}
        />
        {/* Fine rule structure, echoing the editorial grid used across the site. */}
        <div
          className="absolute inset-0 opacity-[0.16]"
          style={{
            backgroundImage:
              'repeating-linear-gradient(90deg, rgba(246,241,234,0.9) 0px, rgba(246,241,234,0.9) 1px, transparent 1px, transparent 88px)',
          }}
        />
      </div>
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
