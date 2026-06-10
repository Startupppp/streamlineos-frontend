import { format } from "date-fns";

export { generateSlug as slugify } from "./utils";

export interface TocItem {
  id: string;
  text: string;
  level: 2 | 3;
}

/** Strip HTML tags and decode a few common entities to plain text. */
export function stripHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

/** Estimate reading time in minutes from HTML or plain text (~200 wpm, min 1). */
export function calcReadingTime(content: string): number {
  const words = stripHtml(content).split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 200));
}

/** Build a trimmed plain-text excerpt from HTML content. */
export function makeExcerpt(html: string, maxLength = 160): string {
  const text = stripHtml(html);
  if (text.length <= maxLength) return text;
  const sliced = text.slice(0, maxLength);
  const lastSpace = sliced.lastIndexOf(" ");
  return `${sliced.slice(0, lastSpace > 0 ? lastSpace : maxLength).trimEnd()}…`;
}

/** Format a date as "June 10, 2026". */
export function formatBlogDate(date: Date | string | null | undefined): string {
  if (!date) return "";
  const d = typeof date === "string" ? new Date(date) : date;
  if (Number.isNaN(d.getTime())) return "";
  return format(d, "MMMM d, yyyy");
}

function slugifyHeading(text: string): string {
  return (
    text
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "section"
  );
}

/**
 * Parse <h2>/<h3> headings out of TipTap-rendered HTML, inject stable `id`
 * attributes (so the TOC can anchor to them), and return the rewritten HTML
 * alongside the table-of-contents entries.
 */
export function extractToc(html: string): { html: string; toc: TocItem[] } {
  const toc: TocItem[] = [];
  const used = new Set<string>();

  const out = html.replace(
    /<(h2|h3)([^>]*)>([\s\S]*?)<\/\1>/gi,
    (_match, tag: string, attrs: string, inner: string) => {
      const text = stripHtml(inner);
      if (!text) return _match;

      const base = slugifyHeading(text);
      let id = base;
      let i = 1;
      while (used.has(id)) id = `${base}-${i++}`;
      used.add(id);

      toc.push({ id, text, level: tag.toLowerCase() === "h2" ? 2 : 3 });

      const attrsWithoutId = attrs.replace(/\sid="[^"]*"/i, "");
      return `<${tag}${attrsWithoutId} id="${id}">${inner}</${tag}>`;
    },
  );

  return { html: out, toc };
}
