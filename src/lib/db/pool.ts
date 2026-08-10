import 'server-only';
import { Pool, type PoolClient, type QueryResultRow } from 'pg';

/**
 * The identity a database transaction runs as.
 *
 *  anonymous     public website traffic, no account
 *  authenticator the narrow principal used while establishing or recovering an
 *                account, before a user principal exists
 *  user          a signed in student, teacher or administrator
 */
export type Principal =
  | { kind: 'anonymous' }
  | { kind: 'authenticator' }
  | { kind: 'user'; userId: string; role: 'student' | 'teacher' | 'admin' };

export const ANONYMOUS: Principal = { kind: 'anonymous' };
export const AUTHENTICATOR: Principal = { kind: 'authenticator' };

declare global {
  // Reused across hot reloads in development so the pool is not recreated on
  // every request.

  var __palmseedPool: Pool | undefined;
}

function createPool(): Pool {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('DATABASE_URL is not set');
  }

  // Supabase and most managed providers terminate TLS with a certificate that
  // is not in the Node trust store, so verification is relaxed only there.
  const needsSsl = /supabase|neon|render|railway|amazonaws/.test(connectionString);

  return new Pool({
    connectionString,
    max: Number(process.env.PGPOOL_MAX ?? 10),
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 10_000,
    ...(needsSsl ? { ssl: { rejectUnauthorized: false } } : {}),
  });
}

export function pool(): Pool {
  if (!globalThis.__palmseedPool) {
    globalThis.__palmseedPool = createPool();
  }
  return globalThis.__palmseedPool;
}

function principalRole(principal: Principal): string {
  return principal.kind === 'user' ? principal.role : principal.kind;
}

function principalUserId(principal: Principal): string {
  return principal.kind === 'user' ? principal.userId : '';
}

/**
 * Runs a unit of work inside a transaction whose request principal is applied
 * with SET LOCAL, which is what the row level security policies read.
 *
 * Every read and write in the application goes through here. There is no code
 * path that reaches the database without declaring who it is acting as.
 */
export async function withPrincipal<T>(
  principal: Principal,
  work: (tx: Tx) => Promise<T>,
): Promise<T> {
  const client = await pool().connect();
  try {
    await client.query('begin');
    await client.query('select set_config($1, $2, true), set_config($3, $4, true)', [
      'palmseed.user_id',
      principalUserId(principal),
      'palmseed.role',
      principalRole(principal),
    ]);

    const result = await work(new Tx(client));
    await client.query('commit');
    return result;
  } catch (error) {
    try {
      await client.query('rollback');
    } catch {
      // The connection is already broken; the pool will discard it.
    }
    throw error;
  } finally {
    client.release();
  }
}

/** A transaction handle. Parameterised queries only, by construction. */
export class Tx {
  constructor(private readonly client: PoolClient) {}

  async rows<T extends QueryResultRow>(sql: string, params: unknown[] = []): Promise<T[]> {
    const result = await this.client.query<T>(sql, params);
    return result.rows;
  }

  async maybeOne<T extends QueryResultRow>(sql: string, params: unknown[] = []): Promise<T | null> {
    const rows = await this.rows<T>(sql, params);
    return rows[0] ?? null;
  }

  async one<T extends QueryResultRow>(sql: string, params: unknown[] = []): Promise<T> {
    const row = await this.maybeOne<T>(sql, params);
    if (!row) throw new Error('Expected exactly one row, received none');
    return row;
  }

  async exec(sql: string, params: unknown[] = []): Promise<number> {
    const result = await this.client.query(sql, params);
    return result.rowCount ?? 0;
  }
}

export async function closePool(): Promise<void> {
  if (globalThis.__palmseedPool) {
    await globalThis.__palmseedPool.end();
    globalThis.__palmseedPool = undefined;
  }
}
