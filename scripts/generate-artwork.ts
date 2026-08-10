/**
 * Draws the artwork used across the public site.
 *
 *   npm run art:build
 *
 * These are scenes, not patterns: the school at first light, a classroom, a
 * laboratory, a reading room, a computer room, the assembly ground and the
 * gate. They are drawn here rather than downloaded, so the site owns its
 * imagery outright and depends on no stock library and no network.
 *
 * Two rules hold throughout.
 *
 * People are drawn only as distant, featureless silhouettes. A school site
 * should not carry invented faces, and an illustration that tried to render
 * one would be making a claim about a person who does not exist.
 *
 * Nothing carries text. No sign, board or banner in these scenes says
 * anything, because a legible word in a drawing is a factual claim about the
 * school and every fact here would be invented.
 *
 * Each plate is deterministic. The same key always produces the same drawing,
 * so a rebuild never silently changes the look of a page.
 */
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

const OUT = path.join(process.cwd(), 'public', 'artwork');

const C = {
  night: '#040907',
  ink: '#0A1410',
  inkSoft: '#142019',
  brandDeep: '#0E4335',
  brand: '#17604A',
  brandBright: '#238C69',
  brandPale: '#5FAE8C',
  gold: '#D9B665',
  goldDeep: '#A8842F',
  goldPale: '#F0DCA9',
  ivory: '#F7F4EC',
  ember: '#E39B54',
};

/* ---------------------------------------------------------------- helpers */

type Rand = () => number;

/** Small deterministic generator, so a key always draws the same plate. */
function seeded(seed: number): Rand {
  let state = seed >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 0xffffffff;
  };
}

function hash(text: string): number {
  let value = 2166136261;
  for (let index = 0; index < text.length; index += 1) {
    value ^= text.charCodeAt(index);
    value = Math.imul(value, 16777619);
  }
  return value >>> 0;
}

const n = (value: number): string => value.toFixed(1);
const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;
const pick = <T>(rand: Rand, items: readonly [T, ...T[]]): T =>
  items[Math.min(items.length - 1, Math.floor(rand() * items.length))] ?? items[0];

/** A featureless silhouette. Deliberately abstract, see the file header. */
function figure(x: number, baseY: number, height: number, fill: string, opacity: number): string {
  const head = height * 0.12;
  const shoulder = height * 0.13;
  return `<g fill="${fill}" opacity="${opacity}">
    <circle cx="${n(x)}" cy="${n(baseY - height * 0.87)}" r="${n(head)}"/>
    <path d="M${n(x - shoulder)} ${n(baseY)} L${n(x - shoulder * 0.86)} ${n(baseY - height * 0.5)}
             Q ${n(x)} ${n(baseY - height * 0.8)} ${n(x + shoulder * 0.86)} ${n(baseY - height * 0.5)}
             L${n(x + shoulder)} ${n(baseY)} Z"/>
  </g>`;
}

/** A palm, the tree that actually grows on the ground this school stands on. */
function palm(
  x: number,
  groundY: number,
  height: number,
  lean: number,
  fill: string,
  opacity: number,
): string {
  const topX = x + lean;
  const topY = groundY - height;
  const w = height * 0.02;

  const trunk = `<path d="M${n(x - w)} ${n(groundY)}
      Q ${n(x + lean * 0.3)} ${n(groundY - height * 0.55)} ${n(topX - w * 0.5)} ${n(topY)}
      L ${n(topX + w * 0.5)} ${n(topY)}
      Q ${n(x + lean * 0.3 + w * 1.6)} ${n(groundY - height * 0.55)} ${n(x + w)} ${n(groundY)} Z"
      fill="${fill}" opacity="${opacity}"/>`;

  const fronds = Array.from({ length: 9 }, (_, i) => {
    const angle = ((-168 + i * 19) * Math.PI) / 180;
    const len = height * (0.32 + (i % 3) * 0.07);
    const ex = topX + Math.cos(angle) * len;
    const ey = topY + Math.sin(angle) * len * 0.66;
    const mx = topX + Math.cos(angle) * len * 0.55;
    const my = topY + Math.sin(angle) * len * 0.55 - len * 0.24;
    return `<path d="M${n(topX)} ${n(topY)} Q ${n(mx)} ${n(my)} ${n(ex)} ${n(ey)}"
        fill="none" stroke="${fill}" stroke-width="${n(height * 0.026)}"
        stroke-linecap="round" opacity="${opacity}"/>`;
  }).join('');

  return trunk + fronds;
}

/** Shared defs: grain tile, vignette, and the light wedge used indoors. */
function commonDefs(w: number, h: number): string {
  return `
    <pattern id="grain" width="180" height="180" patternUnits="userSpaceOnUse">
      <rect width="180" height="180" filter="url(#noise)"/>
    </pattern>
    <filter id="noise" x="0" y="0" width="180" height="180">
      <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="3" stitchTiles="stitch"/>
      <feColorMatrix type="saturate" values="0"/>
    </filter>
    <radialGradient id="vignette" cx="0.5" cy="0.46" r="0.78">
      <stop offset="0.45" stop-color="${C.night}" stop-opacity="0"/>
      <stop offset="1" stop-color="${C.night}" stop-opacity="0.62"/>
    </radialGradient>
    <linearGradient id="shaft" x1="0" y1="0" x2="0.4" y2="1">
      <stop offset="0" stop-color="${C.goldPale}" stop-opacity="0.3"/>
      <stop offset="1" stop-color="${C.goldPale}" stop-opacity="0"/>
    </linearGradient>
    <linearGradient id="haze" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="${C.brand}" stop-opacity="0"/>
      <stop offset="1" stop-color="${C.brand}" stop-opacity="0.22"/>
    </linearGradient>
    <clipPath id="frame"><rect width="${w}" height="${h}"/></clipPath>`;
}

/**
 * The grade. Every plate ends with the same vignette and grain, which is what
 * makes seven separate drawings read as one set.
 */
function grade(w: number, h: number): string {
  return `
  <rect width="${w}" height="${h}" fill="url(#vignette)"/>
  <rect width="${w}" height="${h}" fill="url(#grain)" opacity="0.05" style="mix-blend-mode:overlay"/>`;
}

/* ----------------------------------------------------------------- scenes */

interface Scene {
  key: string;
  width: number;
  height: number;
  render: (w: number, h: number, rand: Rand) => { defs: string; body: string };
}

