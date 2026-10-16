/** Only an absolute http(s) URL is followed; anything else would be a script or a typo. */
export function safeRedirect(url: string | null): string | null {
  const parsed = url ? parseUrl(url) : null;
  return parsed && (parsed.protocol === "https:" || parsed.protocol === "http:") ? parsed.toString() : null;
}

/** `URL.canParse` is missing from Safari < 17 and jsdom, so parse and catch. */
export function parseUrl(value: string): URL | null {
  try {
    return new URL(value);
  } catch {
    return null;
  }
}

/** Blank optionals are not sent: the backend stores the body as the lead's custom data. */
export function toLeadSubmission(values: Record<string, string>): Record<string, string> {
  return Object.fromEntries(Object.entries(values).filter(([, value]) => value.trim() !== ""));
}
