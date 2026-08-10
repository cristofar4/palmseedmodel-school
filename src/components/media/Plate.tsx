import { Photo } from './Photo';
import type { Photograph } from '@/lib/media';

/**
 * An image given room to be looked at.
 *
 * The previous layout put every image behind a ninety percent dark gradient so
 * that text could sit on top of it, which meant the images might as well not
 * have been there. A Plate is the opposite: the image is the content, it keeps
 * its own frame, and any text sits beside it rather than over it.
 */
export function Plate({
  photo,
  aspect = '4 / 3',
  priority = false,
  sizes = '100vw',
  className = '',
  frame = true,
}: {
  photo: Photograph;
  /** Any CSS aspect-ratio value. */
  aspect?: string;
  priority?: boolean;
  sizes?: string;
  className?: string;
  /** The hairline. Turned off where the image already meets a page edge. */
  frame?: boolean;
}) {
  return (
    <div className={`relative overflow-hidden bg-ink ${className}`} style={{ aspectRatio: aspect }}>
      <Photo photo={photo} priority={priority} sizes={sizes} />
      {frame ? (
        <span aria-hidden="true" className="pointer-events-none absolute inset-0 border border-white/10" />
      ) : null}
    </div>
  );
}

/**
 * A full bleed image band that fills its section edge to edge.
 *
 * Only a short gradient at the foot, enough to seat a caption or a card
 * without washing the picture out.
 */
export function Band({
  photo,
  priority = false,
  sizes = '100vw',
  children,
  className = '',
}: {
  photo: Photograph;
  priority?: boolean;
  sizes?: string;
  children?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`relative isolate overflow-hidden bg-ink ${className}`}>
      <Photo photo={photo} priority={priority} sizes={sizes} />
      <div
        aria-hidden="true"
        className="absolute inset-x-0 bottom-0 h-4/5"
        style={{
          background:
            'linear-gradient(to top, rgba(4,9,7,0.94) 0%, rgba(4,9,7,0.78) 30%, rgba(4,9,7,0.42) 62%, transparent 100%)',
        }}
      />
      {children}
    </div>
  );
}