/** The school at first light. The one plate that has to carry the whole site. */
function heroScene(w: number, h: number, rand: Rand) {
  const horizon = h * 0.63;
  const sunX = w * 0.7;
  const sunY = horizon - h * 0.1;

  const clouds = Array.from({ length: 9 }, () => {
    const y = lerp(h * 0.1, horizon - h * 0.05, rand());
    const width = w * (0.14 + rand() * 0.3);
    const x = rand() * (w - width);
    const thickness = 2 + rand() * 7;
    return `<rect x="${n(x)}" y="${n(y)}" width="${n(width)}" height="${n(thickness)}" rx="${n(thickness / 2)}"
        fill="${C.goldPale}" opacity="${(0.05 + rand() * 0.1).toFixed(3)}"/>`;
  }).join('');

  const stars = Array.from({ length: 40 }, () => {
    const y = rand() * h * 0.4;
    return `<circle cx="${n(rand() * w)}" cy="${n(y)}" r="${(0.6 + rand()).toFixed(1)}"
        fill="${C.ivory}" opacity="${(0.1 + rand() * 0.25 * (1 - y / (h * 0.4))).toFixed(3)}"/>`;
  }).join('');

  // Two ridges, the far one paler, which is what puts distance in the picture.
  const ridge = (y: number, amp: number, fill: string, opacity: number) => {
    const steps = 9;
    const points = Array.from({ length: steps + 1 }, (_, i) => {
      const x = (w / steps) * i;
      return `${n(x)} ${n(y - Math.sin(i * 1.7 + amp) * amp - rand() * amp * 0.5)}`;
    }).join(' L ');
    return `<path d="M0 ${n(h)} L 0 ${n(y)} L ${points} L ${n(w)} ${n(h)} Z" fill="${fill}" opacity="${opacity}"/>`;
  };

  // The school block: two storeys, a portico, and a row of lit windows.
  const bx = w * 0.08;
  const by = horizon - h * 0.005;
  const bw = w * 0.38;
  const bh = h * 0.2;
  const storey = bh / 2;

  const windows = Array.from({ length: 2 }, (_, row) =>
    Array.from({ length: 8 }, (_, col) => {
      const ww = bw * 0.072;
      const wh = storey * 0.46;
      const x = bx + bw * 0.05 + col * (bw * 0.113);
      const y = by - bh + row * storey + storey * 0.27;
      const lit = rand() > 0.42;
      return `<rect x="${n(x)}" y="${n(y)}" width="${n(ww)}" height="${n(wh)}"
          fill="${lit ? C.gold : C.brandDeep}" opacity="${lit ? 0.72 : 0.4}"/>`;
    }).join(''),
  ).join('');

  const building = `
    <g>
      <rect x="${n(bx)}" y="${n(by - bh)}" width="${n(bw)}" height="${n(bh)}" fill="${C.night}" opacity="0.94"/>
      <path d="M${n(bx - bw * 0.03)} ${n(by - bh)} L${n(bx + bw * 0.5)} ${n(by - bh - h * 0.035)} L${n(bx + bw * 1.03)} ${n(by - bh)} Z"
            fill="${C.night}" opacity="0.94"/>
      <rect x="${n(bx)}" y="${n(by - bh)}" width="${n(bw)}" height="1.5" fill="${C.gold}" opacity="0.3"/>
      <rect x="${n(bx)}" y="${n(by - storey)}" width="${n(bw)}" height="1" fill="${C.gold}" opacity="0.18"/>
      ${windows}
      <rect x="${n(bx + bw * 0.42)}" y="${n(by - storey * 0.9)}" width="${n(bw * 0.16)}" height="${n(storey * 0.9)}"
            fill="${C.gold}" opacity="0.5"/>
      ${Array.from(
        { length: 5 },
        (_, i) =>
          `<rect x="${n(bx + bw * 0.4 + i * bw * 0.05)}" y="${n(by - storey * 1.05)}" width="2.5" height="${n(storey * 1.05)}" fill="${C.night}"/>`,
      ).join('')}
    </g>`;

  const flagX = bx + bw * 1.16;
  const flag = `
    <g>
      <rect x="${n(flagX)}" y="${n(by - h * 0.26)}" width="2.5" height="${n(h * 0.26)}" fill="${C.night}" opacity="0.9"/>
      <path d="M${n(flagX + 2.5)} ${n(by - h * 0.255)}
               q ${n(w * 0.03)} ${n(h * 0.012)} ${n(w * 0.058)} 0
               l 0 ${n(h * 0.042)}
               q ${n(-w * 0.028)} ${n(h * 0.012)} ${n(-w * 0.058)} 0 Z"
            fill="${C.brandBright}" opacity="0.8"/>
      <path d="M${n(flagX + 2.5)} ${n(by - h * 0.213)}
               q ${n(w * 0.03)} ${n(h * 0.012)} ${n(w * 0.058)} 0
               l 0 ${n(h * 0.02)}
               q ${n(-w * 0.028)} ${n(h * 0.012)} ${n(-w * 0.058)} 0 Z"
            fill="${C.gold}" opacity="0.8"/>
    </g>`;

  const palms = [
    palm(w * 0.87, horizon + h * 0.05, h * 0.34, -w * 0.02, C.night, 0.9),
    palm(w * 0.94, horizon + h * 0.08, h * 0.27, w * 0.015, C.night, 0.85),
    palm(w * 0.62, horizon + h * 0.02, h * 0.22, w * 0.012, C.night, 0.7),
    palm(w * 0.03, horizon + h * 0.1, h * 0.3, w * 0.014, C.night, 0.92),
  ].join('');

  // Walking toward the block, small enough to read as distance not as portraits.
  const people = Array.from({ length: 11 }, () => {
    const t = rand();
    const y = lerp(horizon + h * 0.03, h * 0.94, t * t);
    const height = lerp(h * 0.028, h * 0.1, t * t);
    const x = lerp(w * 0.12, w * 0.95, rand());
    return figure(x, y, height, C.night, 0.85);
  }).join('');

  const rays = Array.from({ length: 5 }, (_, i) => {
    const spread = w * (0.06 + i * 0.055);
    return `<path d="M${n(sunX)} ${n(sunY)} L${n(sunX - spread * 0.7)} ${n(h)} L${n(sunX - spread * 0.7 + w * 0.05)} ${n(h)} Z"
        fill="${C.goldPale}" opacity="${(0.045 - i * 0.006).toFixed(3)}"/>`;
  }).join('');

  return {
    defs: `
      <linearGradient id="sky" x1="0" y1="0" x2="0.15" y2="1">
        <stop offset="0" stop-color="#03110D"/>
        <stop offset="0.4" stop-color="${C.brandDeep}"/>
        <stop offset="0.74" stop-color="#3B6E4C"/>
        <stop offset="0.92" stop-color="${C.goldDeep}"/>
        <stop offset="1" stop-color="${C.ember}"/>
      </linearGradient>
      <radialGradient id="sun" cx="0.5" cy="0.5" r="0.5">
        <stop offset="0" stop-color="${C.goldPale}" stop-opacity="0.95"/>
        <stop offset="0.28" stop-color="${C.gold}" stop-opacity="0.5"/>
        <stop offset="1" stop-color="${C.ember}" stop-opacity="0"/>
      </radialGradient>
      <linearGradient id="ground" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#13251C"/>
        <stop offset="1" stop-color="#050C09"/>
      </linearGradient>`,
    body: `
      <rect width="${w}" height="${n(horizon + 2)}" fill="url(#sky)"/>
      ${stars}
      <circle cx="${n(sunX)}" cy="${n(sunY)}" r="${n(h * 0.4)}" fill="url(#sun)"/>
      <circle cx="${n(sunX)}" cy="${n(sunY)}" r="${n(h * 0.045)}" fill="${C.goldPale}" opacity="0.85"/>
      ${clouds}
      ${ridge(horizon - h * 0.075, h * 0.022, '#0B241B', 0.75)}
      ${ridge(horizon - h * 0.03, h * 0.015, '#071812', 0.85)}
      <rect y="${n(horizon)}" width="${w}" height="${n(h - horizon)}" fill="url(#ground)"/>
      ${rays}
      ${building}
      ${flag}
      ${palms}
      ${people}
      <rect y="${n(horizon)}" width="${w}" height="${n(h - horizon)}" fill="url(#haze)" opacity="0.5"/>`,
  };
}

