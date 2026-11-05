import { createClient } from '@supabase/supabase-js';
import { resolveCardCode } from '../../../../lib/cardPublicId';
import { isHostedMenuPdf } from '../../../../lib/publicPdf';

export const runtime = 'nodejs';
const MAX_BYTES = 10 * 1024 * 1024;
const unavailable = (status = 404) => new Response('Dokumen belum tersedia. Silakan coba lagi.', { status });

export async function GET(_request: Request, { params }: { params: Promise<{ cardCode: string }> }) {
  const projectUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publicKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!projectUrl || !publicKey) return unavailable(503);
  try {
    const { cardCode } = await params;
    const client = createClient(projectUrl, publicKey);
    const resolved = await resolveCardCode(client, cardCode);
    if (!resolved) return unavailable();
    const { data, error } = await client.rpc('v3_get_public_landing_page', { p_card_code: resolved });
    if (error || data?.success !== true || data.show_pdf === false || typeof data.pdf_url !== 'string'
      || !isHostedMenuPdf(data.pdf_url, projectUrl)) return unavailable();
    const response = await fetch(data.pdf_url, { redirect: 'error', signal: AbortSignal.timeout(15000), cache: 'no-store' });
    if (!response.ok || !response.body) return unavailable(502);
    if (Number(response.headers.get('content-length')) > MAX_BYTES) {
      await response.body.cancel();
      return unavailable(413);
    }
    const reader = response.body.getReader();
    const chunks: Uint8Array[] = [];
    let size = 0;
    try {
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        size += value.byteLength;
        if (size > MAX_BYTES) { await reader.cancel(); return unavailable(413); }
        chunks.push(value);
      }
    } finally { reader.releaseLock(); }
    const bytes = new Uint8Array(size);
    let offset = 0;
    for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
    if (new TextDecoder().decode(bytes.subarray(0, 5)) !== '%PDF-') return unavailable(422);
    return new Response(bytes, { headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': 'inline; filename="menu.pdf"',
      'Content-Length': String(size),
      'Cache-Control': 'private, no-store',
      'X-Content-Type-Options': 'nosniff',
    } });
  } catch { return unavailable(502); }
}
