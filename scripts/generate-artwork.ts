/**
 * Generates the original artwork used across the public site.
 *
 *   npm run art:build
 *
 * These are drawn here rather than downloaded, so the site owns its imagery
 * outright and nothing depends on a stock library or a network round trip.
 * The language is a seed germinating: an arc horizon, growth rings, a seed
 * form opening, and the fine rule grid used elsewhere in the layout.
 *
 * Each plate is deterministic. The same key always produces the same drawing,
 * so a rebuild never silently changes the look of a page.
 */
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

const OUT = path.join(process.cwd(), 'public', 'artwork');

const PALETTE = {
  ink: '#0A1410',
  inkSoft: '#142019',
  brand: '#17604A',
  brandBright: '#238C69',
  gold: '#D9B665',
  goldDeep: '#A8842F',
  ivory: '#F7F4EC',
};

/** Small deterministic generator, so a key always draws the same plate. */
function seeded(seed: number) {
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

interface Plate {
  key: string;
  width: number;
  height: number;
  /** Where the horizon arc sits, as a fraction of the height. */
  horizon: number;
  /** How much brass is in the mix. */
  warmth: number;
  /** Drawn on top of the rings. */
  motif: 'seed' | 'rings' | 'lattice' | 'arcs' | 'grid';
}

const PLATES: Plate[] = [
  { key: 'hero', width: 1600, height: 1000, horizon: 0.62, warmth: 0.55, motif: 'seed' },
  { key: 'junior', width: 1200, height: 900, horizon: 0.7, warmth: 0.4, motif: 'rings' },
  { key: 'senior', width: 1200, height: 900, horizon: 0.5, warmth: 0.7, motif: 'lattice' },
  { key: 'teaching', width: 1400, height: 800, horizon: 0.58, warmth: 0.35, motif: 'arcs' },
  { key: 'digital', width: 1000, height: 1250, horizon: 0.45, warmth: 0.6, motif: 'grid' },
  { key: 'school-life', width: 1600, height: 900, horizon: 0.66, warmth: 0.45, motif: 'rings' },
  { key: 'admissions', width: 1000, height: 1330, horizon: 0.6, warmth: 0.65, motif: 'seed' },
];

function motifMarkup(plate: Plate, rand: () => number): string {
  const { width: w, height: h } = plate;
  const cx = w * (0.32 + rand() * 0.28);
  const cy = h * plate.horizon;

  switch (plate.motif) {
    case 'seed': {
      // A seed form opening: two mirrored arcs with a shoot rising out of it.
      const r = Math.min(w, h) * 0.17;
      return `
    <g transform="translate(${cx.toFixed(1)} ${cy.toFixed(1)})">
      <path d="M0 ${(-r).toFixed(1)} C ${(r * 0.9).toFixed(1)} ${(-r * 0.35).toFixed(1)}, ${(r * 0.9).toFixed(1)} ${(r * 0.35).toFixed(1)}, 0 ${r.toFixed(1)}
               C ${(-r * 0.9).toFixed(1)} ${(r * 0.35).toFixed(1)}, ${(-r * 0.9).toFixed(1)} ${(-r * 0.35).toFixed(1)}, 0 ${(-r).toFixed(1)} Z"
            fill="none" stroke="${PALETTE.gold}" stroke-width="1.6" opacity="0.85"/>
      <path d="M0 ${r.toFixed(1)} L 0 ${(-r * 2.1).toFixed(1)}" stroke="${PALETTE.brandBright}" stroke-width="1.2" opacity="0.6"/>
      <path d="M0 ${(-r * 1.2).toFixed(1)} C ${(r * 0.7).toFixed(1)} ${(-r * 1.5).toFixed(1)}, ${(r * 0.8).toFixed(1)} ${(-r * 2.1).toFixed(1)}, ${(r * 0.25).toFixed(1)} ${(-r * 2.4).toFixed(1)}"
            fill="none" stroke="${PALETTE.brandBright}" stroke-width="1.2" opacity="0.5"/>
      <circle cx="0" cy="0" r="${(r * 0.16).toFixed(1)}" fill="${PALETTE.gold}" opacity="0.9"/>
    </g>`;
    }

    case 'lattice': {
      // A loose crystalline lattice, for the senior science pages.
      const points = Array.from({ length: 9 }, () => ({
        x: cx + (rand() - 0.5) * w * 0.5,
        y: cy + (rand() - 0.5) * h * 0.45,
      }));
      const edges = points
        .flatMap((a, i) =>
          points.slice(i + 1).map((b) => {
            const distance = Math.hypot(a.x - b.x, a.y - b.y);
            return distance < Math.min(w, h) * 0.3
              ? `<line x1="${a.x.toFixed(1)}" y1="${a.y.toFixed(1)}" x2="${b.x.toFixed(1)}" y2="${b.y.toFixed(1)}" stroke="${PALETTE.brandBright}" stroke-width="0.9" opacity="0.4"/>`
              : '';
          }),
        )
        .join('');
      const nodes = points
        .map(
          (pt) =>
            `<circle cx="${pt.x.toFixed(1)}" cy="${pt.y.toFixed(1)}" r="${(3 + rand() * 4).toFixed(1)}" fill="${PALETTE.gold}" opacity="0.75"/>`,
        )
        .join('');
      return `<g>${edges}${nodes}</g>`;
    }

    case 'arcs': {
      return `<g>${Array.from({ length: 6 }, (_, i) => {
        const r = Math.min(w, h) * (0.16 + i * 0.09);
        return `<path d="M ${(cx - r).toFixed(1)} ${cy.toFixed(1)} A ${r.toFixed(1)} ${r.toFixed(1)} 0 0 1 ${(cx + r).toFixed(1)} ${cy.toFixed(1)}"
             fill="none" stroke="${i % 2 === 0 ? PALETTE.gold : PALETTE.brandBright}" stroke-width="${(1.5 - i * 0.15).toFixed(2)}" opacity="${(0.7 - i * 0.09).toFixed(2)}"/>`;
      }).join('')}</g>`;
    }

    case 'grid': {
      const step = Math.min(w, h) * 0.075;
      const cells = Array.from({ length: 40 }, () => {
        const gx = cx + (Math.floor(rand() * 9) - 4) * step;
        const gy = cy + (Math.floor(rand() * 9) - 4) * step;
        const filled = rand() > 0.72;
        return `<rect x="${gx.toFixed(1)}" y="${gy.toFixed(1)}" width="${(step * 0.62).toFixed(1)}" height="${(step * 0.62).toFixed(1)}"
              fill="${filled ? PALETTE.gold : 'none'}" fill-opacity="0.55"
              stroke="${PALETTE.brandBright}" stroke-width="0.7" stroke-opacity="0.34"/>`;
      }).join('');
      return `<g>${cells}</g>`;
    }

    case 'rings':
    default: {
      return `<g>${Array.from({ length: 7 }, (_, i) => {
        const r = Math.min(w, h) * (0.1 + i * 0.075);
        return `<circle cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="${r.toFixed(1)}"
             fill="none" stroke="${i % 3 === 0 ? PALETTE.gold : PALETTE.brandBright}"
             stroke-width="${(1.4 - i * 0.12).toFixed(2)}" opacity="${(0.62 - i * 0.07).toFixed(2)}"/>`;
      }).join('')}</g>`;
    }
  }
}

function render(plate: Plate): string {
  const rand = seeded(hash(plate.key));
  const { width: w, height: h } = plate;
  const horizonY = h * plate.horizon;

  // Fine vertical rules, echoing the editorial grid used in the layout.
  const rules = Array.from({ length: Math.floor(w / 88) }, (_, i) => {
    const x = (i + 1) * 88;
    return `<line x1="${x}" y1="0" x2="${x}" y2="${h}" stroke="${PALETTE.ivory}" stroke-width="1" opacity="0.05"/>`;
  }).join('');

  // A few long light streaks, angled, to give the plate direction.
  const streaks = Array.from({ length: 5 }, () => {
    const y = rand() * h;
    const len = w * (0.25 + rand() * 0.5);
    const x = rand() * (w - len);
    return `<line x1="${x.toFixed(1)}" y1="${y.toFixed(1)}" x2="${(x + len).toFixed(1)}" y2="${(y - len * 0.06).toFixed(1)}"
          stroke="${PALETTE.gold}" stroke-width="${(0.6 + rand()).toFixed(2)}" opacity="${(0.06 + rand() * 0.1).toFixed(3)}"/>`;
  }).join('');

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" role="presentation">
  <defs>
    <linearGradient id="ground" x1="0" y1="0" x2="0.35" y2="1">
      <stop offset="0" stop-color="${PALETTE.inkSoft}"/>
      <stop offset="0.55" stop-color="${PALETTE.ink}"/>
      <stop offset="1" stop-color="#050B08"/>
    </linearGradient>
    <radialGradient id="glow" cx="0.28" cy="${(plate.horizon - 0.12).toFixed(2)}" r="0.78">
      <stop offset="0" stop-color="${PALETTE.brand}" stop-opacity="${(0.5 + plate.warmth * 0.3).toFixed(2)}"/>
      <stop offset="0.55" stop-color="${PALETTE.brand}" stop-opacity="0.12"/>
      <stop offset="1" stop-color="${PALETTE.brand}" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="warm" cx="0.84" cy="0.86" r="0.6">
      <stop offset="0" stop-color="${PALETTE.gold}" stop-opacity="${(0.1 + plate.warmth * 0.16).toFixed(2)}"/>
      <stop offset="1" stop-color="${PALETTE.gold}" stop-opacity="0"/>
    </radialGradient>
    <filter id="grain">
      <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="3" stitchTiles="stitch"/>
      <feColorMatrix type="saturate" values="0"/>
    </filter>
  </defs>

  <rect width="${w}" height="${h}" fill="url(#ground)"/>
  <rect width="${w}" height="${h}" fill="url(#glow)"/>
  <rect width="${w}" height="${h}" fill="url(#warm)"/>
  ${rules}
  ${streaks}

  <!-- Horizon arc, the constant across every plate. -->
  <path d="M ${-w * 0.15} ${(horizonY + h * 0.16).toFixed(1)} Q ${(w * 0.5).toFixed(1)} ${(horizonY - h * 0.2).toFixed(1)} ${(w * 1.15).toFixed(1)} ${(horizonY + h * 0.16).toFixed(1)}"
        fill="none" stroke="${PALETTE.gold}" stroke-width="1.5" opacity="0.5"/>
  <path d="M ${-w * 0.15} ${(horizonY + h * 0.22).toFixed(1)} Q ${(w * 0.5).toFixed(1)} ${(horizonY - h * 0.13).toFixed(1)} ${(w * 1.15).toFixed(1)} ${(horizonY + h * 0.22).toFixed(1)}"
        fill="none" stroke="${PALETTE.brandBright}" stroke-width="1" opacity="0.35"/>

  ${motifMarkup(plate, rand)}

  <rect width="${w}" height="${h}" filter="url(#grain)" opacity="0.055" style="mix-blend-mode:overlay"/>
</svg>
`;
}

async function main(): Promise<void> {
  await mkdir(OUT, { recursive: true });

  for (const plate of PLATES) {
    const file = path.join(OUT, `${plate.key}.svg`);
    await writeFile(file, render(plate), 'utf8');
    console.log(`  ${plate.key}.svg  ${plate.width} by ${plate.height}`);
  }

  console.log(`\n${PLATES.length} plates written to public/artwork.`);
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