/** A room drawn in one point perspective. Shared by the interior scenes. */
function room(w: number, h: number, vx: number, vy: number, backHalf: number, backTop: number) {
  const bl = vx - backHalf;
  const br = vx + backHalf;
  const bt = backTop;
  const bb = vy + (vy - backTop) * 0.72;

  return {
    bl,
    br,
    bt,
    bb,
    /** A point on the left wall: t 0 at the viewer, 1 at the back wall. */
    left: (t: number, v: number) => ({
      x: lerp(0, bl, t),
      y: lerp(lerp(0, bt, t), lerp(h, bb, t), v),
    }),
    right: (t: number, v: number) => ({
      x: lerp(w, br, t),
      y: lerp(lerp(0, bt, t), lerp(h, bb, t), v),
    }),
    markup: `
      <rect width="${w}" height="${h}" fill="${C.ink}"/>
      <path d="M0 0 L${n(bl)} ${n(bt)} L${n(br)} ${n(bt)} L${n(w)} 0 Z" fill="${C.night}" opacity="0.9"/>
      <path d="M0 ${n(h)} L${n(bl)} ${n(bb)} L${n(br)} ${n(bb)} L${n(w)} ${n(h)} Z" fill="#0B1712"/>
      <path d="M0 0 L${n(bl)} ${n(bt)} L${n(bl)} ${n(bb)} L0 ${n(h)} Z" fill="#0E1B15"/>
      <path d="M${n(w)} 0 L${n(br)} ${n(bt)} L${n(br)} ${n(bb)} L${n(w)} ${n(h)} Z" fill="#091310"/>
      <rect x="${n(bl)}" y="${n(bt)}" width="${n(br - bl)}" height="${n(bb - bt)}" fill="#101E17"/>`,
  };
}

/** Junior secondary: a classroom, morning light across the desks. */
function juniorScene(w: number, h: number, rand: Rand) {
  const r = room(w, h, w * 0.52, h * 0.5, w * 0.14, h * 0.31);

  /** Where each window sits along the left wall, front to back. */
  const bays: readonly (readonly [number, number])[] = [
    [0.06, 0.28],
    [0.36, 0.56],
    [0.64, 0.84],
  ];

  const windows = bays
    .map(([t1, t2]) => {
      const a = r.left(t1, 0.2);
      const b = r.left(t2, 0.2);
      const c = r.left(t2, 0.62);
      const d = r.left(t1, 0.62);
      const mullion = r.left((t1 + t2) / 2, 0.2);
      const mullionB = r.left((t1 + t2) / 2, 0.62);
      return `<g>
        <path d="M${n(a.x)} ${n(a.y)} L${n(b.x)} ${n(b.y)} L${n(c.x)} ${n(c.y)} L${n(d.x)} ${n(d.y)} Z" fill="${C.goldPale}" opacity="0.5"/>
        <path d="M${n(a.x)} ${n(a.y)} L${n(b.x)} ${n(b.y)} L${n(c.x)} ${n(c.y)} L${n(d.x)} ${n(d.y)} Z" fill="none" stroke="${C.night}" stroke-width="3"/>
        <line x1="${n(mullion.x)}" y1="${n(mullion.y)}" x2="${n(mullionB.x)}" y2="${n(mullionB.y)}" stroke="${C.night}" stroke-width="2.5"/>
      </g>`;
    })
    .join('');

  // The light that falls out of those windows, onto the floor.
  const shafts = bays
    .map(([t1, t2]) => {
      const a = r.left(t1, 0.62);
      const b = r.left(t2, 0.62);
      return `<path d="M${n(a.x)} ${n(a.y)} L${n(b.x)} ${n(b.y)} L${n(b.x + w * 0.3)} ${n(h)} L${n(a.x + w * 0.16)} ${n(h)} Z"
          fill="url(#shaft)" opacity="0.75"/>`;
    })
    .join('');

  const board = `<g>
    <rect x="${n(r.bl + (r.br - r.bl) * 0.12)}" y="${n(r.bt + (r.bb - r.bt) * 0.16)}"
          width="${n((r.br - r.bl) * 0.76)}" height="${n((r.bb - r.bt) * 0.46)}" fill="#071410"/>
    <rect x="${n(r.bl + (r.br - r.bl) * 0.12)}" y="${n(r.bt + (r.bb - r.bt) * 0.16)}"
          width="${n((r.br - r.bl) * 0.76)}" height="${n((r.bb - r.bt) * 0.46)}"
          fill="none" stroke="${C.goldDeep}" stroke-width="2" opacity="0.8"/>
    ${Array.from({ length: 7 }, (_, i) => {
      const y = r.bt + (r.bb - r.bt) * (0.24 + i * 0.05);
      const x = r.bl + (r.br - r.bl) * 0.18;
      const len = (r.br - r.bl) * (0.16 + rand() * 0.46);
      return `<line x1="${n(x)}" y1="${n(y)}" x2="${n(x + len)}" y2="${n(y)}" stroke="${C.ivory}" stroke-width="1.4" opacity="${(0.1 + rand() * 0.18).toFixed(2)}"/>`;
    }).join('')}
  </g>`;

  // Desks in rows, each row smaller and higher than the one in front of it.
  const desks = [0.72, 0.55, 0.36, 0.16]
    .map((d) => {
      const baseY = lerp(h * 0.63, h * 1.02, 1 - d);
      const half = lerp(w * 0.055, w * 0.17, 1 - d);
      const deskH = lerp(h * 0.024, h * 0.07, 1 - d);
      const spread = lerp(w * 0.09, w * 0.3, 1 - d);

      return [-1, 1]
        .map((side) => {
          const cx = r.bl + (r.br - r.bl) / 2 + side * spread;
          return `<g>
            ${figure(cx, baseY - deskH * 0.5, deskH * 3.1, C.night, 0.9)}
            <rect x="${n(cx - half)}" y="${n(baseY - deskH)}" width="${n(half * 2)}" height="${n(deskH * 0.34)}" fill="#1B2C22"/>
            <rect x="${n(cx - half)}" y="${n(baseY - deskH)}" width="${n(half * 2)}" height="2" fill="${C.gold}" opacity="0.45"/>
            <rect x="${n(cx - half * 0.85)}" y="${n(baseY - deskH * 0.66)}" width="${n(deskH * 0.16)}" height="${n(deskH * 0.66)}" fill="#0B1712"/>
            <rect x="${n(cx + half * 0.7)}" y="${n(baseY - deskH * 0.66)}" width="${n(deskH * 0.16)}" height="${n(deskH * 0.66)}" fill="#0B1712"/>
          </g>`;
        })
        .join('');
    })
    .join('');

  return {
    defs: '',
    body: `
      ${r.markup}
      ${board}
      ${windows}
      ${shafts}
      ${figure(r.bl - w * 0.03, r.bb + h * 0.03, h * 0.19, C.night, 0.92)}
      ${desks}
      <rect width="${w}" height="${h}" fill="url(#haze)" opacity="0.35"/>`,
  };
}

