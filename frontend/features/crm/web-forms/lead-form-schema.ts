export function safeRedirect(url: string | null): string | null {
  const parsed = url ? parseUrl(url) : null;
  return parsed && (parsed.protocol === "https:" || parsed.protocol === "http:") ? parsed.toString() : null;
}

export function parseUrl(value: string): URL | null {
  try {
    return new URL(value);
  } catch {
    return null;
  }
}

export function toLeadSubmission(values: Record<string, string>): Record<string, string> {
  return Object.fromEntries(Object.entries(values).filter(([, value]) => value.trim() !== ""));
}
