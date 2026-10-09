export class ApiInputError extends Error {
  constructor(public status: number) { super("INVALID_REQUEST_BODY"); }
}

// Limit actual streamed bytes; do not trust Content-Length alone.
export async function readApiJson(request: Request): Promise<Record<string, unknown>> {
  const maxBytes = 16384;
  if (Number(request.headers.get("content-length")) > maxBytes) throw new ApiInputError(413);
  const reader = request.body?.getReader();
  if (!reader) throw new ApiInputError(400);
  let total = 0;
  const chunks: Uint8Array[] = [];
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > maxBytes) { await reader.cancel(); throw new ApiInputError(413); }
      chunks.push(value);
    }
  } finally { reader.releaseLock(); }
  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
  try {
    const parsed = JSON.parse(new TextDecoder().decode(bytes));
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error();
    return parsed;
  } catch { throw new ApiInputError(400); }
}