/** Senior secondary: the laboratory bench. */
function seniorScene(w: number, h: number, rand: Rand) {
  const r = room(w, h, w * 0.45, h * 0.5, w * 0.2, h * 0.2);
  const benchY = h * 0.79;

  const shelves = Array.from({ length: 3 }, (_, row) => {
    const y = r.bt + (r.bb - r.bt) * (0.2 + row * 0.2);
    const bottles = Array.from({ length: 13 }, (_, i) => {
      const bw = (r.br - r.bl) * (0.028 + rand() * 0.022);
      const bh = (r.bb - r.bt) * (0.07 + rand() * 0.06);
      const x = r.bl + (r.br - r.bl) * 0.08 + i * ((r.br - r.bl) * 0.065);
      return `<rect x="${n(x)}" y="${n(y - bh)}" width="${n(bw)}" height="${n(bh)}" rx="1"
          fill="${pick(rand, [C.brandBright, C.gold, C.brandPale, C.ember])}" opacity="${(0.3 + rand() * 0.4).toFixed(2)}"/>`;
    }).join('');
    return `<g>${bottles}<rect x="${n(r.bl + (r.br - r.bl) * 0.05)}" y="${n(y)}" width="${n((r.br - r.bl) * 0.9)}" height="3" fill="${C.night}"/></g>`;
  }).join('');

  // A benzene ring and an orbit diagram, the two figures every SS science
  // student meets. Geometry only, no lettering.
  const dcx = r.bl + (r.br - r.bl) * 0.5;
  const dcy = r.bt + (r.bb - r.bt) * 0.76;
  const rr = (r.br - r.bl) * 0.075;
  const ring = Array.from({ length: 6 }, (_, i) => {
    const a1 = (i * 60 - 90) * (Math.PI / 180);
    const a2 = ((i + 1) * 60 - 90) * (Math.PI / 180);
    return `<line x1="${n(dcx + Math.cos(a1) * rr)}" y1="${n(dcy + Math.sin(a1) * rr)}"
        x2="${n(dcx + Math.cos(a2) * rr)}" y2="${n(dcy + Math.sin(a2) * rr)}"
        stroke="${C.brandPale}" stroke-width="1.6" opacity="0.55"/>`;
  }).join('');
  const orbits = Array.from({ length: 3 }, (_, i) => {
    const ox = dcx + (r.br - r.bl) * 0.22;
    return `<ellipse cx="${n(ox)}" cy="${n(dcy)}" rx="${n(rr * 1.5)}" ry="${n(rr * 0.5)}"
        fill="none" stroke="${C.gold}" stroke-width="1.3" opacity="0.45"
        transform="rotate(${i * 60} ${n(ox)} ${n(dcy)})"/>`;
  }).join('');

  /* The bench, drawn large and close. This is the picture: the apparatus a
     senior science student actually puts their hands on. */
  const flaskH = h * 0.23;
  const glassware = `
    <g>
      <path d="M${n(w * 0.09)} ${n(benchY)} L${n(w * 0.152)} ${n(benchY - flaskH * 0.62)}
               L${n(w * 0.152)} ${n(benchY - flaskH)} L${n(w * 0.183)} ${n(benchY - flaskH)}
               L${n(w * 0.183)} ${n(benchY - flaskH * 0.62)} L${n(w * 0.245)} ${n(benchY)} Z"
            fill="${C.brandPale}" opacity="0.16" stroke="${C.ivory}" stroke-width="2" stroke-opacity="0.55"/>
      <path d="M${n(w * 0.122)} ${n(benchY - flaskH * 0.28)} L${n(w * 0.213)} ${n(benchY - flaskH * 0.28)}
               L${n(w * 0.245)} ${n(benchY)} L${n(w * 0.09)} ${n(benchY)} Z" fill="${C.brandBright}" opacity="0.55"/>
      <ellipse cx="${n(w * 0.1675)}" cy="${n(benchY - flaskH * 0.28)}" rx="${n(w * 0.0455)}" ry="${n(h * 0.008)}" fill="${C.brandPale}" opacity="0.5"/>

      <rect x="${n(w * 0.3)}" y="${n(benchY - h * 0.155)}" width="${n(w * 0.075)}" height="${n(h * 0.155)}"
            fill="${C.brandPale}" opacity="0.13" stroke="${C.ivory}" stroke-width="1.8" stroke-opacity="0.5"/>
      <rect x="${n(w * 0.3)}" y="${n(benchY - h * 0.07)}" width="${n(w * 0.075)}" height="${n(h * 0.07)}" fill="${C.gold}" opacity="0.5"/>
      ${Array.from(
        { length: 4 },
        (_, i) =>
          `<line x1="${n(w * 0.352)}" y1="${n(benchY - h * (0.03 + i * 0.03))}" x2="${n(w * 0.375)}" y2="${n(benchY - h * (0.03 + i * 0.03))}"
             stroke="${C.ivory}" stroke-width="1.3" opacity="0.4"/>`,
      ).join('')}

      <rect x="${n(w * 0.472)}" y="${n(benchY - h * 0.28)}" width="4" height="${n(h * 0.28)}" fill="#1E2E24"/>
      <rect x="${n(w * 0.435)}" y="${n(benchY - 6)}" width="${n(w * 0.08)}" height="7" rx="2" fill="#1E2E24"/>
      <line x1="${n(w * 0.476)}" y1="${n(benchY - h * 0.185)}" x2="${n(w * 0.545)}" y2="${n(benchY - h * 0.185)}" stroke="#1E2E24" stroke-width="4"/>
      <circle cx="${n(w * 0.575)}" cy="${n(benchY - h * 0.16)}" r="${n(h * 0.05)}"
              fill="${C.brandPale}" opacity="0.14" stroke="${C.ivory}" stroke-width="1.8" stroke-opacity="0.5"/>
      <path d="M${n(w * 0.575 - h * 0.043)} ${n(benchY - h * 0.135)} a ${n(h * 0.05)} ${n(h * 0.05)} 0 0 0 ${n(h * 0.086)} 0 Z"
            fill="${C.ember}" opacity="0.6"/>
      <rect x="${n(w * 0.5665)}" y="${n(benchY - h * 0.228)}" width="${n(h * 0.017)}" height="${n(h * 0.042)}"
            fill="none" stroke="${C.ivory}" stroke-width="1.6" stroke-opacity="0.5"/>
      <ellipse cx="${n(w * 0.575)}" cy="${n(benchY - h * 0.075)}" rx="${n(w * 0.02)}" ry="${n(h * 0.016)}" fill="${C.ember}" opacity="0.5"/>
      <rect x="${n(w * 0.567)}" y="${n(benchY - h * 0.075)}" width="${n(w * 0.016)}" height="${n(h * 0.075)}" fill="#1E2E24"/>

      <g>
        <rect x="${n(w * 0.7)}" y="${n(benchY - h * 0.05)}" width="${n(w * 0.14)}" height="${n(h * 0.05)}" rx="2" fill="#1B2C22"/>
        <rect x="${n(w * 0.7)}" y="${n(benchY - h * 0.05)}" width="${n(w * 0.14)}" height="2" fill="${C.gold}" opacity="0.35"/>
        ${Array.from(
          { length: 5 },
          (_, i) =>
            `<rect x="${n(w * 0.714 + i * w * 0.026)}" y="${n(benchY - h * 0.175)}" width="${n(w * 0.016)}" height="${n(h * 0.13)}" rx="${n(w * 0.008)}"
               fill="${pick(rand, [C.brandBright, C.gold, C.ember, C.brandPale])}" opacity="0.55"
               stroke="${C.ivory}" stroke-width="1.4" stroke-opacity="0.45"/>`,
        ).join('')}
      </g>
    </g>`;

  /* A real window on the right wall, in the same perspective as the room,
     rather than a bright wedge pasted over it. */
  const a = r.right(0.22, 0.16);
  const b = r.right(0.66, 0.16);
  const c = r.right(0.66, 0.66);
  const d = r.right(0.22, 0.66);
  const m1 = r.right(0.44, 0.16);
  const m2 = r.right(0.44, 0.66);
  const window = `
    <g>
      <path d="M${n(a.x)} ${n(a.y)} L${n(b.x)} ${n(b.y)} L${n(c.x)} ${n(c.y)} L${n(d.x)} ${n(d.y)} Z" fill="${C.goldPale}" opacity="0.48"/>
      <path d="M${n(a.x)} ${n(a.y)} L${n(b.x)} ${n(b.y)} L${n(c.x)} ${n(c.y)} L${n(d.x)} ${n(d.y)} Z" fill="none" stroke="${C.night}" stroke-width="4"/>
      <line x1="${n(m1.x)}" y1="${n(m1.y)}" x2="${n(m2.x)}" y2="${n(m2.y)}" stroke="${C.night}" stroke-width="3"/>
      <path d="M${n(d.x)} ${n(d.y)} L${n(c.x)} ${n(c.y)} L${n(c.x - w * 0.34)} ${n(h)} L${n(d.x - w * 0.14)} ${n(h)} Z"
            fill="url(#shaft)" opacity="0.7"/>
    </g>`;

  const stools = [0.3, 0.62]
    .map((t) => {
      const x = r.bl + (r.br - r.bl) * t;
      return `<g fill="#0A1610">
        <ellipse cx="${n(x)}" cy="${n(r.bb + h * 0.06)}" rx="${n(w * 0.028)}" ry="${n(h * 0.011)}"/>
        <rect x="${n(x - 2)}" y="${n(r.bb + h * 0.06)}" width="4" height="${n(h * 0.07)}"/>
      </g>`;
    })
    .join('');

  return {
    defs: '',
    body: `
      ${r.markup}
      ${shelves}
      <g>${ring}${orbits}</g>
      ${window}
      ${stools}
      ${figure(r.bl + (r.br - r.bl) * 0.24, r.bb + h * 0.07, h * 0.22, C.night, 0.9)}
      ${figure(r.bl + (r.br - r.bl) * 0.7, r.bb + h * 0.1, h * 0.25, C.night, 0.88)}
      <rect y="${n(benchY)}" width="${w}" height="${n(h - benchY)}" fill="#16261D"/>
      <rect y="${n(benchY)}" width="${w}" height="3" fill="${C.gold}" opacity="0.45"/>
      ${glassware}
      <rect width="${w}" height="${h}" fill="url(#haze)" opacity="0.3"/>`,
  };
}

