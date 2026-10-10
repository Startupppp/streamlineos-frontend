import { readThreadView, type ThreadMessageView } from "./mail-thread-view";
import type { MailMessageDetail } from "@/types/mail";

const BASE: MailMessageDetail = {
  id: "msg-1",
  threadId: "thread-1",
  accountId: 7,
  provider: "gmail",
  from: { name: "Sender", email: "sender@example.com" },
  to: [{ name: null, email: "me@example.com" }],
  cc: [],
  subject: "Hello",
  snippet: "Hi there",
  date: "2026-02-01T10:00:00.000Z",
  isRead: false,
  isStarred: false,
  hasAttachments: false,
  bodyHtml: null,
  bodyText: null,
  attachments: [],
};

describe("readThreadView — hydration status", () => {
  it("returns seeded status when messages all have null bodies and fetch is not active", () => {
    const view = readThreadView([BASE], false, false, null);
    expect(view.status).toBe("seeded");
    expect(view.messages).toHaveLength(1);
  });

  it("returns hydrating status when messages all have null bodies and fetch is active", () => {
    const view = readThreadView([BASE], true, false, null);
    expect(view.status).toBe("hydrating");
  });

  it("returns hydrated status when at least one message has an html body", () => {
    const view = readThreadView([{ ...BASE, bodyHtml: "<p>content</p>" }], false, false, null);
    expect(view.status).toBe("hydrated");
  });

  it("returns hydrated status when at least one message has a text body", () => {
    const view = readThreadView([{ ...BASE, bodyText: "plain text" }], false, false, null);
    expect(view.status).toBe("hydrated");
  });

  it("returns hydrated status for an empty message list when not fetching", () => {
    const view = readThreadView([], false, false, null);
    expect(view.status).toBe("hydrated");
    expect(view.messages).toHaveLength(0);
  });

  it("returns hydrating status for an empty message list when fetching", () => {
    const view = readThreadView([], true, false, null);
    expect(view.status).toBe("hydrating");
  });

  it("returns hydrating when undefined messages and fetching — seeded→hydrated transition start", () => {
    const view = readThreadView(undefined, true, false, null);
    expect(view.status).toBe("hydrating");
  });

  it("returns error status when isError is true, attaches the error", () => {
    const err = new Error("fetch failed");
    const view = readThreadView(undefined, false, true, err);
    expect(view.status).toBe("error");
    expect(view.error).toBe(err);
    expect(view.messages).toHaveLength(0);
  });

  it("error status takes precedence over a non-empty message list", () => {
    const view = readThreadView([BASE], false, true, new Error("oops"));
    expect(view.status).toBe("error");
    expect(view.messages).toHaveLength(0);
  });
});

describe("readThreadView — body fallback and hasBody", () => {
  it("null html and null text → safeBodyHtml null, bodyText null, hasBody false", () => {
    const [msg] = readThreadView([BASE], false, false, null).messages as [ThreadMessageView];
    expect(msg.safeBodyHtml).toBeNull();
    expect(msg.bodyText).toBeNull();
    expect(msg.hasBody).toBe(false);
  });

  it("text-only message → bodyText preserved, safeBodyHtml null, hasBody true", () => {
    const [msg] = readThreadView([{ ...BASE, bodyText: "plain text body" }], false, false, null).messages as [ThreadMessageView];
    expect(msg.safeBodyHtml).toBeNull();
    expect(msg.bodyText).toBe("plain text body");
    expect(msg.hasBody).toBe(true);
  });

  it("html body → safeBodyHtml non-null, hasBody true", () => {
    const [msg] = readThreadView([{ ...BASE, bodyHtml: "<p>Hello</p>" }], false, false, null).messages as [ThreadMessageView];
    expect(msg.safeBodyHtml).not.toBeNull();
    expect(msg.hasBody).toBe(true);
  });

  it("preserves bodyText alongside a null html body without modification", () => {
    const [msg] = readThreadView([{ ...BASE, bodyText: "raw text\nline two" }], false, false, null).messages as [ThreadMessageView];
    expect(msg.bodyText).toBe("raw text\nline two");
  });
});

