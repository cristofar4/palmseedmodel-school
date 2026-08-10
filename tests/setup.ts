import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';

/**
 * Loads .env.local so the integration tests reach the same database the
 * application uses locally. Real environment values always win, which is what
 * lets CI point the suite at its own database.
 */
for (const file of ['.env.test.local', '.env.local', '.env']) {
  const full = path.join(process.cwd(), file);
  if (!existsSync(full)) continue;

  for (const rawLine of readFileSync(full, 'utf8').split('\n')) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;

    const eq = line.indexOf('=');
    if (eq === -1) continue;

    const key = line.slice(0, eq).trim();
    let value = line.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    if (!(key in process.env)) process.env[key] = value;
  }
}

// Emails must never leave the machine during a test run.
delete process.env.RESEND_API_KEY;