/** Teaching: the reading room. */
function teachingScene(w: number, h: number, rand: Rand) {
  const floorY = h * 0.82;

  const shelfWall = Array.from({ length: 5 }, (_, row) => {
    const top = h * 0.1 + row * h * 0.13;
    const height = h * 0.115;
    let x = w * 0.04;
    const spines: string[] = [];
    while (x < w * 0.56) {
      const sw = 8 + rand() * 16;
      const sh = height * (0.72 + rand() * 0.28);
      spines.push(
        `<rect x="${n(x)}" y="${n(top + height - sh)}" width="${n(sw)}" height="${n(sh)}"
           fill="${pick(rand, [C.brand, C.brandDeep, C.goldDeep, C.brandBright, '#5A3A22', '#2C3A2E'])}"
           opacity="${(0.5 + rand() * 0.45).toFixed(2)}"/>`,
      );
      x += sw + 1.6;
    }
    return `<g>${spines.join('')}
      <rect x="${n(w * 0.03)}" y="${n(top + height)}" width="${n(w * 0.545)}" height="4" fill="${C.night}"/>
      <rect x="${n(w * 0.03)}" y="${n(top + height)}" width="${n(w * 0.545)}" height="1" fill="${C.gold}" opacity="0.25"/>
    </g>`;
  }).join('');

  const arches = [0.66, 0.86]
    .map((cx) => {
      const x = w * cx;
      const aw = w * 0.11;
      const top = h * 0.14;
      const bottom = h * 0.66;
      return `<g>
        <path d="M${n(x - aw / 2)} ${n(bottom)} L${n(x - aw / 2)} ${n(top + aw / 2)}
                 A ${n(aw / 2)} ${n(aw / 2)} 0 0 1 ${n(x + aw / 2)} ${n(top + aw / 2)}
                 L${n(x + aw / 2)} ${n(bottom)} Z" fill="${C.goldPale}" opacity="0.4"/>
        <path d="M${n(x - aw / 2)} ${n(bottom)} L${n(x - aw / 2)} ${n(top + aw / 2)}
                 A ${n(aw / 2)} ${n(aw / 2)} 0 0 1 ${n(x + aw / 2)} ${n(top + aw / 2)}
                 L${n(x + aw / 2)} ${n(bottom)} Z" fill="none" stroke="${C.night}" stroke-width="5"/>
        <line x1="${n(x)}" y1="${n(top + 2)}" x2="${n(x)}" y2="${n(bottom)}" stroke="${C.night}" stroke-width="3"/>
        <line x1="${n(x - aw / 2)}" y1="${n(h * 0.36)}" x2="${n(x + aw / 2)}" y2="${n(h * 0.36)}" stroke="${C.night}" stroke-width="3"/>
        <path d="M${n(x - aw / 2)} ${n(bottom)} L${n(x + aw / 2)} ${n(bottom)}
                 L${n(x + aw * 1.5)} ${n(h)} L${n(x - aw * 0.2)} ${n(h)} Z" fill="url(#shaft)" opacity="0.55"/>
      </g>`;
    })
    .join('');

  const lamps = [0.2, 0.45, 0.7]
    .map((cx) => {
      const x = w * cx;
      return `<g>
        <line x1="${n(x)}" y1="${n(floorY - h * 0.14)}" x2="${n(x)}" y2="${n(floorY - h * 0.05)}" stroke="${C.night}" stroke-width="4"/>
        <path d="M${n(x - w * 0.028)} ${n(floorY - h * 0.14)} L${n(x + w * 0.028)} ${n(floorY - h * 0.14)}
                 L${n(x + w * 0.016)} ${n(floorY - h * 0.2)} L${n(x - w * 0.016)} ${n(floorY - h * 0.2)} Z"
              fill="${C.brandDeep}"/>
        <ellipse cx="${n(x)}" cy="${n(floorY - h * 0.135)}" rx="${n(w * 0.055)}" ry="${n(h * 0.05)}" fill="${C.gold}" opacity="0.22"/>
        <ellipse cx="${n(x)}" cy="${n(floorY - h * 0.14)}" rx="${n(w * 0.026)}" ry="${n(h * 0.012)}" fill="${C.goldPale}" opacity="0.65"/>
      </g>`;
    })
    .join('');

  return {
    defs: `
      <linearGradient id="wall" x1="0" y1="0" x2="0.3" y2="1">
        <stop offset="0" stop-color="#101D16"/>
        <stop offset="1" stop-color="${C.night}"/>
      </linearGradient>`,
    body: `
      <rect width="${w}" height="${h}" fill="url(#wall)"/>
      ${shelfWall}
      ${arches}
      <rect y="${n(floorY)}" width="${w}" height="${n(h - floorY)}" fill="#0A1712"/>
      ${figure(w * 0.32, floorY - h * 0.04, h * 0.27, C.night, 0.92)}
      ${figure(w * 0.58, floorY - h * 0.03, h * 0.24, C.night, 0.9)}
      <rect y="${n(floorY - h * 0.05)}" width="${w}" height="${n(h * 0.05)}" fill="#1B2C22"/>
      <rect y="${n(floorY - h * 0.05)}" width="${w}" height="2.5" fill="${C.gold}" opacity="0.4"/>
      ${lamps}
      <rect width="${w}" height="${h}" fill="url(#haze)" opacity="0.28"/>`,
  };
}

