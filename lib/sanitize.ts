import sanitizeHtmlLib from "sanitize-html";

const HTML_SANITIZE_OPTIONS: sanitizeHtmlLib.IOptions = {
  allowedTags: sanitizeHtmlLib.defaults.allowedTags.concat([
    "img",
    "h1",
    "h2",
    "span",
    "center",
    "u",
    "s",
  ]),
  allowedAttributes: {
    "*": ["style", "class", "id", "align", "dir", "title"],
    a: ["href", "name", "target", "rel"],
    img: ["src", "alt", "width", "height"],
    td: ["colspan", "rowspan", "width", "height", "valign", "bgcolor"],
    th: ["colspan", "rowspan", "width", "height", "valign", "bgcolor"],
    table: ["width", "cellpadding", "cellspacing", "border", "bgcolor"],
  },
  allowedSchemes: ["http", "https", "mailto", "tel"],
  allowedSchemesByTag: { img: ["http", "https", "data"] },
};

export function sanitizeHtml(input: string | null | undefined): string {
  if (!input) return "";
  return sanitizeHtmlLib(input, HTML_SANITIZE_OPTIONS);
}

export function sanitizeText(input: string): string {
  return input
    .replace(/<[^>]*>/g, "")
    .replace(/javascript:/gi, "")
    .replace(/on\w+\s*=/gi, "")
    .trim();
}

export function sanitizeRichText(input: string): string {
  return input
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
    .replace(/javascript:/gi, "")
    .replace(/on\w+\s*=/gi, "")
    .replace(/data:/gi, "")
    .trim();
}

export function sanitizeUrl(input: string): string {
  const trimmed = input.trim();
  if (!trimmed) return "";

  if (trimmed.startsWith("/") || trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    return trimmed;
  }
  return "";
}

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
