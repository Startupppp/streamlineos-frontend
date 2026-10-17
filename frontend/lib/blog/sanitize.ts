import "server-only";
import sanitizeHtml from "sanitize-html";

/**
 * Allowlist for article HTML. The blog admin already renders HTML from a validated document and
 * escapes every value (renderer v1); this second pass, on the server that serves the page, is what
 * makes legacy rows written by the retired editor safe too. Keep it in step with the admin's
 * `lib/content/render.ts`: anything that renderer emits must survive here, and nothing more.
 */
const OPTIONS: sanitizeHtml.IOptions = {
  allowedTags: [
    "h2", "h3", "h4", "p", "br", "hr", "strong", "em", "b", "i", "s", "code", "pre", "blockquote",
    "ul", "ol", "li", "a", "figure", "figcaption", "img", "aside", "div",
    "table", "thead", "tbody", "tr", "th", "td",
  ],
  allowedAttributes: {
    h2: ["id"], h3: ["id"], h4: ["id"],
    a: ["href", "rel"],
    img: ["src", "srcset", "sizes", "width", "height", "alt", "loading", "decoding"],
    ol: ["start"],
    pre: ["data-language"],
    aside: ["class", "data-tone"],
    div: ["class", "role", "aria-label", "tabindex"],
    th: ["colspan", "rowspan", "scope"],
    td: ["colspan", "rowspan"],
  },
  allowedClasses: { aside: ["callout"], div: ["table-scroll"] },
  allowedSchemes: ["https", "http", "mailto"],
  allowedSchemesByTag: { img: ["https"] },
  allowProtocolRelative: false,
  transformTags: {
    // External links never get the opener; the admin already sets this, legacy rows may not.
    a: (tagName, attribs) => ({
      tagName,
      attribs: /^(https?:|mailto:)/i.test(attribs.href ?? "") ? { ...attribs, rel: "noopener noreferrer" } : attribs,
    }),
    img: (tagName, attribs) => ({ tagName, attribs: { loading: "lazy", decoding: "async", ...attribs } }),
  },
};

export function sanitizeArticleHtml(html: string): string {
  return sanitizeHtml(html, OPTIONS);
}