/** Digital learning: the computer room, drawn tall. */
function digitalScene(w: number, h: number, rand: Rand) {
  const r = room(w, h, w * 0.5, h * 0.3, w * 0.19, h * 0.1);

  const strips = Array.from({ length: 3 }, (_, i) => {
    const t = 0.2 + i * 0.26;
    const halfFront = w * 0.13;
    const half = lerp(halfFront, (r.br - r.bl) * 0.3, t);
    const y = lerp(h * 0.02, r.bt, t);
    return `<rect x="${n(w * 0.5 - half)}" y="${n(y)}" width="${n(half * 2)}" height="${n(lerp(9, 3, t))}" rx="2"
        fill="${C.goldPale}" opacity="${(0.5 - i * 0.1).toFixed(2)}"/>`;
  }).join('');

  /* Workstations, back to front. Each is drawn as a whole station rather than
     a glowing rectangle: screen, stand, desk, keyboard and the person at it. */
  const station = (cx: number, baseY: number, monW: number, tone: string): string => {
    const monH = monW * 0.6;
    const deskH = monW * 0.16;
    const top = baseY - deskH - monH;
    const lines = Array.from({ length: 5 }, (_, i) => {
      const ly = top + monH * (0.18 + i * 0.15);
      return `<line x1="${n(cx - monW * 0.38)}" y1="${n(ly)}" x2="${n(cx - monW * 0.38 + monW * (0.16 + rand() * 0.58))}" y2="${n(ly)}"
          stroke="${C.ivory}" stroke-width="${n(Math.max(0.9, monH * 0.022))}" opacity="0.42"/>`;
    }).join('');

    return `<g>
      <rect x="${n(cx - monW * 0.95)}" y="${n(baseY - deskH)}" width="${n(monW * 1.9)}" height="${n(deskH)}" fill="#1B2C22"/>
      <rect x="${n(cx - monW * 0.95)}" y="${n(baseY - deskH)}" width="${n(monW * 1.9)}" height="1.8" fill="${C.gold}" opacity="0.35"/>
      <rect x="${n(cx - monW * 0.42)}" y="${n(baseY - deskH - monH * 0.09)}" width="${n(monW * 0.84)}" height="${n(monH * 0.09)}" rx="1.5" fill="#0B1712"/>
      <rect x="${n(cx - monW * 0.08)}" y="${n(top + monH)}" width="${n(monW * 0.16)}" height="${n(monH * 0.11)}" fill="#0B1712"/>
      <rect x="${n(cx - monW * 0.2)}" y="${n(top + monH * 1.09)}" width="${n(monW * 0.4)}" height="${n(monH * 0.045)}" rx="1" fill="#0B1712"/>
      <rect x="${n(cx - monW / 2)}" y="${n(top)}" width="${n(monW)}" height="${n(monH)}" rx="${n(monW * 0.025)}" fill="#060D0A"/>
      <rect x="${n(cx - monW / 2 + monW * 0.045)}" y="${n(top + monH * 0.07)}"
            width="${n(monW * 0.91)}" height="${n(monH * 0.8)}" fill="${tone}" opacity="0.44"/>
      ${lines}
      <rect x="${n(cx - monW * 0.62)}" y="${n(top - monH * 0.06)}" width="${n(monW * 1.24)}" height="${n(monH * 1.12)}"
            fill="${tone}" opacity="0.06"/>
    </g>`;
  };

  /* Seen from the front, so the screens face the viewer and the student behind
     each one shows only as a head above it. Drawn first, so the monitor always
     covers the body: the alternative is a silhouette floating over a desk. */
  const seated = (cx: number, monTop: number, monW: number): string => {
    const rh = monW * 0.135;
    return `<g fill="${C.night}" opacity="0.92">
      <circle cx="${n(cx)}" cy="${n(monTop - rh * 1.05)}" r="${n(rh)}"/>
      <path d="M${n(cx - rh * 2.3)} ${n(monTop + rh)} q ${n(rh * 2.3)} ${n(-rh * 2.5)} ${n(rh * 4.6)} 0 Z"/>
    </g>`;
  };

  const rows = [0.28, 0.52, 0.76, 1]
    .map((t) => {
      const e = Math.pow(t, 1.3);
      const baseY = lerp(h * 0.44, h * 0.98, e);
      const spread = lerp(w * 0.12, w * 0.3, e);
      const monW = lerp(w * 0.085, w * 0.185, e);
      const monTop = baseY - monW * 0.16 - monW * 0.6;

      return [-1, 1]
        .map((side) => {
          const cx = w * 0.5 + side * spread;
          return (
            seated(cx, monTop, monW) +
            station(cx, baseY, monW, pick(rand, [C.brandBright, C.brandPale, C.gold]))
          );
        })
        .join('');
    })
    .join('');

  return {
    defs: '',
    body: `
      ${r.markup}
      ${strips}
      ${Array.from({ length: 4 }, (_, i) => {
        const y = r.bt + (r.bb - r.bt) * (0.22 + i * 0.16);
        return `<line x1="${n(r.bl + (r.br - r.bl) * 0.08)}" y1="${n(y)}" x2="${n(r.bl + (r.br - r.bl) * 0.92)}" y2="${n(y)}"
            stroke="${C.brandBright}" stroke-width="1" opacity="0.13"/>`;
      }).join('')}
      <rect x="${n(r.bl + (r.br - r.bl) * 0.16)}" y="${n(r.bt + (r.bb - r.bt) * 0.14)}"
            width="${n((r.br - r.bl) * 0.68)}" height="${n((r.bb - r.bt) * 0.3)}" fill="${C.brandPale}" opacity="0.1"/>
      <rect x="${n(r.bl + (r.br - r.bl) * 0.16)}" y="${n(r.bt + (r.bb - r.bt) * 0.14)}"
            width="${n((r.br - r.bl) * 0.68)}" height="${n((r.bb - r.bt) * 0.3)}"
            fill="none" stroke="${C.gold}" stroke-width="1.5" opacity="0.35"/>
      ${figure(r.bl - w * 0.03, r.bb + h * 0.05, h * 0.15, C.night, 0.9)}
      ${rows}
      <rect width="${w}" height="${h}" fill="url(#haze)" opacity="0.26"/>`,
  };
}

