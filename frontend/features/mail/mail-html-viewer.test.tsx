import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MailHtmlViewer } from "./mail-html-viewer";

jest.mock("@/lib/utils", () => ({
  cn: (...args: unknown[]) => args.filter(Boolean).join(" "),
}));

jest.mock("@/components/ui/button", () => ({
  Button: ({
    children,
    onClick,
    className,
    type,
  }: {
    children: React.ReactNode;
    onClick?: () => void;
    className?: string;
    type?: string;
  }) => (
    <button type={(type as "button" | "submit" | "reset") ?? "button"} onClick={onClick} className={className}>
      {children}
    </button>
  ),
}));

function getMailBody(): Element | null {
  return document.querySelector(".mail-html-body");
}

async function renderMail(html: string): Promise<Element> {
  render(<MailHtmlViewer html={html} />);
  await waitFor(() => expect(getMailBody()?.childElementCount ?? 0).toBeGreaterThan(0));
  const body = getMailBody();
  if (!body) throw new Error("mail body did not render");
  return body;
}

describe("MailHtmlViewer — HTML sanitization", () => {
  it("renders an empty body until the sanitiser has run after mount, so unsanitised HTML is never painted", async () => {
    render(<MailHtmlViewer html='<p>Safe</p><script>alert("xss")</script>' />);
    expect(getMailBody()?.innerHTML).toBe("");
    await screen.findByText("Safe");
  });

  describe("dangerous elements are stripped", () => {
    it("strips <script> tags and their content", async () => {
      const body = await renderMail('<p>Safe</p><script>alert("xss")</script>');
      expect(body.innerHTML).not.toContain("<script");
      expect(body.innerHTML).not.toContain("alert");
      expect(body.innerHTML).toContain("Safe");
    });

    it("strips <iframe> elements", async () => {
      const body = await renderMail('<p>Before</p><iframe src="https://evil.com"></iframe><p>After</p>');
      expect(body.innerHTML).not.toContain("<iframe");
      expect(body.innerHTML).toContain("Before");
      expect(body.innerHTML).toContain("After");
    });

    it("strips <object> elements", async () => {
      const body = await renderMail('<p>Before</p><object data="https://evil.com/plugin"></object>');
      expect(body.innerHTML).not.toContain("<object");
      expect(body.innerHTML).toContain("Before");
    });
  });

  describe("dangerous attributes are stripped", () => {
    it("strips onerror event handler from img", async () => {
      const body = await renderMail('<img src="https://example.com/img.png" onerror="alert(1)" alt="img">');
      expect(body.querySelector("img")).not.toBeNull();
      expect(body.innerHTML).not.toContain("onerror");
    });

    it("strips onclick event handler from a paragraph", async () => {
      const body = await renderMail('<p onclick="stealData()">Click me</p>');
      expect(body.innerHTML).not.toContain("onclick");
      expect(body.innerHTML).toContain("Click me");
    });

    it("strips onload event handler", async () => {
      const body = await renderMail('<body onload="xss()"><p>Content</p></body>');
      expect(body.innerHTML).not.toContain("onload");
      expect(body.innerHTML).toContain("Content");
    });
  });

  describe("javascript: URLs are neutralised", () => {
    it("removes href with javascript: scheme", async () => {
      const body = await renderMail('<a href="javascript:alert(1)">Click</a>');
      expect(body.innerHTML).not.toContain("javascript:");
      expect(body.innerHTML).toContain("Click");
    });

    it("removes href with JAVASCRIPT: (uppercase) scheme", async () => {
      const body = await renderMail('<a href="JAVASCRIPT:alert(1)">Link</a>');
      expect(body.innerHTML).not.toContain("JAVASCRIPT:");
      expect(body.innerHTML).toContain("Link");
    });

    it("removes href with data: scheme on anchor", async () => {
      const body = await renderMail('<a href="data:text/html,<script>alert(1)</script>">Link</a>');
      expect(body.innerHTML).not.toContain("data:text/html");
      expect(body.innerHTML).toContain("Link");
    });
  });

  describe("remote image blocking", () => {
    it("blocks remote http images by default — src removed, data-blocked-src set", async () => {
      const body = await renderMail('<img src="https://tracker.evil.com/pixel.gif" alt="pixel">');
      const img = body.querySelector("img");
      expect(img).not.toBeNull();
      expect(img?.getAttribute("src")).toBeFalsy();
      expect(img?.getAttribute("data-blocked-src")).toBe("https://tracker.evil.com/pixel.gif");
    });

    it("shows blocked image count banner when remote images are present", async () => {
      await renderMail('<img src="https://example.com/a.png" alt="a"><img src="https://example.com/b.png" alt="b">');
      expect(await screen.findByText(/2 remote images blocked/i)).toBeInTheDocument();
    });

    it("loads images when Load images button is clicked", async () => {
      await renderMail('<img src="https://example.com/img.png" alt="img">');
      expect(await screen.findByText(/remote image/i)).toBeInTheDocument();
      fireEvent.click(screen.getByRole("button", { name: /load images/i }));
      await waitFor(() => expect(screen.queryByText(/remote image/i)).not.toBeInTheDocument());
      await waitFor(() =>
        expect(getMailBody()?.querySelector("img")?.getAttribute("src")).toBe("https://example.com/img.png"),
      );
    });

    it("does not block inline data: images", async () => {
      const dataUri = "data:image/png;base64,abc123==";
      const body = await renderMail(`<img src="${dataUri}" alt="inline">`);
      const img = body.querySelector("img");
      expect(img).not.toBeNull();
      expect(img?.getAttribute("data-blocked-src")).toBeFalsy();
    });
  });

  describe("link target hardening", () => {
    it("adds target=_blank and rel=noopener noreferrer to all links", async () => {
      const body = await renderMail('<a href="https://example.com">Visit</a>');
      const link = body.querySelector("a");
      expect(link?.getAttribute("target")).toBe("_blank");
      expect(link?.getAttribute("rel")).toContain("noopener");
      expect(link?.getAttribute("rel")).toContain("noreferrer");
    });

    it("adds target and rel even when link has no existing attributes", async () => {
      const body = await renderMail('<a href="https://safe.org">Link</a>');
      const link = body.querySelector("a");
      expect(link?.getAttribute("target")).toBe("_blank");
    });
  });

  describe("legitimate content is preserved", () => {
    it("preserves paragraph text", async () => {
      const body = await renderMail("<p>Hello <strong>world</strong></p>");
      expect(body.textContent).toContain("Hello world");
    });

    it("preserves table structure", async () => {
      const body = await renderMail("<table><tr><td>Cell A</td><td>Cell B</td></tr></table>");
      expect(body.querySelector("table")).not.toBeNull();
      expect(body.querySelector("td")?.textContent).toBe("Cell A");
    });

    it("preserves blockquote", async () => {
      const body = await renderMail("<blockquote><p>Quoted text</p></blockquote>");
      expect(body.querySelector("blockquote")).not.toBeNull();
    });

    it("BITE PROOF — script tags are really stripped (not just obscured)", async () => {
      const body = await renderMail("<div><script>window.__XSS__=1</script><p>Safe</p></div>");
      expect(body.innerHTML).not.toMatch(/<script/i);
      expect(body.innerHTML).not.toContain("__XSS__");
      expect(typeof (window as unknown as Record<string, unknown>)["__XSS__"]).toBe("undefined");
    });
  });
});
