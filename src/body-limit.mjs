/**
 * Read a request body with a strict byte ceiling and rebuild the Request
 * for downstream handling. Returns null as soon as the stream exceeds
 * maxBytes; at most maxBytes + one chunk are observed, and no oversized
 * body is buffered in memory.
 */
export async function limitRequestBody(request, maxBytes) {
  if (!request.body) return request;

  const reader = request.body.getReader();
  const chunks = [];
  let total = 0;

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      total += value.byteLength;
      if (total > maxBytes) {
        await reader.cancel("Request body exceeds configured limit").catch(() => {});
        return null;
      }
      chunks.push(value);
    }
  } catch (error) {
    await reader.cancel().catch(() => {});
    throw error;
  }

  const body = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    body.set(chunk, offset);
    offset += chunk.byteLength;
  }

  const requestHeaders = new Headers(request.headers);
  requestHeaders.delete("Content-Length");
  return new Request(request, { body, headers: requestHeaders });
}
