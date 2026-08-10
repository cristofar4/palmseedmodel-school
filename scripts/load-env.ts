/**
 * Minimal .env loader for the command line scripts.
 *
 * Next.js loads .env files itself for the application. The standalone scripts
 * run outside Next, so they need this. Values already present in the real
 * environment always win, which keeps CI and production overrides working.
 */
import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';

const FILES = ['.env.local', '.env'];

export function loadEnvFiles(cwd: string = process.cwd()): void {
  for (const file of FILES) {
    const full = path.join(cwd, file);
    if (!existsSync(full)) continue;

    for (const rawLine of readFileSync(full, 'utf8').split('\n')) {
      const line = rawLine.trim();
      if (!line || line.startsWith('#')) continue;

      const eq = line.indexOf('=');
      if (eq === -1) continue;

      const key = line.slice(0, eq).trim();
      let value = line.slice(eq + 1).trim();

      // Strip one matching pair of surrounding quotes.
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }

      if (!(key in process.env)) {
        process.env[key] = value;
      }
    }
  }
}
