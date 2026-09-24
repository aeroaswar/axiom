import fs from 'node:fs';
import { NextResponse, type NextRequest } from 'next/server';
import { cardByCode } from '@/lib/protocol/card';
import { coaFilePath } from '@/lib/site/coa';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * The certificate behind one line of a card. Separate from /api/coa, which serves the single
 * published sample and is a public trust asset; this one is reached only through a card's code,
 * and it will only ever serve the file named by that card's own row.
 *
 * `coa_read` is `using (is_sample or axiom.is_staff())`, and `axiom.protocol_card` is a definer
 * function, so a card holder does see the metadata for a lot that is not the sample. That widening
 * is deliberate — a certificate is the point of a card — and it is recorded in docs/DECISIONS.md.
 * It reaches no further than the rows of the card whose code was presented.
 */
export async function GET(_req: NextRequest, ctx: { params: Promise<{ code: string; item: string }> }) {
  const { code, item } = await ctx.params;
  const card = await cardByCode(code);
  const line = card?.items.find(i => i.id === item);
  if (!line?.coa) return new NextResponse(null, { status: 404 });

  // Path traversal is already solved once, in src/lib/site/coa.ts; this uses that and nothing else.
  const abs = coaFilePath(line.coa.file_path);
  if (!abs) return new NextResponse(null, { status: 404 });

  return new NextResponse(new Uint8Array(fs.readFileSync(abs)), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="${line.coa.file_path.split('/').pop() ?? 'coa.pdf'}"`,
      'Cache-Control': 'private, max-age=300',
      'X-Content-Type-Options': 'nosniff',
      'X-Robots-Tag': 'noindex, nofollow',
    },
  });
}
