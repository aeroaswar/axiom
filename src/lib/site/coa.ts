import 'server-only';
import fs from 'node:fs';
import path from 'node:path';

// Where a published certificate file lives on disk. `coa_documents.file_path` is a storage key;
// until object storage is wired up, the file is served from the app's own public directory. The
// row is the record either way — the page shows the row's real figures whether or not the file is
// filed, and it never links to a certificate that is not there.

const ROOT = () => path.join(process.cwd(), 'public');

export function coaFilePath(filePath: string): string | null {
  const clean = filePath.replace(/^\/+/, '');
  if (clean.includes('..')) return null;
  const abs = path.join(ROOT(), clean);
  if (!abs.startsWith(ROOT())) return null;
  return fs.existsSync(abs) ? abs : null;
}

export const coaFileExists = (filePath: string) => coaFilePath(filePath) !== null;
