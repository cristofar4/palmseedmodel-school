/**
 * The gravity field renderer.
 *
 * A 2D canvas painting of a collapsing singularity: a black core, a rotating
 * accretion structure in the school red, white hot shear at the inner edge,
 * and matter streaming inward along spirals. GSAP drives a single `intensity`
 * value from 0 to 1 and back, and everything here is derived from it, so the
 * animation and the painting can never drift apart.
 *
 * 2D canvas rather than WebGL on purpose. The whole field is radial gradients
 * and arcs, which the compositor handles well, and it removes an entire class
 * of context loss and shader compilation failures on mid range Android.
 */

interface Particle {
  /** Polar coordinates around the vortex origin. */
  angle: number;
  radius: number;
  /** Inward speed, scaled by intensity at draw time. */
  fall: number;
  spin: number;
  length: number;
  weight: number;
  hue: number;
}

export interface FieldOptions {
  originX: number;
  originY: number;
  /** Radius at which the field stops having a visible effect. */
  reach: number;
}

const TAU = Math.PI * 2;

export class GravityField {
  private readonly canvas: HTMLCanvasElement;
  private readonly ctx: CanvasRenderingContext2D;
  private particles: Particle[] = [];
  private frame = 0;
  private running = false;
  private clock = 0;
  private lastTime = 0;
  private dpr = 1;

  /** Driven by the GSAP timeline. 0 is dormant, 1 is full collapse. */
  intensity = 0;
  /** Rises at the end, when the page has been swallowed and light escapes. */
  flash = 0;

  private options: FieldOptions;

  constructor(canvas: HTMLCanvasElement, options: FieldOptions) {
    this.canvas = canvas;
    this.options = options;

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

  /** Caps the backing store at 2x so large phones do not shade 9 megapixels. */
  resize(): void {
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);
    const { innerWidth: w, innerHeight: h } = window;

    this.canvas.width = Math.floor(w * this.dpr);
    this.canvas.height = Math.floor(h * this.dpr);
    this.canvas.style.width = `${w}px`;
    this.canvas.style.height = `${h}px`;
  }

  private seed(): void {
    // Particle budget scales with the viewport, so a phone does far less work
    // than a desktop while the field looks equally dense.
    const area = window.innerWidth * window.innerHeight;
    const count = Math.round(Math.min(420, Math.max(120, area / 3600)));

    this.particles = Array.from({ length: count }, () => this.spawn(true));
  }

