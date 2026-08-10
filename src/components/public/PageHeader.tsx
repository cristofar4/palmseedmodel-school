/** Masthead for every inner public page. Keeps the editorial rhythm consistent. */
export function PageHeader({
  eyebrow,
  title,
  standfirst,
}: {
  eyebrow: string;
  title: string;
  standfirst?: string;
}) {
  return (
    <header className="border-b border-ink-100 bg-ink pb-20 pt-20 text-warm lg:pb-24 lg:pt-28">
      <div className="shell">
        <p className="eyebrow mb-6 text-palm-red-soft">{eyebrow}</p>
        <h1
          data-vortex-item
          className="max-w-[20ch] text-[clamp(2.1rem,6vw,3.8rem)] leading-[1.04] tracking-[-0.025em] text-warm"
        >
          {title}
        </h1>
        {standfirst ? (
          <p
            data-vortex-item
            className="mt-7 max-w-[58ch] text-[1.0625rem] leading-[1.8] text-warm/60"
          >
            {standfirst}
          </p>
        ) : null}
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
