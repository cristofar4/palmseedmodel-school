'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { gsap } from 'gsap';
import { GravityField } from './field';

export type AuthMode = 'signin' | 'signup';

interface VortexApi {
  /** Opens the authentication experience out of the element that was tapped. */
  open: (mode: AuthMode, source: HTMLElement | null) => void;
  close: () => void;
  mode: AuthMode | null;
  busy: boolean;
}

const VortexContext = createContext<VortexApi | null>(null);

export function useVortex(): VortexApi {
  const context = useContext(VortexContext);
  if (!context) throw new Error('useVortex must be used inside VortexProvider');
  return context;
}

function prefersReducedMotion(): boolean {
  return (
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
}

/** Elements the field grabs. Nearest ones react first. */
const PULLABLE = '[data-vortex-item]';

interface Grabbed {
  el: HTMLElement;
  distance: number;
  dx: number;
  dy: number;
}

interface VortexProviderProps {
  children: React.ReactNode;
  /**
   * The authentication experience that grows out of the vortex. Supplied by
   * the page so this component stays independent of the sign in forms.
   */
  panel: (mode: AuthMode) => React.ReactNode;
}

/**
 * The gravity transition.
 *
 * A hole punches open where the visitor tapped, everything is drawn into it,
 * and the authentication experience grows back out of the same point.
 *
 * Three decisions carry the performance, and all three are structural rather
 * than tuning:
 *
 * 1. The page is windowed to the viewport before it moves. Scaling the whole
 *    document asks the compositor to rasterise a layer several thousand pixels
 *    tall. The page cannot scroll during the transition, so only one viewport
 *    is ever visible, and clipping to it first makes the animated layer
 *    viewport sized.
 *
 * 2. Nothing inside the page changes while the page itself is moving. A scaled
 *    layer whose contents are static is a texture transform, which costs the
 *    compositor almost nothing. If a child animates at the same time, the
 *    layer has to be rasterised again on every frame. So the elements are
 *    drawn in first, and the collapse begins once they have settled.
 *
 * 3. The authentication forms mount late. Mounting them on the click put a
 *    full React render, style and layout pass into the first frame of the
 *    animation, which measured as a single stall of about a third of a second.
 *    They mount while the page is still collapsing, and are ready well before
 *    they are revealed.
 */
export function VortexProvider({ children, panel }: VortexProviderProps) {
  const [mode, setMode] = useState<AuthMode | null>(null);
  const [busy, setBusy] = useState(false);
  /** Viewport point the collapse started from, so the panel can mount clipped. */
  const [panelOrigin, setPanelOrigin] = useState<{ x: number; y: number } | null>(null);
  /** Gates the heavy form content, see decision 3 above. */
  const [panelMounted, setPanelMounted] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const stageRef = useRef<HTMLDivElement | null>(null);
  const windowRef = useRef<HTMLDivElement | null>(null);
  /** Deep space behind the page, so the hole is not read against ivory. */
  const backdropRef = useRef<HTMLDivElement | null>(null);

  const fieldRef = useRef<GravityField | null>(null);
  const timelineRef = useRef<gsap.core.Timeline | null>(null);
  const returnFocusRef = useRef<HTMLElement | null>(null);
  const runningRef = useRef(false);
  /** Scroll position to restore when the page comes back. */
  const scrollRef = useRef(0);

  useEffect(() => {
    const onResize = () => fieldRef.current?.resize();
    window.addEventListener('resize', onResize);
    window.addEventListener('orientationchange', onResize);
    return () => {
      window.removeEventListener('resize', onResize);
      window.removeEventListener('orientationchange', onResize);
    };
  }, []);

  useEffect(
    () => () => {
      timelineRef.current?.kill();
      fieldRef.current?.stop();
      document.documentElement.classList.remove('vortex-locked');
    },
    [],
  );

  /** Clears every inline style the timeline wrote and unwindows the page. */
  const resetStage = useCallback(() => {
    const stage = stageRef.current;
    const viewportWindow = windowRef.current;

    if (stage) {
      gsap.set(stage, { clearProps: 'all' });
      gsap.set(stage.querySelectorAll<HTMLElement>(PULLABLE), { clearProps: 'all' });
    }
    if (viewportWindow) gsap.set(viewportWindow, { clearProps: 'all' });

    window.scrollTo(0, scrollRef.current);
  }, []);

  const open = useCallback(
    (nextMode: AuthMode, source: HTMLElement | null) => {
      if (runningRef.current || mode !== null) return;
      runningRef.current = true;
      setBusy(true);
      returnFocusRef.current = source;

      const stage = stageRef.current;
      const viewportWindow = windowRef.current;
      const canvas = canvasRef.current;

      // Everything is measured in viewport coordinates, because the page is
      // about to be clipped to the viewport.
      const rect = source?.getBoundingClientRect();
      const originX = rect ? rect.left + rect.width / 2 : window.innerWidth / 2;
      const originY = rect ? rect.top + rect.height / 2 : window.innerHeight / 2;

      const animating = !prefersReducedMotion() && !!stage && !!viewportWindow && !!canvas;
      setPanelOrigin(animating ? { x: originX, y: originY } : null);
      setMode(nextMode);

      if (!animating) {
        setPanelMounted(true);
        document.documentElement.classList.add('vortex-locked');
        document.documentElement.dataset.vortexState = 'open';
        runningRef.current = false;
        setBusy(false);
        return;
      }

      /* Read everything first, then write. Interleaving the two would force a
         synchronous layout for each element in turn. */
      const scrollY = window.scrollY;
      scrollRef.current = scrollY;

      const grabbed: Grabbed[] = Array.from(stage.querySelectorAll<HTMLElement>(PULLABLE))
        .map((el) => {
          const box = el.getBoundingClientRect();
          if (box.bottom < -120 || box.top > window.innerHeight + 120) return null;

          const cx = box.left + box.width / 2;
          const cy = box.top + box.height / 2;
          return {
            el,
            dx: originX - cx,
            dy: originY - cy,
            distance: Math.hypot(originX - cx, originY - cy),
          };
        })
        .filter((item): item is Grabbed => item !== null)
        .sort((a, b) => a.distance - b.distance)
        .slice(0, 22);

      const maxDistance = grabbed.at(-1)?.distance ?? 1;
      const diagonal = Math.hypot(window.innerWidth, window.innerHeight);

      /* Window the page to the viewport. The document keeps its scroll
         position, the stage is lifted by it, and the layer about to be
         transformed is now one screen tall rather than the whole document. */
      document.documentElement.classList.add('vortex-locked');
      gsap.set(viewportWindow, {
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100dvh',
        overflow: 'hidden',
        transformOrigin: `${originX}px ${originY}px`,
        willChange: 'transform',
        force3D: true,
      });
      gsap.set(stage, { y: -scrollY });

      const field = new GravityField(canvas, {
        originX,
        originY,
        reach: Math.hypot(window.innerWidth, window.innerHeight) * 0.62,
      });
      fieldRef.current = field;
      field.start();

      gsap.set(canvas, { autoAlpha: 1 });
      document.documentElement.dataset.vortexState = 'collapsing';

      /* The page is about to shrink away from the edges of the screen. Without
         this the ivory body shows through and the hole reads as a dark shape on
         paper rather than as space. One opacity tween on a solid colour, which
         the compositor handles without a repaint. */
      const backdrop = backdropRef.current;

      const timeline = gsap.timeline({
        defaults: { force3D: true },
        onComplete: () => {
          field.stop();
          gsap.set(canvas, { autoAlpha: 0 });
          gsap.set(viewportWindow, { willChange: 'auto' });
          runningRef.current = false;
          setBusy(false);
          document.documentElement.dataset.vortexState = 'open';
          panelRef.current?.focus();
        },
      });
      timelineRef.current = timeline;

      if (backdrop) timeline.to(backdrop, { autoAlpha: 1, duration: 0.34, ease: 'power2.out' }, 0);

      /* Phase 1, 0 to 0.24s. The hole punches open, wide and immediate. */
      timeline.to(field, { open: 0.9, duration: 0.24, ease: 'power3.out' }, 0);
      timeline.to(field, { intensity: 0.8, duration: 0.28, ease: 'power2.out' }, 0);

      /* Phase 2, 0.08 to 0.6s. Everything nearby is taken first, closest
         soonest. This finishes before the page itself starts to move. */
      grabbed.forEach((item) => {
        const nearness = 1 - item.distance / (maxDistance || 1);
        const angle = (Math.atan2(item.dy, item.dx) * 180) / Math.PI;

        timeline.to(
          item.el,
          {
            x: item.dx * (0.55 + nearness * 0.4),
            y: item.dy * (0.55 + nearness * 0.4),
            rotation: angle * 0.12 + (nearness > 0.5 ? 26 : 12),
            scale: 0.22 + (1 - nearness) * 0.2,
            opacity: 0.08,
            duration: 0.42,
            ease: 'power2.in',
          },
          0.08 + (1 - nearness) * 0.16,
        );
      });

      /* Phase 3, 0.6 to 1.24s. The page goes in as one piece.
         Its contents are static by now, so this is a texture transform. */
      timeline.to(
        viewportWindow,
        { rotation: 46, scale: 0.015, duration: 0.64, ease: 'power2.in' },
        0.6,
      );
      timeline.to(field, { intensity: 1, duration: 0.45, ease: 'power2.in' }, 0.62);

      /* The forms mount here, while the page is still collapsing and nothing
         is waiting on them. */
      timeline.call(() => setPanelMounted(true), undefined, 0.72);

      /* Phase 4, 1.2 to 1.5s. Nothing is left outside, so the core implodes. */
      timeline.set(viewportWindow, { autoAlpha: 0 }, 1.24);
      timeline.to(field, { open: 0.1, duration: 0.26, ease: 'power3.in' }, 1.2);
      timeline.to(field, { intensity: 0.12, duration: 0.26, ease: 'power2.out' }, 1.2);
      timeline.to(field, { flash: 1, duration: 0.14, ease: 'power2.out' }, 1.36);
      timeline.to(field, { flash: 0, duration: 0.34, ease: 'power2.in' }, 1.5);

      /* Phase 5, 1.44s. The panel grows out of the same point.
         panelRef is empty when the timeline is built, because React has not
         rendered the host yet, so the reveal is issued from a callback. */
      timeline.call(
        () => {
          const panel = panelRef.current;
          if (!panel) return;
          gsap.to(panel, {
            clipPath: `circle(${diagonal * 1.2}px at ${originX}px ${originY}px)`,
            duration: 0.42,
            ease: 'power2.out',
          });
        },
        undefined,
        1.44,
      );

      timeline.to(field, { open: 0, intensity: 0, duration: 0.24, ease: 'power1.out' }, 1.62);
    },
    [mode],
  );

  const close = useCallback(() => {
    // Closing during the tail of the opening run must still work, so that run
    // is cut short rather than ignored.
    if (runningRef.current) {
      timelineRef.current?.kill();
      fieldRef.current?.stop();
      runningRef.current = false;
    }

    const viewportWindow = windowRef.current;
    const stage = stageRef.current;
    const panel = panelRef.current;

    const finish = () => {
      document.documentElement.classList.remove('vortex-locked');
      delete document.documentElement.dataset.vortexState;
      setPanelOrigin(null);
      setPanelMounted(false);
      resetStage();
      setMode(null);
      runningRef.current = false;
      setBusy(false);
      fieldRef.current?.stop();
      fieldRef.current = null;
      if (canvasRef.current) gsap.set(canvasRef.current, { autoAlpha: 0 });
      if (backdropRef.current) gsap.set(backdropRef.current, { autoAlpha: 0 });
      returnFocusRef.current?.focus();
    };

    if (prefersReducedMotion() || !viewportWindow || !stage || !panel) {
      finish();
      return;
    }

    runningRef.current = true;
    setBusy(true);
    document.documentElement.dataset.vortexState = 'closing';

    // The way back is shorter than the way in. Returning should feel like a
    // release, not a second event.
    const timeline = gsap.timeline({ onComplete: finish });
    timelineRef.current = timeline;

    timeline.to(panel, { autoAlpha: 0, duration: 0.2, ease: 'power2.in' }, 0);
    if (backdropRef.current) {
      timeline.to(backdropRef.current, { autoAlpha: 0, duration: 0.4, ease: 'power2.in' }, 0.14);
    }
    timeline.to(
      viewportWindow,
      { autoAlpha: 1, rotation: 0, scale: 1, duration: 0.46, ease: 'power3.out' },
      0.06,
    );
    timeline.to(
      stage.querySelectorAll<HTMLElement>(PULLABLE),
      {
        x: 0,
        y: 0,
        rotation: 0,
        scale: 1,
        opacity: 1,
        duration: 0.38,
        ease: 'power2.out',
        stagger: { amount: 0.14, from: 'end' },
      },
      0.12,
    );
  }, [resetStage]);

  useEffect(() => {
    if (mode === null) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') close();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [mode, close]);

  const api = useMemo<VortexApi>(() => ({ open, close, mode, busy }), [open, close, mode, busy]);

  return (
    <VortexContext.Provider value={api}>
      {/* Deep space. Sits behind the window in paint order, so it is only seen
          once the page has shrunk away from the edges of the screen. */}
      <div
        ref={backdropRef}
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 z-0 bg-[#030705] opacity-0"
      />

      {/* The window. Clipped to the viewport and transformed during the
          collapse, so the compositor never handles a document tall layer. */}
      <div ref={windowRef}>
        <div ref={stageRef}>{children}</div>
      </div>

      <canvas
        ref={canvasRef}
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 z-[80] opacity-0"
      />

      {mode !== null ? (
        <VortexPanelHost panelRef={panelRef} mode={mode} onClose={close} origin={panelOrigin}>
          {panelMounted ? panel(mode) : null}
        </VortexPanelHost>
      ) : null}
    </VortexContext.Provider>
  );
}

function VortexPanelHost({
  panelRef,
  mode,
  onClose,
  children,
  origin,
}: {
  panelRef: React.RefObject<HTMLDivElement | null>;
  mode: AuthMode;
  onClose: () => void;
  children: React.ReactNode;
  /** When set, the panel mounts clipped to nothing at this point. */
  origin: { x: number; y: number } | null;
}) {
  return (
    <div
      ref={panelRef}
      role="dialog"
      aria-modal="true"
      aria-label={mode === 'signin' ? 'Sign in to the Palmseed portal' : 'Create a Palmseed account'}
      tabIndex={-1}
      className="fixed inset-0 z-[90] overflow-y-auto bg-ink outline-none"
      data-vortex-panel={mode}
      style={origin ? { clipPath: `circle(0px at ${origin.x}px ${origin.y}px)` } : undefined}
    >
      {children}
      <button
        type="button"
        onClick={onClose}
        className="fixed right-5 top-5 z-[95] flex h-11 w-11 items-center justify-center rounded-full border border-white/20 text-warm transition hover:border-gold hover:text-gold"
        aria-label="Close and return to the website"
      >
        <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
          <path
            d="M2 2l12 12M14 2L2 14"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
          />
        </svg>
      </button>
    </div>
  );
}
