import 'server-only';
import postgres, { type Sql, type TransactionSql } from 'postgres';

// One Postgres pool. Every request runs inside a transaction that adopts the caller's role and
// JWT claims — exactly what PostgREST does — so row-level security applies to the app's own
// queries. There is no path that reads the database as a superuser on behalf of a user.

declare global {
  // eslint-disable-next-line no-var
  var __axiomSql: Sql | undefined;
}

export function sql(): Sql {
  if (!globalThis.__axiomSql) {
    const url = process.env.DATABASE_URL;
    if (!url) throw new Error('DATABASE_URL is not set');
    globalThis.__axiomSql = postgres(url, {
      max: Number(process.env.DATABASE_POOL_MAX || 8),
      idle_timeout: 20,
      prepare: false,
      onnotice: () => {},
      transform: { undefined: null },
    });
  }
  return globalThis.__axiomSql;
}

export type Caller = { uid: string | null };
export type Tx = TransactionSql<Record<string, unknown>>;

/** Run `fn` as the caller: anon when uid is null, otherwise authenticated with sub = uid. */
export async function withRls<T>(caller: Caller, fn: (tx: Tx) => Promise<T>): Promise<T> {
  const claims = caller.uid ? JSON.stringify({ sub: caller.uid, role: 'authenticated' }) : '{}';
  return sql().begin(async tx => {
    await tx.unsafe(`set local role ${caller.uid ? 'authenticated' : 'anon'}`);
    await tx`select set_config('request.jwt.claims', ${claims}, true)`;
    return fn(tx as Tx);
  }) as Promise<T>;
}

/** Anonymous read: what a crawler or a signed-out visitor sees. */
export function asAnon<T>(fn: (tx: Tx) => Promise<T>) {
  return withRls({ uid: null }, fn);
}

/** Service access. Only for reading a profile to establish a session and for admin scripts. */
export async function asService<T>(fn: (tx: Tx) => Promise<T>): Promise<T> {
  return sql().begin(async tx => {
    await tx.unsafe(`set local role service_role`);
    return fn(tx as Tx);
  }) as Promise<T>;
}

export function isPgError(e: unknown): e is { code: string; message: string } {
  return typeof e === 'object' && e !== null && 'code' in e && 'message' in e;
}

/** Turn a database refusal into a short, user-facing message key + detail. */
export function pgMessage(e: unknown): string {
  if (isPgError(e)) return e.message.replace(/^.*?:\s*/, '');
  return e instanceof Error ? e.message : String(e);
}
