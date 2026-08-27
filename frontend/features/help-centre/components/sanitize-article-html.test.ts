import { sanitizeArticleHtml } from "./public-article-content";

describe("sanitizeArticleHtml — XSS allowlist enforcement", () => {
  describe("dangerous elements are removed", () => {
    it("strips <script> tags and their content", () => {
      const result = sanitizeArticleHtml('<p>Safe</p><script>alert("xss")</script>');
      expect(result).not.toContain("<script");
      expect(result).not.toContain("alert");
      expect(result).toContain("Safe");
    });

    it("removes <iframe> elements entirely", () => {
      const result = sanitizeArticleHtml('<p>Before</p><iframe src="https://evil.com"></iframe><p>After</p>');
      expect(result).not.toContain("<iframe");
      expect(result).toContain("Before");
      expect(result).toContain("After");
    });

    it("removes <object> elements entirely", () => {
      const result = sanitizeArticleHtml('<object data="https://evil.com/plugin"></object>');
      expect(result).not.toContain("<object");
    });

    it("removes <form> elements entirely", () => {
      const result = sanitizeArticleHtml('<form action="https://evil.com/steal"><input name="q"></form>');
      expect(result).not.toContain("<form");
    });
  });

  describe("dangerous attributes are stripped", () => {
    it("strips onerror event handler from an img tag", () => {
      const result = sanitizeArticleHtml('<img src="valid.jpg" onerror="alert(1)" alt="image">');
      expect(result).not.toContain("onerror");
      expect(result).toContain("<img");
      expect(result).toContain("valid.jpg");
    });

    it("strips onclick event handler from a paragraph", () => {
      const result = sanitizeArticleHtml('<p onclick="stealData()">Click me</p>');
      expect(result).not.toContain("onclick");
      expect(result).toContain("Click me");
    });

    it("strips style attribute from any element", () => {
      const result = sanitizeArticleHtml('<p style="background:url(javascript:alert(1))">Styled</p>');
      expect(result).not.toContain("style=");
      expect(result).toContain("Styled");
    });
  });

  describe("javascript: URLs are neutralised", () => {
    it("removes href with javascript: scheme from an anchor", () => {
      const result = sanitizeArticleHtml('<a href="javascript:alert(1)">Click</a>');
      expect(result).not.toContain("javascript:");
      expect(result).toContain("Click");
    });

    it("removes href with JAVASCRIPT: (uppercase) scheme", () => {
      const result = sanitizeArticleHtml('<a href="JAVASCRIPT:alert(1)">Click</a>');
      expect(result).not.toContain("JAVASCRIPT:");
    });
  });

  describe("ToC heading id attributes survive sanitisation", () => {
    it("preserves id on h2 headings so ToC fragment links resolve", () => {
      const result = sanitizeArticleHtml('<h2 id="getting-started">Getting started</h2>');
      expect(result).toContain('id="getting-started"');
    });

    it("preserves id on h3 headings", () => {
      const result = sanitizeArticleHtml('<h3 id="step-one">Step one</h3>');
      expect(result).toContain('id="step-one"');
    });

    it("preserves id on every heading level h1 through h6", () => {
      for (let level = 1; level <= 6; level++) {
        const result = sanitizeArticleHtml(`<h${level} id="sec-${level}">Section</h${level}>`);
        expect(result).toContain(`id="sec-${level}"`);
      }
    });
  });

  describe("ordinary article content survives intact", () => {
    it("preserves headings h1 through h6", () => {
      for (let level = 1; level <= 6; level++) {
        const result = sanitizeArticleHtml(`<h${level}>Heading ${level}</h${level}>`);
        expect(result).toContain(`<h${level}`);
        expect(result).toContain(`Heading ${level}`);
      }
    });

    it("preserves paragraphs, strong, em, code, and pre", () => {
      const html = "<p>Text <strong>bold</strong> <em>italic</em> <code>code</code></p><pre>block</pre>";
      const result = sanitizeArticleHtml(html);
      expect(result).toContain("<p>");
      expect(result).toContain("<strong>");
      expect(result).toContain("<em>");
      expect(result).toContain("<code>");
      expect(result).toContain("<pre>");
    });

    it("preserves ordered and unordered lists", () => {
      const html = "<ul><li>item a</li></ul><ol><li>item 1</li></ol>";
      const result = sanitizeArticleHtml(html);
      expect(result).toContain("<ul>");
      expect(result).toContain("<ol>");
      expect(result).toContain("<li>");
    });

    it("preserves links with http and https href", () => {
      const httpResult = sanitizeArticleHtml('<a href="http://example.com" target="_blank" rel="noopener">link</a>');
      expect(httpResult).toContain('href="http://example.com"');

      const httpsResult = sanitizeArticleHtml('<a href="https://example.com">link</a>');
      expect(httpsResult).toContain('href="https://example.com"');
    });

    it("preserves mailto links", () => {
      const result = sanitizeArticleHtml('<a href="mailto:help@example.com">Email us</a>');
      expect(result).toContain('href="mailto:help@example.com"');
    });

    it("preserves images with src and alt", () => {
      const result = sanitizeArticleHtml('<img src="https://cdn.example.com/photo.jpg" alt="A photo" width="800" height="600">');
      expect(result).toContain("<img");
      expect(result).toContain('src="https://cdn.example.com/photo.jpg"');
      expect(result).toContain('alt="A photo"');
    });

    it("preserves data: URI images", () => {
      const result = sanitizeArticleHtml('<img src="data:image/png;base64,abc123" alt="inline">');
      expect(result).toContain('src="data:image/png;base64,abc123"');
    });

    it("preserves table structure including thead, tbody, th, td with colspan and rowspan", () => {
      const html = "<table><thead><tr><th colspan=\"2\" scope=\"col\">Header</th></tr></thead><tbody><tr><td rowspan=\"2\">Cell</td><td>B</td></tr></tbody></table>";
      const result = sanitizeArticleHtml(html);
      expect(result).toContain("<table>");
      expect(result).toContain("<thead>");
      expect(result).toContain("<tbody>");
      expect(result).toContain('<th colspan="2"');
      expect(result).toContain('<td rowspan="2"');
    });

    it("preserves blockquote, del, ins, mark, sub, sup", () => {
      const html = "<blockquote><p>Quote</p></blockquote><del>old</del><ins>new</ins><mark>highlight</mark><sub>low</sub><sup>high</sup>";
      const result = sanitizeArticleHtml(html);
      expect(result).toContain("<blockquote>");
      expect(result).toContain("<del>");
      expect(result).toContain("<ins>");
      expect(result).toContain("<mark>");
      expect(result).toContain("<sub>");
      expect(result).toContain("<sup>");
    });
  });
});
