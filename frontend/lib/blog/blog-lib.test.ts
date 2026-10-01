/** @jest-environment node */
import { assertPageExists, listingPageNumber, pagedPath } from "./listing-route";
import { sanitizeArticleHtml } from "./sanitize";
import { blogUrl, jsonLd, SITE_ORIGIN } from "./seo";
import { tableOfContents } from "./toc";
import type { BlogPostPage } from "./contracts";

jest.mock("server-only", () => ({}));
jest.mock("next/navigation", () => ({
  notFound: () => {
    throw new Error("NEXT_NOT_FOUND");
  },
  permanentRedirect: (to: string) => {
    throw new Error(`REDIRECT ${to}`);
  },
}));

describe("sanitizeArticleHtml", () => {
  it("removes scripts, event handlers, iframes and unsafe URLs from legacy HTML", () => {
    const out = sanitizeArticleHtml(
      '<p onclick="x()">Hi<script>alert(1)</script></p><iframe src="https://e.x"></iframe>' +
        '<a href="javascript:alert(1)">a</a><img src="data:image/png;base64,AAA"><img src="http://e.x/a.jpg">',
    );
    expect(out).not.toMatch(/script|onclick|iframe|javascript:|data:|http:\/\/e\.x/);
    expect(out).toContain("<p>Hi</p>");
  });

  it("keeps what the admin renderer emits", () => {
    const html =
      '<h2 id="plan">Plan</h2><aside class="callout" data-tone="tip"><p>Tip</p></aside>' +
      '<div class="table-scroll" role="region" aria-label="Table" tabindex="0"><table><tbody><tr><td>1</td></tr></tbody></table></div>' +
      '<figure><img src="https://media.example/a.jpg" srcset="https://media.example/a.webp 480w" sizes="100vw" width="480" height="293" alt="A desk"><figcaption>Desk</figcaption></figure>';
    const out = sanitizeArticleHtml(html);
    expect(out).toContain('<h2 id="plan">');
    expect(out).toContain('<aside class="callout" data-tone="tip">');
    expect(out).toContain('class="table-scroll"');
    expect(out).toContain('srcset="https://media.example/a.webp 480w"');
    expect(out).toContain('alt="A desk"');
  });

  it("gives external links noopener and lazy-loads images", () => {
    const out = sanitizeArticleHtml('<a href="https://e.x">e</a><a href="/pricing">p</a><img src="https://m.x/a.jpg" alt="">');
    expect(out).toContain('<a href="https://e.x" rel="noopener noreferrer">');
    expect(out).toContain('<a href="/pricing">');
    expect(out).toMatch(/<img[^>]*loading="lazy"/);
  });
});

describe("tableOfContents", () => {
  it("reads the renderer's anchors, decodes entities and skips h4", () => {
    const toc = tableOfContents('<h2 id="a">Plans &amp; <em>reviews</em></h2><h3 id="a-2">Next</h3><h4 id="c">Deep</h4>');
    expect(toc).toEqual([
      { id: "a", text: "Plans & reviews", level: 2 },
      { id: "a-2", text: "Next", level: 3 },
    ]);
  });
});

describe("seo", () => {
  it("builds canonical URLs from the configured origin, never from a request", () => {
    expect(blogUrl("/one")).toBe(`${SITE_ORIGIN}/blogs/one`);
    expect(blogUrl()).toBe(`${SITE_ORIGIN}/blogs`);
  });

  it("escapes JSON-LD so article text cannot close the script tag", () => {
    const out = jsonLd({ headline: "</script><script>alert(1)</script> " });
    expect(out).not.toContain("</script>");
    expect(out).not.toContain(" ");
    expect(JSON.parse(out)).toEqual({ headline: "</script><script>alert(1)</script> " });
  });
});

describe("listing pages", () => {
  const page = (p: number, totalPages: number) => ({ page: p, totalPages }) as BlogPostPage;

  it("maps the optional page tail to a number, a redirect for page 1, or a 404", () => {
    expect(listingPageNumber(undefined, "/blogs/archive")).toBe(1);
    expect(listingPageNumber(["page", "3"], "/blogs/archive")).toBe(3);
    expect(() => listingPageNumber(["page", "1"], "/blogs/archive")).toThrow("REDIRECT /blogs/archive");
    for (const bad of [["page", "0"], ["page", "01"], ["page", "x"], ["other"], ["page", "2", "x"]]) {
      expect(() => listingPageNumber(bad, "/blogs/archive")).toThrow("NEXT_NOT_FOUND");
    }
  });

  it("404s a page past the end but not an empty first page", () => {
    expect(() => assertPageExists(page(3, 2))).toThrow("NEXT_NOT_FOUND");
    expect(() => assertPageExists(page(1, 0))).not.toThrow();
    expect(pagedPath("/blogs/archive", 1)).toBe("/blogs/archive");
    expect(pagedPath("/blogs/archive", 2)).toBe("/blogs/archive/page/2");
  });
});
