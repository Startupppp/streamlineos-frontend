export interface TocEntry {
  id: string;
  text: string;
  level: 2 | 3;
}

const HEADING = /<h([23]) id="([^"]+)">([\s\S]*?)<\/h\1>/g;

const decode = (s: string) =>
  s.replace(/<[^>]*>/g, "").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'").trim();

/**
 * The table of contents, read from the ids the renderer already gave the headings — never
 * re-derived, so an in-article "#anchor" link and the contents list always agree.
 */
export function tableOfContents(html: string): TocEntry[] {
  return [...html.matchAll(HEADING)]
    .map(([, level, id, inner]) => ({ id: id ?? "", text: decode(inner ?? ""), level: level === "3" ? (3 as const) : (2 as const) }))
    .filter((e) => e.id && e.text);
}