/** School life: the assembly ground. */
function schoolLifeScene(w: number, h: number, rand: Rand) {
  const horizon = h * 0.46;

  const block = `
    <g opacity="0.85">
      <rect x="${n(w * 0.56)}" y="${n(horizon - h * 0.13)}" width="${n(w * 0.3)}" height="${n(h * 0.13)}" fill="#06110D"/>
      <path d="M${n(w * 0.545)} ${n(horizon - h * 0.13)} L${n(w * 0.71)} ${n(horizon - h * 0.165)} L${n(w * 0.875)} ${n(horizon - h * 0.13)} Z" fill="#06110D"/>
      ${Array.from({ length: 9 }, (_, i) => {
        const lit = rand() > 0.55;
        return `<rect x="${n(w * 0.575 + i * w * 0.031)}" y="${n(horizon - h * 0.1)}" width="${n(w * 0.017)}" height="${n(h * 0.045)}"
            fill="${lit ? C.gold : C.brandDeep}" opacity="${lit ? 0.6 : 0.45}"/>`;
      }).join('')}
    </g>`;

  const flagX = w * 0.46;
  const flag = `
    <g>
      <rect x="${n(flagX)}" y="${n(horizon - h * 0.3)}" width="3" height="${n(h * 0.34)}" fill="#06110D"/>
      <circle cx="${n(flagX + 1.5)}" cy="${n(horizon - h * 0.305)}" r="4" fill="${C.gold}" opacity="0.7"/>
      <path d="M${n(flagX + 3)} ${n(horizon - h * 0.295)} q ${n(w * 0.024)} ${n(h * 0.016)} ${n(w * 0.048)} 0
               l 0 ${n(h * 0.05)} q ${n(-w * 0.024)} ${n(h * 0.016)} ${n(-w * 0.048)} 0 Z" fill="${C.brandBright}" opacity="0.85"/>
      <path d="M${n(flagX + 3)} ${n(horizon - h * 0.245)} q ${n(w * 0.024)} ${n(h * 0.016)} ${n(w * 0.048)} 0
               l 0 ${n(h * 0.026)} q ${n(-w * 0.024)} ${n(h * 0.016)} ${n(-w * 0.048)} 0 Z" fill="${C.gold}" opacity="0.85"/>
    </g>`;

  const goal = `
    <g stroke="#06110D" stroke-width="4" fill="none" opacity="0.8">
      <rect x="${n(w * 0.08)}" y="${n(horizon - h * 0.08)}" width="${n(w * 0.12)}" height="${n(h * 0.08)}"/>
      <line x1="${n(w * 0.08)}" y1="${n(horizon - h * 0.08)}" x2="${n(w * 0.1)}" y2="${n(horizon - h * 0.095)}"/>
      <line x1="${n(w * 0.2)}" y1="${n(horizon - h * 0.08)}" x2="${n(w * 0.22)}" y2="${n(horizon - h * 0.095)}"/>
    </g>`;

  // Assembly, in ranks. Rows nearer the viewer are larger and more spread out.
  const ranks = [0, 1, 2, 3]
    .map((row) => {
      const t = row / 3;
      const y = lerp(horizon + h * 0.09, h * 0.88, t * t);
      const height = lerp(h * 0.035, h * 0.13, t * t);
      const gap = lerp(w * 0.035, w * 0.085, t * t);
      const count = Math.floor(w / gap) - 1;
      const offset = (w - (count - 1) * gap) / 2;
      return Array.from({ length: count }, (_, i) =>
        figure(offset + i * gap + (rand() - 0.5) * gap * 0.25, y, height, C.night, 0.88),
      ).join('');
    })
    .join('');

  const track = `
    <g fill="none" stroke="${C.ivory}" stroke-width="2">
      <path d="M${n(-w * 0.1)} ${n(h * 1.05)} Q ${n(w * 0.5)} ${n(horizon + h * 0.12)} ${n(w * 1.1)} ${n(h * 1.05)}" opacity="0.12"/>
      <path d="M${n(-w * 0.1)} ${n(h * 1.2)} Q ${n(w * 0.5)} ${n(horizon + h * 0.22)} ${n(w * 1.1)} ${n(h * 1.2)}" opacity="0.09"/>
    </g>`;

  return {
    defs: `
      <linearGradient id="sky2" x1="0" y1="0" x2="0.1" y2="1">
        <stop offset="0" stop-color="#062018"/>
        <stop offset="0.5" stop-color="${C.brandDeep}"/>
        <stop offset="0.85" stop-color="#4E7A4C"/>
        <stop offset="1" stop-color="${C.goldDeep}"/>
      </linearGradient>
      <linearGradient id="field" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#16301F"/>
        <stop offset="1" stop-color="#06100B"/>
      </linearGradient>
      <radialGradient id="sun2" cx="0.5" cy="0.5" r="0.5">
        <stop offset="0" stop-color="${C.goldPale}" stop-opacity="0.8"/>
        <stop offset="1" stop-color="${C.gold}" stop-opacity="0"/>
      </radialGradient>`,
    body: `
      <rect width="${w}" height="${n(horizon + 2)}" fill="url(#sky2)"/>
      <circle cx="${n(w * 0.24)}" cy="${n(horizon - h * 0.06)}" r="${n(h * 0.3)}" fill="url(#sun2)"/>
      <rect y="${n(horizon)}" width="${w}" height="${n(h - horizon)}" fill="url(#field)"/>
      ${track}
      ${block}
      ${goal}
      ${palm(w * 0.92, horizon + h * 0.04, h * 0.3, -w * 0.012, C.night, 0.9)}
      ${palm(w * 0.04, horizon + h * 0.03, h * 0.26, w * 0.01, C.night, 0.9)}
      ${palm(w * 0.33, horizon + h * 0.01, h * 0.19, w * 0.008, C.night, 0.7)}
      ${flag}
      ${ranks}
      <rect y="${n(horizon)}" width="${w}" height="${n(h - horizon)}" fill="url(#haze)" opacity="0.45"/>`,
  };
}

