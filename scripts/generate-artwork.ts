/**
 * Draws the tonal panels that stand in for photographs.
 *
 *   npm run art:build
 *
 * These are not pictures of anything. They are light studies: a graduated
 * field, one directional source, a fine rule structure and a little grain.
 * Nothing in them depicts a building, a room or a person.
 *
 * That is deliberate. An illustration of a school is a drawing of a place that
 * does not exist, and it reads as a cartoon next to real photography. A tonal
 * panel does not pretend to be a photograph, does not invent anything about
 * the school, and sits under the type without competing with it.
 *
 * Every one of these is temporary. Save a photograph at the matching path in
 * src/lib/media.ts and it replaces the panel on the next build with no code
 * change. `npm run media:check` prints the paths.
 *
 * Each panel is deterministic. The same key always produces the same drawing,
 * so a rebuild never silently changes the look of a page.
 */
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

const OUT = path.join(process.cwd(), 'public', 'artwork');

const C = {
  night: '#080706',
  ink: '#141414',
  inkSoft: '#221F1E',
  brandDeep: '#6E0E12',
  brand: '#A2141A',
  brandBright: '#D21B1F',
  gold: '#F04A4E',
  goldDeep: '#B8322F',
  goldPale: '#FFD9D4',
  ivory: '#F7F5F1',
};

type Rand = () => number;

/** Small deterministic generator, so a key always draws the same panel. */
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

interface Panel {
  key: string;
  width: number;
  height: number;
  /** Where the light comes from, as a fraction of each axis. */
  lightX: number;
  lightY: number;
  /** 0 cool and green, 1 warm and brass. */
  warmth: number;
  /** Degrees. The rule structure and the light band both follow it. */
  angle: number;
}

const PANELS: Panel[] = [
  { key: 'hero', width: 1800, height: 1100, lightX: 0.72, lightY: 0.34, warmth: 0.62, angle: -7 },
  { key: 'junior', width: 1400, height: 1000, lightX: 0.24, lightY: 0.3, warmth: 0.34, angle: 5 },
  { key: 'senior', width: 1400, height: 1000, lightX: 0.78, lightY: 0.42, warmth: 0.55, angle: -4 },
  { key: 'teaching', width: 1600, height: 900, lightX: 0.36, lightY: 0.26, warmth: 0.44, angle: 3 },
  { key: 'digital', width: 1000, height: 1220, lightX: 0.5, lightY: 0.22, warmth: 0.3, angle: -2 },
  { key: 'school-life', width: 1800, height: 1000, lightX: 0.3, lightY: 0.62, warmth: 0.5, angle: 6 },
  { key: 'admissions', width: 1000, height: 1330, lightX: 0.6, lightY: 0.3, warmth: 0.66, angle: -3 },
];

