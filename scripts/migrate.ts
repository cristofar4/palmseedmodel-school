/**
 * Applies every SQL file in db/migrations in filename order, exactly once.
 *
 * Migrations run as the database owner, which is a different (higher) identity
 * than the palmseed_app role the application uses at runtime. Set
 * MIGRATION_DATABASE_URL when those two differ, otherwise DATABASE_URL is used.
 *
 *   npm run db:migrate
 */
import { createHash } from 'node:crypto';
import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { Client } from 'pg';
import { loadEnvFiles } from './load-env';

const MIGRATIONS_DIR = path.join(process.cwd(), 'db', 'migrations');

async function main(): Promise<void> {
  loadEnvFiles();

  const connectionString = process.env.MIGRATION_DATABASE_URL ?? process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('Set DATABASE_URL (or MIGRATION_DATABASE_URL) before running migrations');
  }

  const needsSsl = /supabase|neon|render|railway|amazonaws/.test(connectionString);
  const client = new Client({
    connectionString,
    ...(needsSsl ? { ssl: { rejectUnauthorized: false } } : {}),
  });
  await client.connect();

  try {
    await client.query(`
      create table if not exists schema_migrations (
        filename    text primary key,
        checksum    text not null,
        applied_at  timestamptz not null default now()
      )
    `);

    const files = (await readdir(MIGRATIONS_DIR)).filter((f) => f.endsWith('.sql')).sort();

    const appliedRows = await client.query<{ filename: string; checksum: string }>(
      'select filename, checksum from schema_migrations',
    );
    const applied = new Map(appliedRows.rows.map((r) => [r.filename, r.checksum]));

    let ran = 0;

    for (const filename of files) {
      const sql = await readFile(path.join(MIGRATIONS_DIR, filename), 'utf8');
      const checksum = createHash('sha256').update(sql).digest('hex');
      const previous = applied.get(filename);

      if (previous) {
        if (previous !== checksum) {
          throw new Error(
            `Migration ${filename} has already been applied but its contents changed.\n` +
              'Create a new migration instead of editing an applied one.',
          );
        }
        continue;
      }

      process.stdout.write(`  applying ${filename} ... `);
      // Each migration is one transaction, so a failure leaves no partial schema.
      await client.query('begin');
      try {
        await client.query(sql);
        await client.query(
          'insert into schema_migrations (filename, checksum) values ($1, $2)',
          [filename, checksum],
        );
        await client.query('commit');
        process.stdout.write('done\n');
        ran += 1;
      } catch (error) {
        await client.query('rollback');
        process.stdout.write('failed\n');
        throw error;
      }
    }

    console.log(
      ran === 0 ? 'Schema already up to date.' : `Applied ${ran} migration(s).`,
    );
  } finally {
    await client.end();
  }
}

main().catch((error: unknown) => {
  console.error('\nMigration failed:');
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
