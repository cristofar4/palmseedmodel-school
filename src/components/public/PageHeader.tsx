import { Photo, hasPhotograph } from '@/components/media/Photo';
import type { Photograph } from '@/lib/media';

/**
 * Masthead for every inner public page.
 *
 * Where a page has an image of its own it runs alongside the title rather than
 * underneath it, so an inner page opens with a picture instead of a block of
 * dark colour. Pages with nothing to show keep the plain masthead.
 */
export function PageHeader({
  eyebrow,
  title,
  standfirst,
  photo,
}: {
  eyebrow: string;
  title: string;
  standfirst?: string;
  photo?: Photograph;
}) {
  const heading = (
    <div className="w-full px-6 py-16 sm:px-10 lg:py-24 lg:pl-10 lg:pr-14 xl:pl-16">
      <div className="mx-auto max-w-[34rem] lg:mx-0 lg:ml-auto">
        <p className="eyebrow mb-6 text-accent">{eyebrow}</p>
        <h1
          data-vortex-item
          className="text-[clamp(2rem,5vw,3.4rem)] leading-[1.05] tracking-[-0.028em] text-warm"
        >
          {title}
        </h1>
        {standfirst ? (
          <p data-vortex-item className="mt-7 max-w-[52ch] text-[1.0625rem] leading-[1.8] text-warm/60">
            {standfirst}
          </p>
        ) : null}
      </div>
    </div>
  );

  // A masthead beside a holding panel reads as a picture that failed to load,
  // so the plain masthead is used until a real photograph is installed.
  if (!photo || !hasPhotograph(photo)) {
    return (
      <header className="bg-ink text-warm">
        <div className="shell py-20 lg:py-24">
          <div className="max-w-[34rem]">
            <p className="eyebrow mb-6 text-accent">{eyebrow}</p>
            <h1
              data-vortex-item
              className="text-[clamp(2rem,5vw,3.4rem)] leading-[1.05] tracking-[-0.028em] text-warm"
            >
              {title}
            </h1>
            {standfirst ? (
              <p
                data-vortex-item
                className="mt-7 max-w-[52ch] text-[1.0625rem] leading-[1.8] text-warm/60"
              >
                {standfirst}
              </p>
            ) : null}
          </div>
        </div>
      </header>
    );
  }

  return (
    <header className="grid bg-ink text-warm lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1fr)]">
      <div className="order-2 flex items-center lg:order-1">{heading}</div>
      <div className="relative order-1 min-h-[34svh] overflow-hidden lg:order-2 lg:min-h-[52svh]">
        <Photo photo={photo} priority sizes="(max-width: 1024px) 100vw, 55vw" />
        <div
          aria-hidden="true"
          className="absolute inset-0 hidden lg:block"
          style={{ background: 'linear-gradient(to right, #10231A 0%, rgba(16,35,26,0.18) 34%, transparent 62%)' }}
        />
      </div>
    </header>
  );
}

/** Body wrapper giving inner pages their measure and vertical rhythm. */
export function Prose({ children }: { children: React.ReactNode }) {
  return (
    <div className="shell py-20 lg:py-28">
      <div className="max-w-[68ch] [&_h2]:mt-14 [&_h2]:text-[1.6rem] [&_h2]:leading-snug [&_h2:first-child]:mt-0 [&_h3]:mt-10 [&_h3]:text-[1.15rem] [&_li]:leading-[1.8] [&_li]:text-ink-600 [&_ol]:mt-5 [&_ol]:list-decimal [&_ol]:space-y-2.5 [&_ol]:pl-5 [&_p]:mt-5 [&_p]:text-[1.0625rem] [&_p]:leading-[1.8] [&_p]:text-ink-600 [&_ul]:mt-5 [&_ul]:list-disc [&_ul]:space-y-2.5 [&_ul]:pl-5">
        {children}
      </div>
    </div>
  );
}
