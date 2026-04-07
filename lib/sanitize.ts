/**
 * Input sanitization utilities to prevent XSS and injection attacks.
 * Used on all user-supplied text before storing to DB or rendering.
 */

/**
 * Strips HTML tags and trims whitespace.
 * Use for any plain-text field (names, notes, descriptions, etc.)
 */
export function sanitizeText(input: string): string {
  return input
    .replace(/<[^>]*>/g, "") // strip HTML tags
    .replace(/javascript:/gi, "") // strip JS protocol
    .replace(/on\w+\s*=/gi, "") // strip inline event handlers
    .trim();
}

/**
 * Sanitizes a string but allows basic markdown-safe characters.
 * Use for descriptions, notes, comments.
 */
export function sanitizeRichText(input: string): string {
  return input
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "") // strip script tags
    .replace(/javascript:/gi, "") // strip JS protocol
    .replace(/on\w+\s*=/gi, "") // strip inline event handlers
    .replace(/data:/gi, "") // strip data: URIs
    .trim();
}

/**
 * Sanitizes a URL, ensuring it starts with http/https or is a relative path.
 * Returns empty string if the URL is potentially malicious.
 */
export function sanitizeUrl(input: string): string {
  const trimmed = input.trim();
  if (!trimmed) return "";
  // Allow relative paths and http/https URLs only
  if (trimmed.startsWith("/") || trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    return trimmed;
  }
  return "";
}

/**
 * Sanitizes an object's string fields recursively.
 * Useful for sanitizing entire form payloads.
 */
export function sanitizeObject<T extends Record<string, unknown>>(obj: T): T {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === "string") {
      result[key] = sanitizeText(value);
    } else if (value !== null && typeof value === "object" && !Array.isArray(value)) {
      result[key] = sanitizeObject(value as Record<string, unknown>);
    } else {
      result[key] = value;
    }
  }
  return result as T;
}
