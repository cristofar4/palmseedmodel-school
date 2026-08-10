import { Photo, hasPhotograph } from '@/components/media/Photo';
import type { Photograph } from '@/lib/media';

/**
 * A section that is image led when a photograph exists and type led when it
 * does not.
 *
 * The two column arrangement gives half the screen to a picture. That is the
 * right shape for a photograph and the wrong shape for a holding panel, which
 * just reads as an unfinished page. So until the school installs its own
 * photography this collapses to a single editorial column, and it returns to
 * the split on its own the moment the file is saved. No code change either
 * way.
 */
export function FeatureSection({
  photo,
  imageSide,
  tone = 'light',
  children,
}: {
  photo: Photograph;
  /** Which side the picture takes on a wide screen. */
  imageSide: 'left' | 'right';
  tone?: 'light' | 'dark';
  children: React.ReactNode;
}) {
  const ground = tone === 'dark' ? 'bg-ink text-warm' : 'bg-warm';

  if (!hasPhotograph(photo)) {
    return (
      <section className={ground}>
        <div className="shell py-24 lg:py-32">
          <div data-vortex-item className="max-w-[46rem]">
            {children}
          </div>
        </div>
      </section>
    );
  }

  /* The picture leads on a phone whichever side it takes on a wide screen,
     because a screenful of text before the first image reads as a wall. */
  const media = (
    <div
      data-vortex-item
      className={`relative order-1 min-h-[52svh] overflow-hidden bg-ink lg:min-h-[80svh] ${
        imageSide === 'left' ? 'lg:order-1' : 'lg:order-2'
      }`}
    >
      <Photo photo={photo} sizes="(max-width: 1024px) 100vw, 50vw" />
    </div>
  );

  const body = (
    <div
      data-vortex-item
      className={`order-2 flex items-center px-6 py-20 sm:px-10 lg:px-14 xl:px-20 ${
        imageSide === 'left' ? 'lg:order-2' : 'lg:order-1'
      }`}
    >
      <div className="max-w-[34rem]">{children}</div>
    </div>
  );

  return (
    <section className={`grid lg:grid-cols-2 ${ground}`}>
      {media}
      {body}
    </section>
  );
}
