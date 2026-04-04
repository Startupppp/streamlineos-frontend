import { describe, it, expect } from "vitest";
import { sanitizeText, sanitizeRichText, sanitizeUrl, sanitizeObject } from "@/lib/sanitize";

describe("sanitizeText", () => {
  it("strips HTML tags", () => {
    expect(sanitizeText("<script>alert('xss')</script>hello")).not.toContain("<script>");
  });

  it("strips inline event handlers", () => {
    expect(sanitizeText("<img onerror='alert(1)' src=x>")).not.toContain("onerror");
  });

  it("strips javascript: protocol", () => {
    expect(sanitizeText("javascript:alert(1)")).not.toContain("javascript:");
  });

  it("preserves plain text", () => {
    expect(sanitizeText("Hello World 123")).toBe("Hello World 123");
  });

  it("trims leading and trailing whitespace", () => {
    expect(sanitizeText("  hello  ")).toBe("hello");
  });

  it("handles empty string", () => {
    expect(sanitizeText("")).toBe("");
  });

  it("handles angle bracket injection", () => {
    const result = sanitizeText("<b>bold</b>");
    expect(result).not.toContain("<b>");
    expect(result).not.toContain("</b>");
  });
});

describe("sanitizeRichText", () => {
  it("removes script tags entirely", () => {
    const input = '<p>Hello</p><script>alert("xss")</script>';
    expect(sanitizeRichText(input)).not.toContain("<script>");
    expect(sanitizeRichText(input)).not.toContain("alert");
  });

  it("removes data: URIs", () => {
    const input = '<img src="data:text/html,<script>alert(1)</script>">';
    expect(sanitizeRichText(input)).not.toContain("data:");
  });

  it("removes javascript: protocol in href", () => {
    const input = '<a href="javascript:void(0)">click</a>';
    expect(sanitizeRichText(input)).not.toContain("javascript:");
  });

  it("removes inline event handlers", () => {
    const input = '<p onclick="steal()">text</p>';
    expect(sanitizeRichText(input)).not.toContain("onclick");
  });

  it("preserves safe HTML content", () => {
    const result = sanitizeRichText("<p>Safe paragraph</p>");
    expect(result).toContain("Safe paragraph");
  });
});

describe("sanitizeUrl", () => {
  it("allows relative paths", () => {
    expect(sanitizeUrl("/dashboard")).toBe("/dashboard");
  });

  it("allows https URLs", () => {
    expect(sanitizeUrl("https://example.com")).toBe("https://example.com");
  });

  it("allows http URLs", () => {
    expect(sanitizeUrl("http://example.com")).toBe("http://example.com");
  });

  it("blocks javascript: protocol — returns empty string", () => {
    expect(sanitizeUrl("javascript:alert(1)")).toBe("");
  });

  it("blocks data: URIs — returns empty string", () => {
    expect(sanitizeUrl("data:text/html,<h1>hi</h1>")).toBe("");
  });

  it("blocks vbscript: protocol — returns empty string", () => {
    expect(sanitizeUrl("vbscript:msgbox(1)")).toBe("");
  });

  it("returns empty string for empty input", () => {
    expect(sanitizeUrl("")).toBe("");
  });
});

describe("sanitizeObject", () => {
  it("sanitizes all string fields recursively", () => {
    const input = {
      name: "<script>xss</script>",
      age: 30,
      nested: { bio: "javascript:alert(1)" },
    };
    const result = sanitizeObject(input);
    expect(result.name).not.toContain("<script>");
    expect(result.nested.bio).not.toContain("javascript:");
    expect(result.age).toBe(30);
  });

  it("handles null and undefined fields", () => {
    const input = { name: "Alice", extra: null };
    const result = sanitizeObject(input as Record<string, unknown>);
    expect(result.name).toBe("Alice");
  });
});