describe("readThreadView — HTML sanitization (moved from mail-html-viewer)", () => {
  it("strips <script> tags and their content", () => {
    const [msg] = readThreadView([{ ...BASE, bodyHtml: '<p>Safe</p><script>alert("xss")</script>' }], false, false, null).messages as [ThreadMessageView];
    expect(msg.safeBodyHtml).not.toContain("<script");
    expect(msg.safeBodyHtml).not.toContain("alert");
    expect(msg.safeBodyHtml).toContain("Safe");
  });

  it("strips <iframe> elements", () => {
    const [msg] = readThreadView([{ ...BASE, bodyHtml: '<p>Before</p><iframe src="https://evil.com"></iframe><p>After</p>' }], false, false, null).messages as [ThreadMessageView];
    expect(msg.safeBodyHtml).not.toContain("<iframe");
    expect(msg.safeBodyHtml).toContain("Before");
    expect(msg.safeBodyHtml).toContain("After");
  });

  it("strips <object> elements", () => {
    const [msg] = readThreadView([{ ...BASE, bodyHtml: '<p>Before</p><object data="https://evil.com/plugin"></object>' }], false, false, null).messages as [ThreadMessageView];
    expect(msg.safeBodyHtml).not.toContain("<object");
    expect(msg.safeBodyHtml).toContain("Before");
  });

  it("strips onerror event handler from img", () => {
    const [msg] = readThreadView([{ ...BASE, bodyHtml: '<img src="https://example.com/img.png" onerror="alert(1)" alt="img">' }], false, false, null).messages as [ThreadMessageView];
    expect(msg.safeBodyHtml).not.toContain("onerror");
  });

  it("strips onclick event handler from a paragraph", () => {
    const [msg] = readThreadView([{ ...BASE, bodyHtml: '<p onclick="stealData()">Click me</p>' }], false, false, null).messages as [ThreadMessageView];
    expect(msg.safeBodyHtml).not.toContain("onclick");
    expect(msg.safeBodyHtml).toContain("Click me");
  });

  it("strips onload event handler", () => {
    const [msg] = readThreadView([{ ...BASE, bodyHtml: '<body onload="xss()"><p>Content</p></body>' }], false, false, null).messages as [ThreadMessageView];
    expect(msg.safeBodyHtml).not.toContain("onload");
    expect(msg.safeBodyHtml).toContain("Content");
  });

  it("removes href with javascript: scheme", () => {
    const [msg] = readThreadView([{ ...BASE, bodyHtml: '<a href="javascript:alert(1)">Click</a>' }], false, false, null).messages as [ThreadMessageView];
    expect(msg.safeBodyHtml).not.toContain("javascript:");
    expect(msg.safeBodyHtml).toContain("Click");
  });

  it("removes href with JAVASCRIPT: (uppercase) scheme", () => {
    const [msg] = readThreadView([{ ...BASE, bodyHtml: '<a href="JAVASCRIPT:alert(1)">Link</a>' }], false, false, null).messages as [ThreadMessageView];
    expect(msg.safeBodyHtml).not.toContain("JAVASCRIPT:");
    expect(msg.safeBodyHtml).toContain("Link");
  });

  it("removes href with data: scheme on anchor", () => {
    const [msg] = readThreadView([{ ...BASE, bodyHtml: '<a href="data:text/html,<script>alert(1)</script>">Link</a>' }], false, false, null).messages as [ThreadMessageView];
    expect(msg.safeBodyHtml).not.toContain("data:text/html");
    expect(msg.safeBodyHtml).toContain("Link");
  });

  it("preserves paragraph text through sanitization", () => {
    const [msg] = readThreadView([{ ...BASE, bodyHtml: "<p>Hello <strong>world</strong></p>" }], false, false, null).messages as [ThreadMessageView];
    expect(msg.safeBodyHtml).toContain("Hello");
    expect(msg.safeBodyHtml).toContain("world");
  });

  it("preserves table structure", () => {
    const [msg] = readThreadView([{ ...BASE, bodyHtml: "<table><tr><td>Cell A</td><td>Cell B</td></tr></table>" }], false, false, null).messages as [ThreadMessageView];
    expect(msg.safeBodyHtml).toContain("<table");
    expect(msg.safeBodyHtml).toContain("Cell A");
  });

  it("preserves blockquote", () => {
    const [msg] = readThreadView([{ ...BASE, bodyHtml: "<blockquote><p>Quoted text</p></blockquote>" }], false, false, null).messages as [ThreadMessageView];
    expect(msg.safeBodyHtml).toContain("<blockquote");
  });

  it("BITE PROOF — script tags are really stripped, not just obscured", () => {
    const [msg] = readThreadView([{ ...BASE, bodyHtml: "<div><script>window.__XSS__=1</script><p>Safe</p></div>" }], false, false, null).messages as [ThreadMessageView];
    expect(msg.safeBodyHtml).not.toMatch(/<script/i);
    expect(msg.safeBodyHtml).not.toContain("__XSS__");
    expect(typeof (window as unknown as Record<string, unknown>)["__XSS__"]).toBe("undefined");
  });

  it("malformed HTML does not throw and produces sanitized output", () => {
    expect(() => {
      readThreadView([{ ...BASE, bodyHtml: "<p>unclosed<b>bold<div>nested" }], false, false, null);
    }).not.toThrow();
    const [msg] = readThreadView([{ ...BASE, bodyHtml: "<p>unclosed<b>bold<div>nested" }], false, false, null).messages as [ThreadMessageView];
    expect(msg.safeBodyHtml).toContain("bold");
  });
});

