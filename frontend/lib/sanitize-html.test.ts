import { sanitizeHtml, type SanitizeHtmlPolicy } from "./sanitize-html";

describe("sanitizeHtml", () => {
  it("strips script elements and inline event handlers while keeping the safe markup", () => {
    const clean = sanitizeHtml(
      '<p onclick="steal()">Hello <strong>world</strong></p><script>window.__XSS__=1</script><img src="x" onerror="alert(1)" alt="pic">',
    );
    expect(clean).not.toMatch(/<script/i);
    expect(clean).not.toContain("onclick");
    expect(clean).not.toContain("onerror");
    expect(clean).toContain("<strong>world</strong>");
    expect(clean).toContain('alt="pic"');
  });

  it("neutralises javascript: hrefs", () => {
    expect(sanitizeHtml('<a href="javascript:alert(1)">x</a>')).not.toContain("javascript:");
  });

  it("applies the policy's allow-list so a tag outside it is dropped", () => {
    const policy: SanitizeHtmlPolicy = { config: { ALLOWED_TAGS: ["p"] } };
    const clean = sanitizeHtml("<p>kept</p><table><tr><td>dropped</td></tr></table>", policy);
    expect(clean).toContain("<p>kept</p>");
    expect(clean).not.toContain("<table");
  });

  it("runs the policy's afterSanitizeAttributes hook for that call only, so the next call is unhooked", () => {
    const stamp: NonNullable<SanitizeHtmlPolicy["afterSanitizeAttributes"]> = (node) => {
      if (node.tagName === "IMG") node.setAttribute("data-seen", "1");
    };
    const hooked = sanitizeHtml('<img src="https://a.test/x.png" alt="a">', {
      afterSanitizeAttributes: stamp,
    });
    expect(hooked).toContain('data-seen="1"');

    const unhooked = sanitizeHtml('<img src="https://a.test/x.png" alt="a">');
    expect(unhooked).not.toContain("data-seen");
  });

  it("removes the hook even when sanitising throws, so a failure cannot leave the hook armed for the next caller", () => {
    const boom: NonNullable<SanitizeHtmlPolicy["afterSanitizeAttributes"]> = () => {
      throw new Error("hook failure");
    };
    expect(() => sanitizeHtml("<img alt='a'>", { afterSanitizeAttributes: boom })).toThrow(
      "hook failure",
    );
    expect(() => sanitizeHtml("<img alt='a'>")).not.toThrow();
  });
});
