/**
 * Works out why the database will not connect, one layer at a time.
 *
 *   npm run db:check
 *
 * "Migration failed" tells you nothing about which of five separate things
 * went wrong. This walks them in order and stops at the first one that breaks,
 * so the answer is the step that failed rather than a stack trace:
 *
 *   1. the variable is set
 *   2. the string is a usable URL
 *   3. the host name resolves, and to an address family this machine can reach
 *   4. the port accepts a TCP connection
 *   5. PostgreSQL accepts the credentials over TLS
 *
 * Nothing it prints contains the password.
 */
import net from 'node:net';
import { lookup } from 'node:dns/promises';
import { Client } from 'pg';
import { assertUsableConnectionString, redact } from '../src/lib/db/connection';
import { loadEnvFiles } from './load-env';

const tick = (text: string) => console.log(`  ok    ${text}`);
const cross = (text: string) => console.log(`  fail  ${text}`);

function advise(lines: string[]): void {
  console.log(`\n${lines.join('\n')}\n`);
}

async function main(): Promise<void> {
  loadEnvFiles();

  const name = process.env.MIGRATION_DATABASE_URL ? 'MIGRATION_DATABASE_URL' : 'DATABASE_URL';
  const connectionString = process.env.MIGRATION_DATABASE_URL ?? process.env.DATABASE_URL;

  console.log('\nDatabase connection check\n');

  /* 1. set at all -------------------------------------------------------- */
  if (!connectionString) {
    cross(`${name} is not set in this terminal`);
    advise([
      'Set it, keeping the single quotes, then run this again:',
      '',
      "  export MIGRATION_DATABASE_URL='postgresql://...'",
      '',
      'It lasts for this terminal session only. Opening a new terminal loses it.',
    ]);
    process.exitCode = 1;
    return;
  }
  tick(`${name} is set`);

  /* 2. shaped like a URL -------------------------------------------------- */
  try {
    assertUsableConnectionString(connectionString, name);
  } catch (error) {
    cross('the connection string is malformed');
    console.log(`\n${(error as Error).message}`);
    process.exitCode = 1;
    return;
  }
  tick('the connection string parses');
  console.log(`        ${redact(connectionString)}`);

  const url = new URL(connectionString);
  const host = url.hostname;
  const port = Number(url.port || 5432);

  const pooled = host.includes('pooler.supabase.com');
  console.log(`        ${pooled ? 'session pooler' : 'direct connection'}, port ${port}`);

  /* 3. resolves, and to something reachable ------------------------------- */
  let address: string;
  let family: number;
  try {
    const resolved = await lookup(host, { verbatim: true });
    address = resolved.address;
    family = resolved.family;
    tick(`${host} resolves to an IPv${family} address`);
  } catch {
    cross(`${host} does not resolve`);
    advise([
      'The host name is wrong. Copy it from the Supabase dashboard rather than',
      'typing it: Connect, then the Session pooler tab. Some projects use an',
      'aws-1- prefix rather than aws-0-.',
    ]);
    process.exitCode = 1;
    return;
  }

  if (family === 6 && !pooled) {
    console.log('        this is the IPv6 only direct connection');
  }

  /* 4. the port answers ---------------------------------------------------- */
  const reachable = await new Promise<string | null>((resolve) => {
    const socket = net.createConnection({ host: address, port, family });
    const done = (result: string | null) => {
      socket.destroy();
      resolve(result);
    };
    socket.setTimeout(8000);
    socket.on('connect', () => done(null));
    socket.on('timeout', () => done('timed out'));
    socket.on('error', (error: NodeJS.ErrnoException) => done(error.code ?? error.message));
  });

  if (reachable !== null) {
    cross(`nothing answered on port ${port} (${reachable})`);
    advise(
      family === 6 && !pooled
        ? [
            'This machine has no route to IPv6, and the Supabase direct connection',
            'is IPv6 only on new projects. Use the Session pooler instead. In the',
            'dashboard: Connect, Session pooler tab. The user name gains a dot and',
            'the project reference, and the host becomes aws-0-eu-west-1.pooler',
            '.supabase.com for an Ireland project.',
          ]
        : [
            'The address resolved but the port did not answer. Check the port: 5432',
            'for the session pooler and the direct connection, 6543 for the',
            'transaction pooler. If the project was only just created, give it a',
            'minute to finish starting.',
          ],
    );
    process.exitCode = 1;
    return;
  }
  tick(`port ${port} accepts a connection`);

  /* 5. PostgreSQL lets us in ------------------------------------------------ */
  /* Same rule the application and the migration runner use: TLS for a managed
     host, none for a local one, which usually has no certificate at all. */
  const needsSsl = /supabase|neon|render|railway|amazonaws/.test(connectionString);
  const client = new Client({
    connectionString,
    ...(needsSsl ? { ssl: { rejectUnauthorized: false } } : {}),
  });
  try {
    await client.connect();
    const result = await client.query<{ user: string; db: string; version: string }>(
      'select current_user as user, current_database() as db, version() as version',
    );
    const row = result.rows[0];
    tick('PostgreSQL accepted the credentials');
    console.log(`        connected as ${row?.user} to ${row?.db}`);
    console.log(`        ${row?.version.split(' ').slice(0, 2).join(' ')}`);

    const applied = await client
      .query<{ count: string }>('select count(*)::text as count from schema_migrations')
      .catch(() => null);

    console.log(
      applied
        ? `\n  ${applied.rows[0]?.count} of 8 migrations already applied.\n`
        : '\n  No migrations applied yet. Run npm run db:migrate next.\n',
    );
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code;
    const message = (error as Error).message;
    cross('PostgreSQL refused the connection');
    console.log(`        ${message}`);

    advise(
      /password|authentication/i.test(message)
        ? [
            'The host and port are right, so this is the password or the user name.',
            'Reset the database password in the dashboard under Settings, Database,',
            'and paste the new one in. On the session pooler the user name must be',
            'postgres.<project-ref>, not plain postgres.',
          ]
        : /does not exist/i.test(message)
          ? ['The database name at the end of the string is wrong. It should be /postgres.']
          : /SSL/i.test(message)
            ? [
                'The server refused TLS. A managed database always wants it, so this',
                'usually means the host is not the one you meant to reach.',
              ]
          : [
              `Unrecognised failure${code ? ` (${code})` : ''}. Send the line above and`,
              'the ok and fail lines from this check. None of it contains the password.',
            ],
    );
    process.exitCode = 1;
  } finally {
    await client.end().catch(() => {});
  }
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
