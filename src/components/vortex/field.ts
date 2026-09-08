/**
 * The gravity well renderer.
 *
 * A hole punches open at the point that was tapped, grows fast and wide, and
 * everything falls into it. Painted on a 2D canvas driven entirely by three
 * numbers the GSAP timeline animates, so the painting and the page collapse
 * can never drift apart.
 *
 * Performance is the whole design here, because a transition that stutters is
 * worse than no transition:
 *
 *  - No gradient is created per particle. The previous version built one
 *    CanvasGradient per streak per frame, which is hundreds of allocations at
 *    60 frames a second and was the main source of jank. Streaks are now solid
 *    strokes with a varying globalAlpha, which the rasteriser handles cheaply.
 *  - Only four radial gradients exist per frame, all centred on the origin.
 *  - Particle budget and device pixel ratio are both capped harder on a phone.
 *  - Nothing here reads layout, so it never forces a reflow.
 */

interface Particle {
  angle: number;
  radius: number;
  fall: number;
  spin: number;
  length: number;
  weight: number;
  /** 0 green, 1 gold, 2 white hot. */
  tone: 0 | 1 | 2;
}

export interface FieldOptions {
  originX: number;
  originY: number;
  /** Radius at which the field stops having a visible effect. */
  reach: number;
}

const TAU = Math.PI * 2;

/* Matching the site palette, as plain channel triples so alpha can vary
   without rebuilding a colour string on every draw. */
const TONE = [
  '30,126,79', // school green
  '216,164,60', // gold
  '250,248,243', // white hot
] as const;

export class GravityField {
  private readonly canvas: HTMLCanvasElement;
  private readonly ctx: CanvasRenderingContext2D;
  private particles: Particle[] = [];
  private frame = 0;
  private running = false;
  private clock = 0;
  private lastTime = 0;
  private dpr = 1;
  private readonly compact: boolean;

  /** How far the hole has punched open, 0 to 1. Drives the core radius. */
  open = 0;
  /** Pull strength on the matter streams, 0 to 1. */
  intensity = 0;
  /** Release flash as the core lets go and the panel arrives. */
  flash = 0;

  private options: FieldOptions;

  constructor(canvas: HTMLCanvasElement, options: FieldOptions) {
    this.canvas = canvas;
    this.options = options;
    this.compact = window.innerWidth < 820;

    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) throw new Error('Canvas 2D is not available');
    this.ctx = ctx;

