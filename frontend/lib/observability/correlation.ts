function fallbackId(): string {
  const random = Math.random().toString(16).slice(2, 10);
  const time = Date.now().toString(16);
  return `f-${time}-${random}`;
}

/**
 * Ids are generated, never accepted from elsewhere, so they are safe for the
 * backend's header rule by construction: hex and dashes only, well under its
 * 64-character cap.
 */
export function newCorrelationId(): string {
  const cryptoApi: Crypto | undefined = globalThis.crypto;
  if (cryptoApi && typeof cryptoApi.randomUUID === "function") return cryptoApi.randomUUID();
  return fallbackId();
}

/**
 * W3C `traceparent` for a client-originated request.
 *
 * The plain correlation header cannot be used on a Next `fetch` that declares a
 * `revalidate`: Next builds its data-cache key from the request headers, so a
 * freshly-minted id per call turns every cached read into a miss. It strips
 * `traceparent` and `tracestate` from that key by design, which makes this the
 * one carrier that reaches the backend without retiring the cache. The server
 * joins it (`parseTraceparent`) instead of starting an unrelated trace.
 */
export function newTraceparent(): string {
  return `00-${randomHex(32)}-${randomHex(16)}-01`;
}

function randomHex(chars: number): string {
  const bytes = new Uint8Array(chars / 2);
  const cryptoApi: Crypto | undefined = globalThis.crypto;
  if (cryptoApi && typeof cryptoApi.getRandomValues === "function") {
    cryptoApi.getRandomValues(bytes);
  } else {
    for (let i = 0; i < bytes.length; i += 1) bytes[i] = Math.floor(Math.random() * 256);
  }
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}
