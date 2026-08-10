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
  /** Distance from the vortex origin, in viewport pixels. */
  distance: number;
  dx: number;
  dy: number;
}

interface VortexProviderProps {
  children: React.ReactNode;
  /**
   * The authentication experience that grows out of the vortex. Supplied by
   * the page so this component stays independent of the sign in forms.
   *
   * It receives the mode only. Anything inside that needs to dismiss the panel
   * reads `close` from the context, which keeps this render free of a callback
   * that touches refs.
   */
  panel: (mode: AuthMode) => React.ReactNode;
}

export function VortexProvider({ children, panel }: VortexProviderProps) {
  const [mode, setMode] = useState<AuthMode | null>(null);
  const [busy, setBusy] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const stageRef = useRef<HTMLDivElement | null>(null);
  const clipRef = useRef<HTMLDivElement | null>(null);

  const fieldRef = useRef<GravityField | null>(null);
  const timelineRef = useRef<gsap.core.Timeline | null>(null);
  const returnFocusRef = useRef<HTMLElement | null>(null);
  // Guards against a second tap while a transition is already running.
  const runningRef = useRef(false);

  /* Resize handling keeps the canvas backing store correct on rotation. */
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

  /** Clears every inline style the timeline wrote. */
  const resetStage = useCallback(() => {
    const stage = stageRef.current;
    const clip = clipRef.current;

    if (stage) {
      gsap.set(stage, { clearProps: 'all' });
      const items = stage.querySelectorAll<HTMLElement>(PULLABLE);
      gsap.set(items, { clearProps: 'all' });
    }
    if (clip) gsap.set(clip, { clearProps: 'all' });
  }, []);

  const open = useCallback(
    (nextMode: AuthMode, source: HTMLElement | null) => {
      if (runningRef.current || mode !== null) return;
      runningRef.current = true;
      setBusy(true);
      returnFocusRef.current = source;

      const stage = stageRef.current;
      const clip = clipRef.current;
      const canvas = canvasRef.current;

      /* Origin of the collapse.
         Viewport coordinates drive the canvas, which is fixed. Page
         coordinates drive the clip path and the transform origin, because the
         stage sits in the document flow and scrolls with it. */
      const rect = source?.getBoundingClientRect();
      const viewportX = rect ? rect.left + rect.width / 2 : window.innerWidth / 2;
      const viewportY = rect ? rect.top + rect.height / 2 : window.innerHeight / 2;
      const pageX = viewportX + window.scrollX;
      const pageY = viewportY + window.scrollY;

      setMode(nextMode);

      // Reduced motion: no collapse, no field. Just present the panel.
      if (prefersReducedMotion() || !stage || !clip || !canvas) {
        if (panelRef.current) {
          gsap.fromTo(
            panelRef.current,
            { autoAlpha: 0 },
            { autoAlpha: 1, duration: 0.2, ease: 'none' },
          );
        }
        document.documentElement.classList.add('vortex-locked');
        document.documentElement.dataset.vortexState = 'open';
        runningRef.current = false;
        setBusy(false);
        return;
      }

      document.documentElement.classList.add('vortex-locked');

      const field = new GravityField(canvas, {
        originX: viewportX,
        originY: viewportY,
        reach: Math.hypot(window.innerWidth, window.innerHeight) * 0.62,
      });
      fieldRef.current = field;
      field.start();

      /* Measure everything the field can grab, and order it by distance so the
         closest elements begin to deform first. */
      const grabbed: Grabbed[] = Array.from(
        stage.querySelectorAll<HTMLElement>(PULLABLE),
      )
        .map((el) => {
          const box = el.getBoundingClientRect();
          // Skip anything scrolled well outside the viewport: it cannot be seen
          // bending, and animating it wastes frames.
          if (box.bottom < -200 || box.top > window.innerHeight + 200) return null;

          const cx = box.left + box.width / 2;
          const cy = box.top + box.height / 2;
          return {
            el,
            dx: viewportX - cx,
            dy: viewportY - cy,
            distance: Math.hypot(viewportX - cx, viewportY - cy),
          };
        })
        .filter((item): item is Grabbed => item !== null)
        .sort((a, b) => a.distance - b.distance)
        .slice(0, 44);

      const maxDistance = grabbed.at(-1)?.distance ?? 1;
      const diagonal = Math.hypot(window.innerWidth, window.innerHeight);

      gsap.set(canvas, { autoAlpha: 1 });
      gsap.set(stage, {
        transformOrigin: `${pageX}px ${pageY}px`,
        willChange: 'transform, filter, opacity',
      });
      gsap.set(clip, {
        clipPath: `circle(${diagonal * 1.6}px at ${pageX}px ${pageY}px)`,
      });

      // Published on the document so the state of the transition is observable
      // from outside the component, by CSS and by the end to end tests.
      document.documentElement.dataset.vortexState = 'collapsing';

      const timeline = gsap.timeline({
        onComplete: () => {
          field.stop();
          gsap.set(canvas, { autoAlpha: 0 });
          runningRef.current = false;
          setBusy(false);
          document.documentElement.dataset.vortexState = 'open';
          panelRef.current?.focus();
        },
      });
      timelineRef.current = timeline;

      /* Phase 1. The field forms and the page holds still. */
      timeline.to(field, { intensity: 0.6, duration: 0.34, ease: 'power2.in' }, 0);

      /* Phase 2. Matter bends. Each element is drawn along its own vector to
         the core, stretched along that vector and spun as it goes. */
      grabbed.forEach((item) => {
        const nearness = 1 - item.distance / (maxDistance || 1);
        const delay = 0.16 + (1 - nearness) * 0.42;
        const angle = (Math.atan2(item.dy, item.dx) * 180) / Math.PI;
        const reach = 0.55 + nearness * 0.4;

        timeline.to(
          item.el,
          {
            x: item.dx * reach,
            y: item.dy * reach,
            rotation: angle * 0.16 + (nearness > 0.5 ? 26 : 12),
            skewX: nearness * 20,
            scale: 0.26 + (1 - nearness) * 0.24,
            opacity: 0.12,
            filter: `blur(${1.5 + nearness * 4}px)`,
            duration: 0.78 + (1 - nearness) * 0.2,
            ease: 'power3.in',
          },
          delay,
        );
      });

      /* Phase 3. The whole page follows its own contents in, still visibly
         attached to the core, while the clip path closes around it. */
      timeline.to(
        stage,
        {
          rotation: 34,
          scale: 0.015,
          skewY: 5,
          filter: 'blur(7px) brightness(0.35)',
          duration: 0.92,
          ease: 'power3.inOut',
        },
        0.62,
      );

      timeline.to(
        clip,
        {
          clipPath: `circle(0px at ${pageX}px ${pageY}px)`,
          duration: 0.86,
          ease: 'power3.in',
        },
        0.66,
      );

      timeline.to(field, { intensity: 1, duration: 0.6, ease: 'power2.in' }, 0.72);

      /* Phase 4. Nothing is left outside the core, so it releases and the
         authentication panel grows out of the same point. */
      timeline.to(field, { intensity: 0.22, duration: 0.42, ease: 'power2.out' }, 1.5);
      timeline.to(field, { flash: 1, duration: 0.22, ease: 'power2.out' }, 1.5);
      timeline.to(field, { flash: 0, duration: 0.4, ease: 'power2.in' }, 1.72);

      timeline.fromTo(
        panelRef.current,
        {
          autoAlpha: 1,
          clipPath: `circle(0px at ${viewportX}px ${viewportY}px)`,
        },
        {
          clipPath: `circle(${diagonal * 1.2}px at ${viewportX}px ${viewportY}px)`,
          duration: 0.6,
          ease: 'power3.out',
        },
        1.56,
      );

      timeline.to(field, { intensity: 0, duration: 0.3, ease: 'power1.out' }, 1.9);
    },
    [mode],
  );

  const close = useCallback(() => {
    // Closing during the tail of the opening timeline must still work. The
    // opening run is cut short rather than ignored, otherwise the control
    // would appear dead for the last few hundred milliseconds.
    if (runningRef.current) {
      timelineRef.current?.kill();
      fieldRef.current?.stop();
      runningRef.current = false;
    }

    const stage = stageRef.current;
    const clip = clipRef.current;
    const panel = panelRef.current;

    const finish = () => {
      document.documentElement.classList.remove('vortex-locked');
      delete document.documentElement.dataset.vortexState;
      resetStage();
      setMode(null);
      runningRef.current = false;
      setBusy(false);
      fieldRef.current?.stop();
      fieldRef.current = null;
      if (canvasRef.current) gsap.set(canvasRef.current, { autoAlpha: 0 });
      returnFocusRef.current?.focus();
    };

    if (prefersReducedMotion() || !stage || !clip || !panel) {
      finish();
      return;
    }

    runningRef.current = true;
    setBusy(true);
    document.documentElement.dataset.vortexState = 'closing';

    // The reverse runs at about two thirds of the opening duration. Coming back
    // should feel like a release, not a second event.
    const timeline = gsap.timeline({ onComplete: finish });
    timelineRef.current = timeline;

    timeline.to(panel, { autoAlpha: 0, duration: 0.26, ease: 'power2.in' }, 0);
    timeline.to(clip, { clipPath: 'circle(150% at 50% 50%)', duration: 0.5, ease: 'power2.out' }, 0.1);
    timeline.to(
      stage,
      { rotation: 0, scale: 1, skewY: 0, filter: 'blur(0px) brightness(1)', duration: 0.62, ease: 'power3.out' },
      0.1,
    );
    timeline.to(
      stage.querySelectorAll<HTMLElement>(PULLABLE),
      {
        x: 0,
        y: 0,
        rotation: 0,
        skewX: 0,
        scale: 1,
        opacity: 1,
        filter: 'blur(0px)',
        duration: 0.5,
        ease: 'power2.out',
        stagger: { amount: 0.18, from: 'end' },
      },
      0.18,
    );
  }, [resetStage]);

  /* Escape closes the panel, which is expected of anything modal. */
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
      {/* Clip layer. Never transformed, so the clip circle stays anchored to
          the page coordinates the collapse was measured in. */}
      <div ref={clipRef}>
        <div ref={stageRef}>{children}</div>
      </div>

      <canvas
        ref={canvasRef}
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 z-[80] opacity-0"
      />

      {mode !== null ? (
        <VortexPanelHost panelRef={panelRef} mode={mode} onClose={close}>
          {panel(mode)}
        </VortexPanelHost>
      ) : null}
    </VortexContext.Provider>
  );
}

/**
 * Host for the authentication experience. The forms themselves are injected by
 * the page through VortexPanelSlot, which keeps this file free of any
 * dependency on the authentication UI.
 */
function VortexPanelHost({
  panelRef,
  mode,
  onClose,
  children,
}: {
  panelRef: React.RefObject<HTMLDivElement | null>;
  mode: AuthMode;
  onClose: () => void;
  children: React.ReactNode;
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
    >
      {children}
      <button
        type="button"
        onClick={onClose}
        className="fixed right-5 top-5 z-[95] flex h-11 w-11 items-center justify-center rounded-full border border-white/20 text-warm transition hover:border-palm-red hover:text-palm-red-soft"
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
