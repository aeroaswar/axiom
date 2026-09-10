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

/**
 * Service access. For reading a profile to establish a session, for admin scripts, and for reading
 * the email address a protocol card's sign-in link is sent to — that one address must come from the
 * account's own row rather than from a public page, and no browser session may read it (decision 12).
 */
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

/**
 * The subset of `pgMessage` that is safe to show a client. The domain layer marks every refusal it
 * wants read — an expired quote, an order past dispatch, a peptide line on a lapsed acknowledgement
 * — with `errcode = 'check_violation'`, so that sentence was written for the reader. Anything else
 * reaching here is incidental: a driver parse failure, a constraint name, a privilege refusal. Those
 * are for the log, not for a clinic's screen, so this returns null and the caller says so plainly.
 */
export function pgRefusal(e: unknown): string | null {
  return isPgError(e) && e.code === '23514' ? pgMessage(e) : null;
}
