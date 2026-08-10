/**
 * Creates the administrator account.
 *
 *   npm run admin:create
 *
 * Reads ADMIN_BOOTSTRAP_EMAIL, ADMIN_BOOTSTRAP_PASSWORD and
 * ADMIN_BOOTSTRAP_NAME from the environment. The password is never passed on
 * the command line, because that would leave it in the shell history and in
 * the process list.
 *
 * Safe to run more than once. If the account already exists the script says so
 * and changes nothing, unless --reset-password is passed, which sets a new
 * password and revokes every live session on that account.
 */
import { createHash, randomBytes, scrypt as scryptCallback } from 'node:crypto';
import { promisify } from 'node:util';
import { Client } from 'pg';
import { loadEnvFiles } from './load-env';

const scrypt = promisify(scryptCallback) as (
  password: string,
  salt: Buffer,
  keylen: number,
  options: { N: number; r: number; p: number; maxmem: number },
) => Promise<Buffer>;

/** Mirrors src/lib/security/password.ts so the two formats stay compatible. */
async function hashPassword(plain: string): Promise<string> {
  const N = 32_768;
  const salt = randomBytes(16);
  const derived = await scrypt(plain.normalize('NFKC'), salt, 64, {
    N,
    r: 8,
    p: 1,
    maxmem: 128 * N * 8 * 2,
  });
  return ['scrypt', N, 8, 1, salt.toString('base64'), derived.toString('base64')].join('$');
}

function problems(password: string): string[] {
  const found: string[] = [];
  if (password.length < 12) found.push('Use at least 12 characters for an administrator.');
  if (!/[a-zA-Z]/.test(password)) found.push('Include at least one letter.');
  if (!/[0-9]/.test(password)) found.push('Include at least one number.');
  if (/^\s|\s$/.test(password)) found.push('Remove the leading or trailing spaces.');
  return found;
}

async function main(): Promise<void> {
  loadEnvFiles();

  const connectionString = process.env.MIGRATION_DATABASE_URL ?? process.env.DATABASE_URL;
  const email = process.env.ADMIN_BOOTSTRAP_EMAIL?.trim().toLowerCase();
  const password = process.env.ADMIN_BOOTSTRAP_PASSWORD;
  const fullName = process.env.ADMIN_BOOTSTRAP_NAME?.trim() || 'Palmseed Administrator';
  const resetPassword = process.argv.includes('--reset-password');

  if (!connectionString) throw new Error('DATABASE_URL is not set');
  if (!email) throw new Error('ADMIN_BOOTSTRAP_EMAIL is not set');
  if (!password) throw new Error('ADMIN_BOOTSTRAP_PASSWORD is not set');

  const weaknesses = problems(password);
  if (weaknesses.length > 0) {
    throw new Error(`The bootstrap password is too weak:\n  ${weaknesses.join('\n  ')}`);
  }

  const needsSsl = /supabase|neon|render|railway|amazonaws/.test(connectionString);
  const client = new Client({
    connectionString,
    ...(needsSsl ? { ssl: { rejectUnauthorized: false } } : {}),
  });
  await client.connect();

  try {
    // Runs with the admin principal so the row level security policies on
    // users allow the write.
    await client.query('begin');
    await client.query(`select set_config('palmseed.role', 'admin', true)`);

    const existing = await client.query<{ id: string; role: string }>(
      'select id, role from users where lower(email) = lower($1)',
      [email],
    );

    if (existing.rows.length > 0) {
      const account = existing.rows[0]!;

      if (!resetPassword) {
        await client.query('commit');
        console.log(
          `An account already exists for ${email} with the role ${account.role}.\n` +
            'Nothing was changed. Pass --reset-password to set a new password on it.',
        );
        return;
      }

      await client.query(
        `update users
            set password_hash = $2, role = 'admin', status = 'active',
                must_change_password = false, email_verified_at = coalesce(email_verified_at, now())
          where id = $1`,
        [account.id, await hashPassword(password)],
      );

      // A password change must not leave older sessions usable.
      const revoked = await client.query(
        'update auth_sessions set revoked_at = now() where user_id = $1 and revoked_at is null',
        [account.id],
      );

      await client.query(
        `insert into audit_logs (actor_user_id, actor_role, action, entity_type, entity_id, summary)
         values ($1::uuid, 'admin', 'admin.password_reset', 'user', $1::text, 'Administrator password reset through the bootstrap script')`,
        [account.id],
      );

      await client.query('commit');
      console.log(
        `Password reset for ${email}.\n` +
          `${revoked.rowCount ?? 0} existing session(s) were signed out.`,
      );
      return;
    }

    const created = await client.query<{ id: string }>(
      `insert into users (email, full_name, password_hash, role, status, email_verified_at)
       values ($1, $2, $3, 'admin', 'active', now())
       returning id`,
      [email, fullName, await hashPassword(password)],
    );

    const adminId = created.rows[0]!.id;

    await client.query(
      `insert into audit_logs (actor_user_id, actor_role, action, entity_type, entity_id, summary)
       values ($1::uuid, 'admin', 'admin.create', 'user', $1::text, 'Administrator account created through the bootstrap script')`,
      [adminId],
    );

    await client.query('commit');

    console.log(
      [
        '',
        'Administrator account created.',
        '',
        `  Email     ${email}`,
        `  Name      ${fullName}`,
        `  Sign in   /signin`,
        '',
        'Next steps:',
        '  1. Remove ADMIN_BOOTSTRAP_PASSWORD from the environment now that it has been used.',
        '  2. Sign in and set up the academic session, terms, classes and subjects.',
        '  3. Create the teaching accounts.',
        '',
        // A digest, so the operator can confirm which password was installed
        // without the value itself ever being printed or logged.
        `  Password fingerprint ${createHash('sha256').update(password).digest('hex').slice(0, 12)}`,
        '',
      ].join('\n'),
    );
  } catch (error) {
    await client.query('rollback').catch(() => undefined);
    throw error;
  } finally {
    await client.end();
  }
}

main().catch((error: unknown) => {
  console.error('\nCould not create the administrator account:');
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
