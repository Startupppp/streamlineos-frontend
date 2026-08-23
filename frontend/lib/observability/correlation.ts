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
  const cryptoApi = globalThis.crypto as Crypto | undefined;
  if (cryptoApi && typeof cryptoApi.randomUUID === "function") return cryptoApi.randomUUID();
  return fallbackId();
}
