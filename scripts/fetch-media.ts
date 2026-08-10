/**
 * Downloads the photographs declared in src/lib/media.ts into
 * public/photography, so the site serves them locally rather than hotlinking.
 *
 *   npm run media:fetch
 *
 * Safe to run repeatedly. Files already present are left alone unless --force
 * is passed. If a download fails, the page falls back to the composed brand
 * panel, so a partial run never breaks the build.
 */
import { mkdir, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { PHOTOGRAPHY } from '../src/lib/media';

const OUT_DIR = path.join(process.cwd(), 'public', 'photography');
const force = process.argv.includes('--force');

async function exists(file: string): Promise<boolean> {
  try {
    const info = await stat(file);
    return info.size > 0;
  } catch {
    return false;
  }
}

async function main(): Promise<void> {
  await mkdir(OUT_DIR, { recursive: true });

  const entries = Object.entries(PHOTOGRAPHY);
  let downloaded = 0;
  let skipped = 0;
  const failures: string[] = [];

  for (const [key, photo] of entries) {
    const target = path.join(process.cwd(), 'public', photo.src.replace(/^\//, ''));

    if (!force && (await exists(target))) {
      console.log(`  skip      ${key} (already present)`);
      skipped += 1;
      continue;
    }

    process.stdout.write(`  download  ${key} ... `);

    try {
      const response = await fetch(photo.downloadUrl, {
        headers: { 'user-agent': 'PalmseedModelSchool/1.0 (media fetch)' },
        signal: AbortSignal.timeout(60_000),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const buffer = Buffer.from(await response.arrayBuffer());
      if (buffer.byteLength < 1024) {
        throw new Error('response too small to be a photograph');
      }

      await writeFile(target, buffer);
      console.log(`done (${Math.round(buffer.byteLength / 1024)} KB)`);
      downloaded += 1;
    } catch (error) {
      console.log('failed');
      failures.push(`${key}: ${error instanceof Error ? error.message : 'unknown error'}`);
    }
  }

  console.log(
    `\n${downloaded} downloaded, ${skipped} already present, ${failures.length} failed.`,
  );

  if (failures.length > 0) {
    console.log('\nFailures:');
    for (const failure of failures) console.log(`  ${failure}`);
    console.log(
      '\nThe site still builds and renders. Slots without a photograph show the\n' +
        'composed brand panel instead. Re run this command from a network that can\n' +
        'reach images.pexels.com, or drop the school’s own photographs in at the\n' +
        'paths listed in src/lib/media.ts.',
    );
  }

  console.log(
    '\nCredit these photographers wherever the photographs appear:\n  ' +
      Array.from(new Set(entries.map(([, p]) => p.photographer)))
        .sort()
        .join('\n  '),
  );
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
