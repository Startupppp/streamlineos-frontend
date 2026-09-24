/**
 * Where the extension keeps the two things it needs and nothing else.
 *
 * `chrome.storage.local` is readable only by this extension's own pages. No
 * content script ever receives the token — the popup runs in the extension
 * origin and makes the API call itself — so a profile page and everything
 * loaded into it stays on the far side of the boundary.
 */

const KEYS = { apiBaseUrl: "apiBaseUrl", token: "token", tokenExpiresAt: "tokenExpiresAt" };

export async function readSettings() {
  const stored = await chrome.storage.local.get([
    KEYS.apiBaseUrl,
    KEYS.token,
    KEYS.tokenExpiresAt,
  ]);
  return {
    apiBaseUrl: typeof stored[KEYS.apiBaseUrl] === "string" ? stored[KEYS.apiBaseUrl] : "",
    token: typeof stored[KEYS.token] === "string" ? stored[KEYS.token] : "",
    tokenExpiresAt:
      typeof stored[KEYS.tokenExpiresAt] === "string" ? stored[KEYS.tokenExpiresAt] : "",
  };
}

export async function writeSettings(next) {
  await chrome.storage.local.set({
    [KEYS.apiBaseUrl]: next.apiBaseUrl,
    [KEYS.token]: next.token,
    [KEYS.tokenExpiresAt]: next.tokenExpiresAt ?? "",
  });
}

export async function clearToken() {
  await chrome.storage.local.remove([KEYS.token, KEYS.tokenExpiresAt]);
}

/** Trailing slashes are the single most common cause of a doubled path. */
export function normaliseBaseUrl(raw) {
  const trimmed = String(raw || "").trim().replace(/\/+$/, "");
  if (!trimmed) return null;
  let parsed;
  try {
    parsed = new URL(trimmed.includes("://") ? trimmed : `https://${trimmed}`);
  } catch {
    return null;
  }
  if (parsed.protocol !== "https:" && parsed.hostname !== "localhost") return null;
  return `${parsed.origin}${parsed.pathname.replace(/\/+$/, "")}`;
}

/**
 * Says the token is spent before a call fails with it.
 *
 * The expiry the exchange returned is stored alongside the token precisely so
 * the popup can say "your sourcing token expired, get a new one in Settings"
 * rather than showing a bare 401 from the middle of a save.
 */
export function tokenExpired(tokenExpiresAt, now = new Date()) {
  if (!tokenExpiresAt) return false;
  const at = new Date(tokenExpiresAt);
  return !Number.isNaN(at.getTime()) && at.getTime() <= now.getTime();
}