    this.resize();
    this.seed();
  }

  setOrigin(x: number, y: number): void {
    this.options.originX = x;
    this.options.originY = y;
  }

  /**
   * The field is drawn below native resolution and stretched back up by CSS.
   *
   * Every shape here is a soft radial gradient or a thin streak, so the
   * detail lost is not detail anyone can see, while the pixel count per frame
   * falls by about half. On a full screen effect that is the difference
   * between comfortably holding 60 frames a second and not.
   */
  resize(): void {
    const quality = this.compact ? 0.6 : 0.72;
    this.dpr = Math.min(window.devicePixelRatio || 1, 2) * quality;
    const { innerWidth: w, innerHeight: h } = window;

    this.canvas.width = Math.max(1, Math.floor(w * this.dpr));
    this.canvas.height = Math.max(1, Math.floor(h * this.dpr));
    this.canvas.style.width = `${w}px`;
    this.canvas.style.height = `${h}px`;
  }

  private seed(): void {
    const count = this.compact ? 70 : 120;
    this.particles = Array.from({ length: count }, () => this.spawn(true));
  }

  private spawn(initial = false): Particle {
    const { reach } = this.options;
    const roll = Math.random();

    return {
      angle: Math.random() * TAU,
      radius: initial ? Math.random() * reach : reach * (0.7 + Math.random() * 0.5),
      fall: 0.7 + Math.random() * 1.6,
      spin: 1.0 + Math.random() * 2.6,
      length: 14 + Math.random() * 54,
      weight: 0.5 + Math.random() * 1.8,
      tone: roll < 0.62 ? 0 : roll < 0.92 ? 1 : 2,
    };
  }

  start(): void {
    if (this.running) return;
    this.running = true;
    this.lastTime = performance.now();
    this.frame = requestAnimationFrame(this.tick);
  }

  stop(): void {
    this.running = false;
    if (this.frame) cancelAnimationFrame(this.frame);
    this.frame = 0;
  }

  private tick = (now: number): void => {
    if (!this.running) return;

    // Clamped so a backgrounded tab does not teleport every particle into the
    // core on the first frame after it comes back.
    const delta = Math.min((now - this.lastTime) / 16.667, 3);
    this.lastTime = now;
    this.clock += delta;

    this.update(delta);
    this.draw();

    this.frame = requestAnimationFrame(this.tick);
  };

  private update(delta: number): void {
    const pull = this.intensity;
    if (pull <= 0.001) return;

    const { reach } = this.options;

    for (const p of this.particles) {
      // Inverse falloff, so matter whips as it reaches the inner edge.
      const proximity = 1 - (p.radius < reach ? p.radius / reach : 1);
      const accel = 1 + proximity * proximity * 8;

      p.radius -= p.fall * accel * pull * delta * 3.1;
      p.angle += (p.spin * 0.014 * accel * pull + 0.002) * delta;

      if (p.radius <= 2) Object.assign(p, this.spawn());
    }
  }

  private draw(): void {
    const { ctx, dpr } = this;
    const { originX: ox, originY: oy, reach } = this.options;
    const openness = this.open;

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);

    if (openness <= 0.001 && this.flash <= 0.001) return;

    /* The hole. Opens fast and wide: this is the shape the whole effect is
       built around, so it is generous rather than a polite dot. */
    const core = reach * 0.34 * openness;
    const disk = core * 1.9;

    ctx.save();
    ctx.translate(ox, oy);

    /* 1. The well. A wide darkening that reads as space being drawn in. */
    const wellOuter = reach * (0.5 + openness * 0.75);
    const well = ctx.createRadialGradient(0, 0, core * 0.6, 0, 0, wellOuter);
    well.addColorStop(0, `rgba(0,0,0,${0.97 * openness})`);
    well.addColorStop(0.3, `rgba(4,10,8,${0.8 * openness})`);
    well.addColorStop(0.68, `rgba(16,35,26,${0.32 * openness})`);
    well.addColorStop(1, 'rgba(16,35,26,0)');
    ctx.fillStyle = well;
    ctx.beginPath();
    ctx.arc(0, 0, wellOuter, 0, TAU);
    ctx.fill();

    /* 2. Matter streams. Solid strokes, alpha varied per particle. No gradient
          is allocated in this loop, which is what keeps the frame cheap. */
    ctx.globalCompositeOperation = 'lighter';
    ctx.lineCap = 'round';

    for (const p of this.particles) {
      if (p.radius > reach) continue;

      const proximity = 1 - p.radius / reach;
      const alpha = proximity * proximity * 1.6 * this.intensity;
      if (alpha < 0.015) continue;

      const trail = (p.length * (0.4 + proximity * 1.7)) / (p.radius < 14 ? 14 : p.radius);
      const cosA = Math.cos(p.angle);
      const sinA = Math.sin(p.angle);
      const outer = p.radius + p.length * proximity;

      ctx.globalAlpha = alpha > 1 ? 1 : alpha;
      ctx.strokeStyle = `rgb(${TONE[p.tone]})`;
      ctx.lineWidth = p.weight * (0.5 + proximity * 2.3);

      ctx.beginPath();
      ctx.moveTo(cosA * p.radius, sinA * p.radius);
      ctx.lineTo(Math.cos(p.angle - trail) * outer, Math.sin(p.angle - trail) * outer);
      ctx.stroke();
    }

    ctx.globalAlpha = 1;

    /* 3. Accretion rings. Two tilted ellipses turning at different rates, so
          the structure reads as three dimensional rather than as flat circles. */
    const rings = [
      { r: disk, squash: 0.3, speed: 0.022, width: 3.0, alpha: 1 },
      { r: disk * 1.5, squash: 0.15, speed: -0.014, width: 1.8, alpha: 0.55 },
    ];

    for (const ring of rings) {
      ctx.save();
      ctx.rotate(this.clock * ring.speed);
      ctx.scale(1, ring.squash);

      const glow = ctx.createRadialGradient(0, 0, ring.r * 0.7, 0, 0, ring.r * 1.14);
      glow.addColorStop(0, 'rgba(12,74,46,0)');
      glow.addColorStop(0.5, `rgba(18,96,60,${ring.alpha * openness * 0.55})`);
      glow.addColorStop(0.82, `rgba(216,164,60,${ring.alpha * openness * 0.9})`);
      glow.addColorStop(1, 'rgba(216,164,60,0)');

      ctx.strokeStyle = glow;
      ctx.lineWidth = ring.width * (1 + openness * 2.2);
      ctx.beginPath();
      ctx.arc(0, 0, ring.r, 0, TAU);
      ctx.stroke();
      ctx.restore();
    }

    /* 4. Shear at the inner edge, the hottest part of the field. */
    const shear = ctx.createRadialGradient(0, 0, core * 0.95, 0, 0, core * 1.55);
    shear.addColorStop(0, `rgba(255,250,246,${0.95 * openness})`);
    shear.addColorStop(0.4, `rgba(216,164,60,${0.6 * openness})`);
    shear.addColorStop(1, 'rgba(18,96,60,0)');
    ctx.fillStyle = shear;
    ctx.beginPath();
    ctx.arc(0, 0, core * 1.55, 0, TAU);
    ctx.fill();

    /* 5. The core itself. Opaque and painted last, so nothing survives inside. */
    ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = '#000000';
    ctx.beginPath();
    ctx.arc(0, 0, core, 0, TAU);
    ctx.fill();

    // A thin bright rim keeps the edge of the hole crisp against the disk.
    ctx.strokeStyle = `rgba(255,242,238,${0.7 * openness})`;
    ctx.lineWidth = 1 + openness * 1.6;
    ctx.beginPath();
    ctx.arc(0, 0, core, 0, TAU);
    ctx.stroke();

    /* 6. Release flash, as the core lets go and the panel arrives. */
    if (this.flash > 0.001) {
      const burst = reach * 0.95 * this.flash;
      const glow = ctx.createRadialGradient(0, 0, 0, 0, 0, burst);
      glow.addColorStop(0, `rgba(255,252,245,${0.9 * this.flash})`);
      glow.addColorStop(0.35, `rgba(216,164,60,${0.4 * this.flash})`);
      glow.addColorStop(1, 'rgba(12,74,46,0)');
      ctx.globalCompositeOperation = 'lighter';
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(0, 0, burst, 0, TAU);
      ctx.fill();
    }

    ctx.restore();
  }
}
