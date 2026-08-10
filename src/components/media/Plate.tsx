import { Photo, hasPhotograph } from './Photo';
import type { Photograph } from '@/lib/media';

/**
 * An image given room to be looked at.
 *
 * The previous layout put every image behind a ninety percent dark gradient so
 * that text could sit on top of it, which meant the images might as well not
 * have been there. A Plate is the opposite: the image is the content, it keeps
 * its own frame, and any text sits beside it rather than over it.
 *
 * It renders nothing at all until a real photograph is installed. A framed
 * holding panel beside a column of text looks like a picture that failed to
 * load, and the text reads better at full width than next to one.
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
  if (!hasPhotograph(photo)) return null;

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
 * without washing the picture out. With no photograph installed the band keeps
 * its shape and its type but drops to a plain deep ground, so the section
 * still works and gains the picture later without moving.
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
  const withPhoto = hasPhotograph(photo);

  return (
    <div
      className={`relative isolate overflow-hidden bg-ink ${className}`}
      style={
        withPhoto
          ? undefined
          : {
              backgroundImage:
                'radial-gradient(120% 90% at 22% 12%, rgba(23,96,74,0.5) 0%, rgba(10,20,16,0) 62%), linear-gradient(180deg, #142019 0%, #0A1410 55%, #040907 100%)',
            }
      }
    >
      {withPhoto ? <Photo photo={photo} priority={priority} sizes={sizes} /> : null}
      {withPhoto ? (
        <div
          aria-hidden="true"
          className="absolute inset-x-0 bottom-0 h-4/5"
          style={{
            background:
              'linear-gradient(to top, rgba(4,9,7,0.94) 0%, rgba(4,9,7,0.78) 30%, rgba(4,9,7,0.42) 62%, transparent 100%)',
          }}
        />
      ) : null}
      {children}
    </div>
  );
}
