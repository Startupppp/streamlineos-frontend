function fallbackId(): string {
  const random = Math.random().toString(16).slice(2, 10);
  const time = Date.now().toString(16);
  return `f-${time}-${random}`;
}

export function newCorrelationId(): string {
  const cryptoApi: Crypto | undefined = globalThis.crypto;
  if (cryptoApi && typeof cryptoApi.randomUUID === "function") return cryptoApi.randomUUID();
  return fallbackId();
}

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