function render(panel: Panel): string {
  const rand = seeded(hash(panel.key));
  const { width: w, height: h, warmth } = panel;
  const lx = w * panel.lightX;
  const ly = h * panel.lightY;

  /* The rule structure. Fine lines on the panel angle, spaced unevenly so it
     reads as drawn rather than as a screen door. */
  let x = -h;
  const rules: string[] = [];
  while (x < w + h) {
    const step = 26 + rand() * 62;
    x += step;
    rules.push(
      `<line x1="${n(x)}" y1="${n(-h * 0.1)}" x2="${n(x)}" y2="${n(h * 1.1)}"
         stroke="${C.ivory}" stroke-width="${(0.6 + rand() * 0.7).toFixed(2)}"
         opacity="${(0.012 + rand() * 0.036).toFixed(3)}"/>`,
    );
  }

  /* Three long bands of light on the same angle, the widest nearest the
     source. This is what gives the panel its direction. */
  const bands = Array.from({ length: 3 }, (_, i) => {
    const y = ly + (i - 1) * h * (0.12 + rand() * 0.1);
    const thickness = h * (0.1 - i * 0.026) * (0.7 + rand() * 0.6);
    return `<rect x="${n(-w * 0.2)}" y="${n(y)}" width="${n(w * 1.4)}" height="${n(Math.max(4, thickness))}"
        fill="url(#beam)" opacity="${(0.5 - i * 0.13).toFixed(2)}"/>`;
  }).join('');

  /* A single soft horizon, well off centre. Enough structure to stop the
     panel reading as flat colour. */
  const horizonY = h * (0.52 + (rand() - 0.5) * 0.22);

  const warmMix = (a: string, b: string) => (warmth > 0.5 ? a : b);

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" role="presentation" preserveAspectRatio="xMidYMid slice">
  <defs>
    <linearGradient id="ground" x1="0" y1="0" x2="${(0.3 + warmth * 0.3).toFixed(2)}" y2="1">
      <stop offset="0" stop-color="${C.inkSoft}"/>
      <stop offset="0.5" stop-color="${C.ink}"/>
      <stop offset="1" stop-color="${C.night}"/>
    </linearGradient>
    <radialGradient id="source" cx="${panel.lightX.toFixed(3)}" cy="${panel.lightY.toFixed(3)}" r="0.82">
      <stop offset="0" stop-color="${warmMix(C.gold, C.brandBright)}" stop-opacity="${(0.24 + warmth * 0.2).toFixed(2)}"/>
      <stop offset="0.32" stop-color="${C.brand}" stop-opacity="0.16"/>
      <stop offset="1" stop-color="${C.brand}" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="beam" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="${C.goldPale}" stop-opacity="0"/>
      <stop offset="0.42" stop-color="${C.goldPale}" stop-opacity="${(0.05 + warmth * 0.07).toFixed(3)}"/>
      <stop offset="0.72" stop-color="${C.goldPale}" stop-opacity="0"/>
    </linearGradient>
    <linearGradient id="horizon" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="${C.goldDeep}" stop-opacity="0"/>
      <stop offset="0.5" stop-color="${warmMix(C.gold, C.brandBright)}" stop-opacity="0.3"/>
      <stop offset="1" stop-color="${C.goldDeep}" stop-opacity="0"/>
    </linearGradient>
    <radialGradient id="vignette" cx="0.5" cy="0.46" r="0.8">
      <stop offset="0.42" stop-color="${C.night}" stop-opacity="0"/>
      <stop offset="1" stop-color="${C.night}" stop-opacity="0.66"/>
    </radialGradient>
    <pattern id="grain" width="180" height="180" patternUnits="userSpaceOnUse">
      <rect width="180" height="180" filter="url(#noise)"/>
    </pattern>
    <filter id="noise" x="0" y="0" width="180" height="180">
      <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="3" stitchTiles="stitch"/>
      <feColorMatrix type="saturate" values="0"/>
    </filter>
    <clipPath id="frame"><rect width="${w}" height="${h}"/></clipPath>
  </defs>

  <g clip-path="url(#frame)">
    <rect width="${w}" height="${h}" fill="url(#ground)"/>
    <rect width="${w}" height="${h}" fill="url(#source)"/>

    <g transform="rotate(${panel.angle} ${n(w / 2)} ${n(h / 2)})">
      ${rules.join('\n      ')}
      ${bands}
      <rect x="${n(-w * 0.2)}" y="${n(horizonY)}" width="${n(w * 1.4)}" height="1.2" fill="url(#horizon)"/>
      <rect x="${n(-w * 0.2)}" y="${n(horizonY + h * 0.055)}" width="${n(w * 1.4)}" height="1" fill="url(#horizon)" opacity="0.5"/>
    </g>

    <circle cx="${n(lx)}" cy="${n(ly)}" r="${n(Math.min(w, h) * 0.03)}" fill="${C.goldPale}" opacity="${(0.06 + warmth * 0.08).toFixed(3)}"/>
    <rect width="${w}" height="${h}" fill="url(#vignette)"/>
    <rect width="${w}" height="${h}" fill="url(#grain)" opacity="0.05" style="mix-blend-mode:overlay"/>
  </g>
</svg>
`;
}

async function main(): Promise<void> {
  await mkdir(OUT, { recursive: true });

  for (const panel of PANELS) {
    const markup = render(panel);
    await writeFile(path.join(OUT, `${panel.key}.svg`), markup, 'utf8');
    console.log(
      `  ${panel.key}.svg`.padEnd(22) +
        `${panel.width} by ${panel.height}`.padEnd(16) +
        `${(markup.length / 1024).toFixed(1)} kB`,
    );
  }

  console.log(
    `\n${PANELS.length} panels written to public/artwork.\n` +
      'These are placeholders. Run npm run media:check for the photograph paths.\n',
  );
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
