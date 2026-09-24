import postgres from 'postgres';
import fs from 'node:fs';
import path from 'node:path';

export const DATABASE_URL = process.env.DATABASE_URL || 'postgres://postgres:postgres@127.0.0.1:5432/axiom';
export const ADMIN_URL = process.env.ADMIN_DATABASE_URL || DATABASE_URL.replace(/\/[^/?]+(\?|$)/, '/postgres$1');
export const IS_LOCAL = process.env.AXIOM_DB_LOCAL === '1' || /127\.0\.0\.1|localhost/.test(DATABASE_URL);

export function sqlFiles(dir) {
  return fs.readdirSync(dir).filter(f => f.endsWith('.sql')).sort().map(f => path.join(dir, f));
}

export async function runFile(sql, file) {
  const text = fs.readFileSync(file, 'utf8');
  await sql.unsafe(text);
}

export function connect(url = DATABASE_URL) {
  return postgres(url, { max: 1, onnotice: () => {} });
}
