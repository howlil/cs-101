import { ZodError } from 'zod';
import { LearningError } from '../domain/learning/decisions';

export function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' } });
}

export async function mutation(request: Request, action: (input: unknown) => Promise<unknown>) {
  try {
    const url = new URL(request.url);
    const configuredOrigin = process.env.CS101_ORIGIN;
    const expectedOrigin = configuredOrigin ? new URL(configuredOrigin).origin : url.origin;
    if ((configuredOrigin && url.origin !== expectedOrigin) || request.headers.get('origin') !== expectedOrigin) {
      return json({ error: 'Origin tidak diizinkan.' }, 403);
    }
    if (request.headers.get('content-type')?.split(';')[0].trim() !== 'application/json') return json({ error: 'Gunakan application/json.' }, 415);
    const reader = request.body?.getReader();
    if (!reader) return json({ error: 'Body diperlukan.' }, 422);
    const chunks: Uint8Array[] = [];
    let size = 0;
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      size += value.length;
      if (size > 128 * 1024) { await reader.cancel(); return json({ error: 'Request terlalu besar.' }, 413); }
      chunks.push(value);
    }
    let body: unknown;
    try { body = JSON.parse(Buffer.concat(chunks).toString('utf8')); }
    catch { return json({ error: 'JSON tidak valid.' }, 422); }
    return json(await action(body));
  } catch (error) {
    if (error instanceof LearningError) return json({ error: error.message }, error.status);
    if (error instanceof ZodError) return json({ error: 'Data tidak valid.', fields: error.issues.map((issue) => issue.path.join('.')) }, 422);
    console.error('Learning storage request failed:', error instanceof Error ? error.name : 'UnknownError');
    return json({ error: 'Penyimpanan belum tersedia. Coba lagi.' }, 503);
  }
}
