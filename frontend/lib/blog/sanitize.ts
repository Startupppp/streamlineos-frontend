import "server-only";
import sanitizeHtml from "sanitize-html";

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
