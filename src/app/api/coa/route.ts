import fs from 'node:fs';
import { NextResponse } from 'next/server';
import { getSampleCoa } from '@/lib/site/catalogue';
import { coaFilePath } from '@/lib/site/coa';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/** The published sample Certificate of Analysis. Public: it is the trust asset, not a price. */
export async function GET() {
  const coa = await getSampleCoa();
  if (!coa) return NextResponse.json({ error: 'no sample certificate is published' }, { status: 404 });
  const abs = coaFilePath(coa.file_path);
  if (!abs) return NextResponse.json({ error: 'the certificate file is not filed yet' }, { status: 404 });
  const body = fs.readFileSync(abs);
  return new NextResponse(new Uint8Array(body), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="${coa.file_path.split('/').pop() ?? 'coa.pdf'}"`,
      'Cache-Control': 'public, max-age=3600',
    },
  });
}
