/**
 * A UUID that does not depend on a secure context.
 *
 * `crypto.randomUUID` is only defined over HTTPS (and on localhost). The RF
 * screens are built for a handheld on a warehouse LAN, which is usually plain
 * HTTP — there `crypto.randomUUID` is `undefined`, and a bare call throws
 * `TypeError: crypto.randomUUID is not a function` before the scan it was
 * meant to key has even been attempted.
 *
 * `getRandomValues` is available in every context, so the fallback is a real
 * random id rather than a weaker one. The last resort — neither API present —
 * is only reached in a non-browser environment with no crypto at all.
 */
export function randomId(): string {
  const c = globalThis.crypto;
  if (c && typeof c.randomUUID === "function") return c.randomUUID();

  const bytes = new Uint8Array(16);
  if (c && typeof c.getRandomValues === "function") {
    c.getRandomValues(bytes);
  } else {
    for (let i = 0; i < bytes.length; i += 1) bytes[i] = Math.floor(Math.random() * 256);
  }
  // Version 4, variant 1, so the value is a well-formed UUID either way.
  bytes[6] = ((bytes[6] ?? 0) & 0x0f) | 0x40;
  bytes[8] = ((bytes[8] ?? 0) & 0x3f) | 0x80;

  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}