/** Admissions: the gate, standing open. */
function admissionsScene(w: number, h: number, rand: Rand) {
  const horizon = h * 0.44;
  const groundY = horizon;
  const pillarTop = h * 0.42;
  const pillarW = w * 0.13;
  const leftX = w * 0.09;
  const rightX = w * 0.78;

  const path = `
    <path d="M${n(w * 0.5 - w * 0.045)} ${n(horizon)} L${n(w * 0.5 + w * 0.045)} ${n(horizon)}
             L${n(w * 1.02)} ${n(h)} L${n(-w * 0.02)} ${n(h)} Z" fill="#1A2A20"/>
    ${Array.from({ length: 9 }, (_, i) => {
      const t = (i + 1) / 10;
      const y = lerp(horizon, h, t * t);
      const half = lerp(w * 0.045, w * 0.52, t * t);
      return `<line x1="${n(w * 0.5 - half)}" y1="${n(y)}" x2="${n(w * 0.5 + half)}" y2="${n(y)}"
          stroke="${C.night}" stroke-width="${n(lerp(1, 4, t))}" opacity="0.35"/>`;
    }).join('')}`;

  /* Masonry, lit down one side by the low sun, so the pillars have a form
     instead of being two dark rectangles. */
  const pillar = (x: number, litSide: number) => `
    <g>
      <rect x="${n(x)}" y="${n(pillarTop)}" width="${n(pillarW)}" height="${n(h - pillarTop)}" fill="url(#stone)"/>
      <rect x="${n(litSide > 0 ? x + pillarW - pillarW * 0.13 : x)}" y="${n(pillarTop)}"
            width="${n(pillarW * 0.13)}" height="${n(h - pillarTop)}" fill="${C.gold}" opacity="0.16"/>
      ${Array.from({ length: 6 }, (_, i) => {
        const y = pillarTop + h * (0.055 + i * 0.075);
        const offset = i % 2 === 0 ? 0 : pillarW * 0.5;
        return `<g stroke="${C.night}" stroke-width="1.6" opacity="0.55">
            <line x1="${n(x)}" y1="${n(y)}" x2="${n(x + pillarW)}" y2="${n(y)}"/>
            <line x1="${n(x + offset)}" y1="${n(y)}" x2="${n(x + offset)}" y2="${n(y + h * 0.075)}"/>
          </g>`;
      }).join('')}
      <rect x="${n(x - pillarW * 0.11)}" y="${n(pillarTop)}" width="${n(pillarW * 1.22)}" height="${n(h * 0.026)}" fill="#16261D"/>
      <rect x="${n(x - pillarW * 0.11)}" y="${n(pillarTop)}" width="${n(pillarW * 1.22)}" height="2" fill="${C.gold}" opacity="0.45"/>
      <rect x="${n(x + pillarW * 0.32)}" y="${n(pillarTop - h * 0.05)}" width="${n(pillarW * 0.36)}" height="${n(h * 0.05)}" fill="#16261D"/>
      <circle cx="${n(x + pillarW * 0.5)}" cy="${n(pillarTop - h * 0.062)}" r="${n(pillarW * 0.7)}" fill="${C.gold}" opacity="0.1"/>
      <circle cx="${n(x + pillarW * 0.5)}" cy="${n(pillarTop - h * 0.062)}" r="${n(pillarW * 0.34)}" fill="${C.gold}" opacity="0.28"/>
      <circle cx="${n(x + pillarW * 0.5)}" cy="${n(pillarTop - h * 0.062)}" r="${n(pillarW * 0.15)}" fill="${C.goldPale}" opacity="0.9"/>
    </g>`;

  /* Both leaves swung inward, which is the point of the picture. Drawn in warm
     iron so they read against the lit path behind them. */
  const leaf = (hingeX: number, dir: number) => {
    const tipX = hingeX + dir * w * 0.075;
    const topHinge = pillarTop + h * 0.03;
    const topTip = pillarTop + h * 0.085;
    const bottomHinge = h * 0.8;
    const bottomTip = h * 0.73;
    const bars = Array.from({ length: 7 }, (_, i) => {
      const t = (i + 1) / 8;
      return `<line x1="${n(lerp(hingeX, tipX, t))}" y1="${n(lerp(topHinge, topTip, t))}"
          x2="${n(lerp(hingeX, tipX, t))}" y2="${n(lerp(bottomHinge, bottomTip, t))}" stroke-width="3"/>
        <circle cx="${n(lerp(hingeX, tipX, t))}" cy="${n(lerp(topHinge, topTip, t))}" r="3.5" fill="#2A3C31" stroke="none"/>`;
    }).join('');
    return `<g stroke="#2A3C31" fill="none">
      <path d="M${n(hingeX)} ${n(topHinge)} L${n(tipX)} ${n(topTip)} L${n(tipX)} ${n(bottomTip)} L${n(hingeX)} ${n(bottomHinge)} Z" stroke-width="5"/>
      <line x1="${n(hingeX)}" y1="${n(lerp(topHinge, bottomHinge, 0.45))}" x2="${n(tipX)}" y2="${n(lerp(topTip, bottomTip, 0.45))}" stroke-width="4"/>
      ${bars}
    </g>`;
  };

  // The arch carries the seed mark, not a word. See the file header.
  const archCx = w * 0.5;
  const archY = pillarTop - h * 0.02;
  const seedR = w * 0.05;
  const arch = `
    <g>
      <path d="M${n(leftX + pillarW)} ${n(archY)} Q ${n(archCx)} ${n(archY - h * 0.075)} ${n(rightX)} ${n(archY)}"
            fill="none" stroke="#16261D" stroke-width="${n(h * 0.013)}"/>
      <path d="M${n(leftX + pillarW)} ${n(archY - h * 0.007)} Q ${n(archCx)} ${n(archY - h * 0.082)} ${n(rightX)} ${n(archY - h * 0.007)}"
            fill="none" stroke="${C.gold}" stroke-width="1.6" opacity="0.5"/>
      <g transform="translate(${n(archCx)} ${n(archY - h * 0.062)})">
        <path d="M0 ${n(-seedR)} C ${n(seedR * 0.85)} ${n(-seedR * 0.34)}, ${n(seedR * 0.85)} ${n(seedR * 0.34)}, 0 ${n(seedR)}
                 C ${n(-seedR * 0.85)} ${n(seedR * 0.34)}, ${n(-seedR * 0.85)} ${n(-seedR * 0.34)}, 0 ${n(-seedR)} Z"
              fill="none" stroke="${C.gold}" stroke-width="2" opacity="0.85"/>
        <circle cx="0" cy="0" r="${n(seedR * 0.17)}" fill="${C.gold}" opacity="0.9"/>
      </g>
    </g>`;

  const clouds = Array.from({ length: 6 }, () => {
    const y = lerp(h * 0.06, horizon - h * 0.04, rand());
    const width = w * (0.2 + rand() * 0.4);
    const x = rand() * (w - width);
    return `<rect x="${n(x)}" y="${n(y)}" width="${n(width)}" height="${(2 + rand() * 5).toFixed(1)}" rx="3"
        fill="${C.goldPale}" opacity="${(0.05 + rand() * 0.09).toFixed(3)}"/>`;
  }).join('');

  return {
    defs: `
      <linearGradient id="sky3" x1="0" y1="0" x2="0.2" y2="1">
        <stop offset="0" stop-color="#05130E"/>
        <stop offset="0.45" stop-color="${C.brandDeep}"/>
        <stop offset="0.8" stop-color="#6B7A45"/>
        <stop offset="1" stop-color="${C.ember}"/>
      </linearGradient>
      <radialGradient id="sun3" cx="0.5" cy="0.5" r="0.5">
        <stop offset="0" stop-color="${C.goldPale}" stop-opacity="0.9"/>
        <stop offset="1" stop-color="${C.ember}" stop-opacity="0"/>
      </radialGradient>
      <linearGradient id="stone" x1="0" y1="0" x2="0.25" y2="1">
        <stop offset="0" stop-color="#22352A"/>
        <stop offset="0.55" stop-color="#14231B"/>
        <stop offset="1" stop-color="#0A1610"/>
      </linearGradient>`,
    body: `
      <rect width="${w}" height="${n(horizon + 2)}" fill="url(#sky3)"/>
      <circle cx="${n(w * 0.5)}" cy="${n(horizon - h * 0.02)}" r="${n(w * 0.42)}" fill="url(#sun3)"/>
      ${clouds}
      <rect y="${n(groundY)}" width="${w}" height="${n(h - groundY)}" fill="#0C1913"/>
      <rect x="${n(w * 0.38)}" y="${n(horizon - h * 0.05)}" width="${n(w * 0.24)}" height="${n(h * 0.05)}" fill="#08130E" opacity="0.8"/>
      ${path}
      ${palm(w * 0.055, groundY + h * 0.02, h * 0.2, w * 0.014, C.night, 0.75)}
      ${palm(w * 0.93, groundY + h * 0.03, h * 0.23, -w * 0.012, C.night, 0.75)}
      ${figure(w * 0.5, h * 0.79, h * 0.15, C.night, 0.9)}
      ${pillar(leftX, 1)}
      ${pillar(rightX, -1)}
      ${leaf(leftX + pillarW, 1)}
      ${leaf(rightX, -1)}
      ${arch}
      <rect y="${n(groundY)}" width="${w}" height="${n(h - groundY)}" fill="url(#haze)" opacity="0.4"/>`,
  };
}

/* ------------------------------------------------------------------ build */

const SCENES: Scene[] = [
  { key: 'hero', width: 1800, height: 1100, render: heroScene },
  { key: 'junior', width: 1400, height: 1000, render: juniorScene },
  { key: 'senior', width: 1400, height: 1000, render: seniorScene },
  { key: 'teaching', width: 1600, height: 900, render: teachingScene },
  { key: 'digital', width: 1000, height: 1220, render: digitalScene },
  { key: 'school-life', width: 1800, height: 1000, render: schoolLifeScene },
  { key: 'admissions', width: 1000, height: 1330, render: admissionsScene },
];

function draw(scene: Scene): string {
  const rand = seeded(hash(scene.key));
  const { width: w, height: h } = scene;
  const { defs, body } = scene.render(w, h, rand);

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" role="presentation" preserveAspectRatio="xMidYMid slice">
  <defs>${commonDefs(w, h)}${defs}</defs>
  <g clip-path="url(#frame)">
${body}
${grade(w, h)}
  </g>
</svg>
`;
}

async function main(): Promise<void> {
  await mkdir(OUT, { recursive: true });

  for (const scene of SCENES) {
    const markup = draw(scene);
    await writeFile(path.join(OUT, `${scene.key}.svg`), markup, 'utf8');
    console.log(
      `  ${scene.key}.svg`.padEnd(22) +
        `${scene.width} by ${scene.height}`.padEnd(16) +
        `${(markup.length / 1024).toFixed(1)} kB`,
    );
  }

  console.log(`\n${SCENES.length} scenes written to public/artwork.`);
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