  private spawn(initial = false): Particle {
    const { reach } = this.options;
    return {
      angle: Math.random() * TAU,
      // On the first fill, spread across the whole reach. Later respawns come
      // from the outer edge, so the stream keeps feeding inward.
      radius: initial ? Math.random() * reach : reach * (0.75 + Math.random() * 0.45),
      fall: 0.55 + Math.random() * 1.5,
      spin: 0.8 + Math.random() * 2.4,
      length: 8 + Math.random() * 46,
      weight: 0.4 + Math.random() * 1.5,
      // Mostly the school red, with a few white hot grains.
      hue: Math.random() < 0.16 ? 1 : 0,
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

    // Delta is clamped so a backgrounded tab does not teleport every particle
    // into the core on the first frame after it returns.
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

    for (const p of this.particles) {
      // Inverse falloff: matter accelerates as it nears the core, which is
      // what gives the stream its whipping motion at the inner edge.
      const proximity = 1 - Math.min(p.radius / this.options.reach, 1);
      const accel = 1 + proximity * proximity * 7;

      p.radius -= p.fall * accel * pull * delta * 2.6;
      p.angle += (p.spin * 0.012 * accel * pull + 0.002) * delta;

      if (p.radius <= 2) Object.assign(p, this.spawn());
    }
  }

  private draw(): void {
    const { ctx, dpr } = this;
    const { originX: ox, originY: oy, reach } = this.options;
    const t = this.intensity;

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);

    if (t <= 0.001 && this.flash <= 0.001) return;

    const coreRadius = 6 + t * reach * 0.17;
    const diskRadius = coreRadius * (2.6 + t * 1.5);

    ctx.save();
    ctx.translate(ox, oy);

    /* 1. Gravitational well. A wide, soft darkening that reads as space being
          pulled in, sitting under everything else. */
    const well = ctx.createRadialGradient(0, 0, coreRadius * 0.5, 0, 0, reach * (0.55 + t * 0.5));
    well.addColorStop(0, `rgba(0,0,0,${0.96 * t})`);
    well.addColorStop(0.22, `rgba(6,4,5,${0.82 * t})`);
    well.addColorStop(0.55, `rgba(11,11,12,${0.4 * t})`);
    well.addColorStop(1, 'rgba(11,11,12,0)');
    ctx.fillStyle = well;
    ctx.beginPath();
    ctx.arc(0, 0, reach * (0.55 + t * 0.5), 0, TAU);
    ctx.fill();

    /* 2. Matter streams. Drawn as tapered arcs along the direction of travel,
          which reads as motion blur without costing a blur filter. */
    ctx.globalCompositeOperation = 'lighter';
    for (const p of this.particles) {
      if (p.radius > reach) continue;

      const proximity = 1 - Math.min(p.radius / reach, 1);
      const alpha = Math.min(1, proximity * 1.5) * t * 0.85;
      if (alpha < 0.012) continue;

      const trail = (p.length * (0.35 + proximity * 1.5) * t) / Math.max(p.radius, 12);
      const x1 = Math.cos(p.angle) * p.radius;
      const y1 = Math.sin(p.angle) * p.radius;
      const x2 = Math.cos(p.angle - trail) * (p.radius + p.length * proximity * 0.9);
      const y2 = Math.sin(p.angle - trail) * (p.radius + p.length * proximity * 0.9);

      const streak = ctx.createLinearGradient(x1, y1, x2, y2);
      if (p.hue === 1) {
        streak.addColorStop(0, `rgba(255,248,246,${alpha})`);
        streak.addColorStop(1, 'rgba(255,240,236,0)');
      } else {
        streak.addColorStop(0, `rgba(255,${90 + proximity * 140},${70 + proximity * 90},${alpha})`);
        streak.addColorStop(1, 'rgba(229,31,43,0)');
      }

      ctx.strokeStyle = streak;
      ctx.lineWidth = p.weight * (0.6 + proximity * 2.1);
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();
    }

    /* 3. Accretion rings. Three ellipses at different tilts and speeds, so the
          structure reads as three dimensional rather than as flat circles. */
    const rings = [
      { r: diskRadius * 1.00, squash: 0.30, speed: 0.020, width: 2.6, alpha: 0.95 },
      { r: diskRadius * 1.42, squash: 0.16, speed: -0.013, width: 1.7, alpha: 0.62 },
      { r: diskRadius * 1.94, squash: 0.44, speed: 0.008, width: 1.1, alpha: 0.36 },
    ];

    for (const ring of rings) {
      const spin = this.clock * ring.speed;
      ctx.save();
      ctx.rotate(spin);
      ctx.scale(1, ring.squash);

      const glow = ctx.createRadialGradient(0, 0, ring.r * 0.72, 0, 0, ring.r * 1.12);
      glow.addColorStop(0, 'rgba(229,31,43,0)');
      glow.addColorStop(0.55, `rgba(255,120,110,${ring.alpha * t * 0.5})`);
      glow.addColorStop(0.8, `rgba(255,236,232,${ring.alpha * t * 0.85})`);
      glow.addColorStop(1, 'rgba(229,31,43,0)');

      ctx.strokeStyle = glow;
      ctx.lineWidth = ring.width * (1 + t * 2.4);
      ctx.beginPath();
      ctx.arc(0, 0, ring.r, 0, TAU);
      ctx.stroke();
      ctx.restore();
    }

    /* 4. Shear at the inner edge, the hottest part of the field. */
    const shear = ctx.createRadialGradient(0, 0, coreRadius * 0.94, 0, 0, coreRadius * 1.9);
    shear.addColorStop(0, `rgba(255,255,255,${0.9 * t})`);
    shear.addColorStop(0.35, `rgba(255,140,120,${0.55 * t})`);
    shear.addColorStop(1, 'rgba(229,31,43,0)');
    ctx.fillStyle = shear;
    ctx.beginPath();
    ctx.arc(0, 0, coreRadius * 1.9, 0, TAU);
    ctx.fill();

    /* 5. The core. Painted last and opaque, so nothing survives inside it. */
    ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = '#000000';
    ctx.beginPath();
    ctx.arc(0, 0, coreRadius, 0, TAU);
    ctx.fill();

    // A thin bright rim keeps the core edge crisp against the disk.
    ctx.strokeStyle = `rgba(255,214,208,${0.5 * t})`;
    ctx.lineWidth = 1 + t;
    ctx.beginPath();
    ctx.arc(0, 0, coreRadius, 0, TAU);
    ctx.stroke();

    /* 6. Release flash, used as the authentication panel opens out. */
    if (this.flash > 0.001) {
      const burst = ctx.createRadialGradient(0, 0, 0, 0, 0, reach * 0.9 * this.flash);
      burst.addColorStop(0, `rgba(255,255,255,${0.85 * this.flash})`);
      burst.addColorStop(0.4, `rgba(255,120,110,${0.35 * this.flash})`);
      burst.addColorStop(1, 'rgba(229,31,43,0)');
      ctx.globalCompositeOperation = 'lighter';
      ctx.fillStyle = burst;
      ctx.beginPath();
      ctx.arc(0, 0, reach * 0.9 * this.flash, 0, TAU);
      ctx.fill();
    }

    ctx.restore();
  }
}
