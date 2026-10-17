export const STAFF_ENTRY_COOKIE = "slos_staff_entry";

export const STAFF_ENTRY_MAX_AGE_SECONDS = 60 * 60 * 24 * 30;

async function sha256Hex(value: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

function sameHex(left: string, right: string): boolean {
  if (left.length !== right.length) return false;
  let mismatch = 0;
  for (let index = 0; index < left.length; index += 1) {
    mismatch |= left.charCodeAt(index) ^ right.charCodeAt(index);
  }
  return mismatch === 0;
}

export async function staffKeyMatches(provided: string, expected: string): Promise<boolean> {
  if (expected.length === 0) return false;
  const [providedHash, expectedHash] = await Promise.all([sha256Hex(provided), sha256Hex(expected)]);
  return sameHex(providedHash, expectedHash);
}

export async function staffCookieIsValid(cookieValue: string | undefined): Promise<boolean> {
  const key = process.env.WAITLIST_STAFF_KEY ?? "";
  if (!cookieValue || key.length === 0) return false;
  return sameHex(cookieValue, await sha256Hex(key));
}

export async function staffEntryCookieValue(key: string): Promise<string> {
  return sha256Hex(key);
}
