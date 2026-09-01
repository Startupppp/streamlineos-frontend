import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
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

describe("MailHtmlViewer — HTML sanitization", () => {
  describe("dangerous elements are stripped", () => {
    it("strips <script> tags and their content", () => {
      render(<MailHtmlViewer html='<p>Safe</p><script>alert("xss")</script>' />);
      const body = getMailBody();
      expect(body?.innerHTML).not.toContain("<script");
      expect(body?.innerHTML).not.toContain("alert");
      expect(body?.innerHTML).toContain("Safe");
    });

    it("strips <iframe> elements", () => {
      render(<MailHtmlViewer html='<p>Before</p><iframe src="https://evil.com"></iframe><p>After</p>' />);
      const body = getMailBody();
      expect(body?.innerHTML).not.toContain("<iframe");
      expect(body?.innerHTML).toContain("Before");
      expect(body?.innerHTML).toContain("After");
    });

    it("strips <object> elements", () => {
      render(<MailHtmlViewer html='<object data="https://evil.com/plugin"></object>' />);
      expect(getMailBody()?.innerHTML).not.toContain("<object");
    });
  });

  describe("dangerous attributes are stripped", () => {
    it("strips onerror event handler from img", () => {
      render(<MailHtmlViewer html='<img src="https://example.com/img.png" onerror="alert(1)" alt="img">' />);
      const body = getMailBody();
      expect(body?.innerHTML).not.toContain("onerror");
    });

    it("strips onclick event handler from a paragraph", () => {
      render(<MailHtmlViewer html='<p onclick="stealData()">Click me</p>' />);
      const body = getMailBody();
      expect(body?.innerHTML).not.toContain("onclick");
      expect(body?.innerHTML).toContain("Click me");
    });

    it("strips onload event handler", () => {
      render(<MailHtmlViewer html='<body onload="xss()"><p>Content</p></body>' />);
      expect(getMailBody()?.innerHTML).not.toContain("onload");
    });
  });

  describe("javascript: URLs are neutralised", () => {
    it("removes href with javascript: scheme", () => {
      render(<MailHtmlViewer html='<a href="javascript:alert(1)">Click</a>' />);
      const body = getMailBody();
      expect(body?.innerHTML).not.toContain("javascript:");
      expect(body?.innerHTML).toContain("Click");
    });

    it("removes href with JAVASCRIPT: (uppercase) scheme", () => {
      render(<MailHtmlViewer html='<a href="JAVASCRIPT:alert(1)">Link</a>' />);
      expect(getMailBody()?.innerHTML).not.toContain("JAVASCRIPT:");
    });

    it("removes href with data: scheme on anchor", () => {
      render(<MailHtmlViewer html='<a href="data:text/html,<script>alert(1)</script>">Link</a>' />);
      const body = getMailBody();
      expect(body?.innerHTML).not.toContain("data:text/html");
    });
  });

  describe("remote image blocking", () => {
    it("blocks remote http images by default — src removed, data-blocked-src set", () => {
      render(<MailHtmlViewer html='<img src="https://tracker.evil.com/pixel.gif" alt="pixel">' />);
      const body = getMailBody();
      const imgs = body?.querySelectorAll("img");
      expect(imgs?.length).toBeGreaterThan(0);
      const img = imgs?.[0];
      expect(img?.getAttribute("src")).toBeFalsy();
      expect(img?.getAttribute("data-blocked-src")).toBe("https://tracker.evil.com/pixel.gif");
    });

    it("shows blocked image count banner when remote images are present", () => {
      render(<MailHtmlViewer html='<img src="https://example.com/a.png" alt="a"><img src="https://example.com/b.png" alt="b">' />);
      expect(screen.getByText(/2 remote images blocked/i)).toBeInTheDocument();
    });

    it("loads images when Load images button is clicked", () => {
      render(<MailHtmlViewer html='<img src="https://example.com/img.png" alt="img">' />);
      expect(screen.getByText(/remote image/i)).toBeInTheDocument();
      fireEvent.click(screen.getByRole("button", { name: /load images/i }));
      expect(screen.queryByText(/remote image/i)).not.toBeInTheDocument();
      const body = getMailBody();
      const img = body?.querySelector("img");
      expect(img?.getAttribute("src")).toBe("https://example.com/img.png");
    });

    it("does not block inline data: images", () => {
      const dataUri = "data:image/png;base64,abc123==";
      render(<MailHtmlViewer html={`<img src="${dataUri}" alt="inline">`} />);
      const body = getMailBody();
      const img = body?.querySelector("img");
      expect(img?.getAttribute("data-blocked-src")).toBeFalsy();
    });
  });

  describe("link target hardening", () => {
    it("adds target=_blank and rel=noopener noreferrer to all links", () => {
      render(<MailHtmlViewer html='<a href="https://example.com">Visit</a>' />);
      const body = getMailBody();
      const link = body?.querySelector("a");
      expect(link?.getAttribute("target")).toBe("_blank");
      expect(link?.getAttribute("rel")).toContain("noopener");
      expect(link?.getAttribute("rel")).toContain("noreferrer");
    });

    it("adds target and rel even when link has no existing attributes", () => {
      render(<MailHtmlViewer html='<a href="https://safe.org">Link</a>' />);
      const body = getMailBody();
      const link = body?.querySelector("a");
      expect(link?.getAttribute("target")).toBe("_blank");
    });
  });

  describe("legitimate content is preserved", () => {
    it("preserves paragraph text", () => {
      render(<MailHtmlViewer html="<p>Hello <strong>world</strong></p>" />);
      expect(getMailBody()?.textContent).toContain("Hello world");
    });

    it("preserves table structure", () => {
      const table = "<table><tr><td>Cell A</td><td>Cell B</td></tr></table>";
      render(<MailHtmlViewer html={table} />);
      const body = getMailBody();
      expect(body?.querySelector("table")).not.toBeNull();
      expect(body?.querySelector("td")?.textContent).toBe("Cell A");
    });

    it("preserves blockquote", () => {
      render(<MailHtmlViewer html='<blockquote><p>Quoted text</p></blockquote>' />);
      expect(getMailBody()?.querySelector("blockquote")).not.toBeNull();
    });

    it("BITE PROOF — script tags are really stripped (not just obscured)", () => {
      render(<MailHtmlViewer html='<div><script>window.__XSS__=1</script><p>Safe</p></div>' />);
      const body = getMailBody();
      expect(body?.innerHTML).not.toMatch(/<script/i);
      expect(body?.innerHTML).not.toContain("__XSS__");
      expect(typeof (window as unknown as Record<string, unknown>)["__XSS__"]).toBe("undefined");
    });
  });
});
