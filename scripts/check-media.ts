/**
 * Reports which photograph slots the school has filled and which are still
 * showing the drawn artwork.
 *
 *   npm run media:check
 *
 * Installing a real photograph needs no code change and no download step. Save
 * the file at the exact path printed below and it replaces the illustration on
 * the next build. Everything else, including the alt text, is already declared
 * in src/lib/media.ts.
 */
import { stat } from 'node:fs/promises';
import path from 'node:path';
import { PHOTOGRAPHY } from '../src/lib/media';

/** Shortest edge worth serving for each slot, given how it is cropped. */
const GUIDE: Record<string, string> = {
  hero: '2400 by 1500 or wider, landscape',
  junior: '1800 by 1350, landscape',
  senior: '1800 by 1350, landscape',
  teaching: '2000 by 1150, landscape',
  digital: '1400 by 1750, portrait',
  schoolLife: '2400 by 1350, landscape',
  admissions: '1200 by 1600, portrait',
};

async function sizeOf(file: string): Promise<number | null> {
  try {
    const info = await stat(file);
    return info.size > 0 ? info.size : null;
  } catch {
    return null;
  }
}

async function main(): Promise<void> {
  const entries = Object.entries(PHOTOGRAPHY);
  let installed = 0;

  console.log('\nPhotograph slots\n');

  for (const [key, photo] of entries) {
    const target = path.join(process.cwd(), 'public', photo.src.replace(/^\//, ''));
    const bytes = await sizeOf(target);

    if (bytes === null) {
      console.log(`  drawn     ${key}`);
      console.log(`            save a photograph at  public${photo.src}`);
      console.log(`            suggested size        ${GUIDE[key] ?? 'landscape'}`);
      console.log(`            it should show        ${photo.alt}`);
    } else {
      installed += 1;
      console.log(`  photo     ${key}  (${(bytes / 1024).toFixed(0)} kB)  public${photo.src}`);
    }
    console.log('');
  }

  console.log(`${installed} of ${entries.length} slots have a photograph installed.`);

  if (installed < entries.length) {
    console.log(
      '\nThe remaining slots render original artwork drawn by npm run art:build.\n' +
        'The site is complete either way, and the footer says which of the two it is\n' +
        'showing so that no image is mistaken for a photograph of the school.\n',
    );
  }
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