describe("readThreadView — link and image hardening", () => {
  it("adds target=_blank and rel=noopener noreferrer to all links", () => {
    const [msg] = readThreadView([{ ...BASE, bodyHtml: '<a href="https://example.com">Visit</a>' }], false, false, null).messages as [ThreadMessageView];
    expect(msg.safeBodyHtml).toContain('target="_blank"');
    expect(msg.safeBodyHtml).toContain("noopener");
    expect(msg.safeBodyHtml).toContain("noreferrer");
  });

  it("adds target and rel even when link has no existing attributes", () => {
    const [msg] = readThreadView([{ ...BASE, bodyHtml: '<a href="https://safe.org">Link</a>' }], false, false, null).messages as [ThreadMessageView];
    expect(msg.safeBodyHtml).toContain('target="_blank"');
  });

  it("adds loading=lazy and referrerpolicy=no-referrer to remote images", () => {
    const [msg] = readThreadView([{ ...BASE, bodyHtml: '<img src="https://tracker.evil.com/pixel.gif" alt="pixel">' }], false, false, null).messages as [ThreadMessageView];
    expect(msg.safeBodyHtml).toContain('loading="lazy"');
    expect(msg.safeBodyHtml).toContain('referrerpolicy="no-referrer"');
  });

  it("does not strip inline data: images", () => {
    const dataUri = "data:image/png;base64,abc123==";
    const [msg] = readThreadView([{ ...BASE, bodyHtml: `<img src="${dataUri}" alt="inline">` }], false, false, null).messages as [ThreadMessageView];
    expect(msg.safeBodyHtml).toContain(dataUri);
  });
});

describe("readThreadView — remote image count and blocked image count", () => {
  it("counts zero remote images when body has no images", () => {
    const [msg] = readThreadView([{ ...BASE, bodyHtml: "<p>text only</p>" }], false, false, null).messages as [ThreadMessageView];
    expect(msg.remoteImageCount).toBe(0);
  });

  it("counts one remote image for a single https img src", () => {
    const [msg] = readThreadView([{ ...BASE, bodyHtml: '<img src="https://example.com/logo.png">' }], false, false, null).messages as [ThreadMessageView];
    expect(msg.remoteImageCount).toBe(1);
  });

  it("counts multiple remote images", () => {
    const [msg] = readThreadView([{ ...BASE, bodyHtml: '<img src="https://a.com/1.png"><img src="https://b.com/2.png">' }], false, false, null).messages as [ThreadMessageView];
    expect(msg.remoteImageCount).toBe(2);
  });

  it("does not count data: URIs as remote images", () => {
    const [msg] = readThreadView([{ ...BASE, bodyHtml: '<img src="data:image/png;base64,abc">' }], false, false, null).messages as [ThreadMessageView];
    expect(msg.remoteImageCount).toBe(0);
  });

  it("blocked image count is zero because remote images load with privacy hardening, not blocking", () => {
    const [msg] = readThreadView([{ ...BASE, bodyHtml: '<img src="https://tracker.example.com/pixel.gif">' }], false, false, null).messages as [ThreadMessageView];
    expect(msg.blockedImageCount).toBe(0);
  });

  it("remote images count is zero when body is null", () => {
    const [msg] = readThreadView([BASE], false, false, null).messages as [ThreadMessageView];
    expect(msg.remoteImageCount).toBe(0);
  });
});

describe("readThreadView — attachment descriptors", () => {
  it("passes attachments through unchanged", () => {
    const attachments = [
      { id: "att-1", fileName: "doc.pdf", mimeType: "application/pdf", sizeBytes: 102400 },
    ];
    const [msg] = readThreadView([{ ...BASE, attachments }], false, false, null).messages as [ThreadMessageView];
    expect(msg.attachments).toEqual(attachments);
  });

  it("empty attachments array passes through", () => {
    const [msg] = readThreadView([BASE], false, false, null).messages as [ThreadMessageView];
    expect(msg.attachments).toEqual([]);
  });
});

describe("readThreadView — message ordering", () => {
  it("preserves the order of messages", () => {
    const m1 = { ...BASE, id: "msg-1", bodyHtml: "<p>first</p>" };
    const m2 = { ...BASE, id: "msg-2", bodyHtml: "<p>second</p>" };
    const view = readThreadView([m1, m2], false, false, null);
    expect(view.messages[0]?.id).toBe("msg-1");
    expect(view.messages[1]?.id).toBe("msg-2");
  });
});
