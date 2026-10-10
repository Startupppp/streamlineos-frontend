import { renderHook } from "@testing-library/react";
import { useMailThreadView } from "./mail-thread-view";
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

let mockThreadResult: {
  data: MailMessageDetail[] | undefined;
  isLoading: boolean;
  isFetching: boolean;
  isError: boolean;
  error: unknown;
  refetch: () => void;
};

jest.mock("@/hooks/api/mail", () => ({
  useMailThread: () => mockThreadResult,
  useMailMessage: () => ({
    data: undefined,
    isLoading: false,
    isFetching: false,
    isError: false,
    error: null,
    refetch: jest.fn(),
  }),
}));

function renderWith(
  messages: MailMessageDetail[] | undefined,
  opts: { isFetching?: boolean; isError?: boolean; error?: unknown } = {},
) {
  mockThreadResult = {
    data: messages,
    isLoading: false,
    isFetching: opts.isFetching ?? false,
    isError: opts.isError ?? false,
    error: opts.error ?? null,
    refetch: jest.fn(),
  };
  const { result } = renderHook(() =>
    useMailThreadView({ accountId: 7, threadId: "t1", messageId: undefined }),
  );
  return result.current;
}

describe("useMailThreadView — hydration status", () => {
  it("returns seeded status when messages all have null bodies and fetch is not active", () => {
    const view = renderWith([BASE]);
    expect(view.status).toBe("seeded");
    expect(view.messages).toHaveLength(1);
  });

  it("returns hydrating status when messages all have null bodies and fetch is active", () => {
    const view = renderWith([BASE], { isFetching: true });
    expect(view.status).toBe("hydrating");
  });

  it("returns hydrated status when at least one message has an html body", () => {
    const view = renderWith([{ ...BASE, bodyHtml: "<p>content</p>" }]);
    expect(view.status).toBe("hydrated");
  });

  it("returns hydrated status when at least one message has a text body", () => {
    const view = renderWith([{ ...BASE, bodyText: "plain text" }]);
    expect(view.status).toBe("hydrated");
  });

  it("returns hydrated status for an empty message list when not fetching", () => {
    const view = renderWith([]);
    expect(view.status).toBe("hydrated");
    expect(view.messages).toHaveLength(0);
  });

  it("returns hydrating status for an empty message list when fetching", () => {
    const view = renderWith([], { isFetching: true });
    expect(view.status).toBe("hydrating");
  });

  it("returns hydrating when undefined messages and fetching — seeded→hydrated transition start", () => {
    const view = renderWith(undefined, { isFetching: true });
    expect(view.status).toBe("hydrating");
  });

  it("returns error status when isError is true, attaches the error", () => {
    const err = new Error("fetch failed");
    const view = renderWith(undefined, { isError: true, error: err });
    expect(view.status).toBe("error");
    expect(view.error).toBe(err);
    expect(view.messages).toHaveLength(0);
  });

  it("error status takes precedence over a non-empty message list", () => {
    const view = renderWith([BASE], { isError: true, error: new Error("oops") });
    expect(view.status).toBe("error");
    expect(view.messages).toHaveLength(0);
  });
});

describe("useMailThreadView — body fallback and hasBody", () => {
  it("null html and null text → safeBodyHtml null, bodyText null, hasBody false", () => {
    const view = renderWith([BASE]);
    const msg = view.messages[0]!;
    expect(msg.safeBodyHtml).toBeNull();
    expect(msg.bodyText).toBeNull();
    expect(msg.hasBody).toBe(false);
  });

  it("text-only message → bodyText preserved, safeBodyHtml null, hasBody true", () => {
    const view = renderWith([{ ...BASE, bodyText: "plain text body" }]);
    const msg = view.messages[0]!;
    expect(msg.safeBodyHtml).toBeNull();
    expect(msg.bodyText).toBe("plain text body");
    expect(msg.hasBody).toBe(true);
  });

  it("html body → safeBodyHtml non-null, hasBody true", () => {
    const view = renderWith([{ ...BASE, bodyHtml: "<p>Hello</p>" }]);
    const msg = view.messages[0]!;
    expect(msg.safeBodyHtml).not.toBeNull();
    expect(msg.hasBody).toBe(true);
  });

  it("preserves bodyText alongside a null html body without modification", () => {
    const view = renderWith([{ ...BASE, bodyText: "raw text\nline two" }]);
    expect(view.messages[0]!.bodyText).toBe("raw text\nline two");
  });
});

describe("useMailThreadView — HTML sanitization (moved from mail-html-viewer)", () => {
  it("strips <script> tags and their content", () => {
    const view = renderWith([{ ...BASE, bodyHtml: '<p>Safe</p><script>alert("xss")</script>' }]);
    const html = view.messages[0]!.safeBodyHtml;
    expect(html).not.toContain("<script");
    expect(html).not.toContain("alert");
    expect(html).toContain("Safe");
  });

  it("strips <iframe> elements", () => {
    const view = renderWith([{ ...BASE, bodyHtml: '<p>Before</p><iframe src="https://evil.com"></iframe><p>After</p>' }]);
    const html = view.messages[0]!.safeBodyHtml;
    expect(html).not.toContain("<iframe");
    expect(html).toContain("Before");
    expect(html).toContain("After");
  });

  it("strips <object> elements", () => {
    const view = renderWith([{ ...BASE, bodyHtml: '<p>Before</p><object data="https://evil.com/plugin"></object>' }]);
    const html = view.messages[0]!.safeBodyHtml;
    expect(html).not.toContain("<object");
    expect(html).toContain("Before");
  });

  it("strips onerror event handler from img", () => {
    const view = renderWith([{ ...BASE, bodyHtml: '<img src="https://example.com/img.png" onerror="alert(1)" alt="img">' }]);
    expect(view.messages[0]!.safeBodyHtml).not.toContain("onerror");
  });

  it("strips onclick event handler from a paragraph", () => {
    const view = renderWith([{ ...BASE, bodyHtml: '<p onclick="stealData()">Click me</p>' }]);
    const html = view.messages[0]!.safeBodyHtml;
    expect(html).not.toContain("onclick");
    expect(html).toContain("Click me");
  });

  it("strips onload event handler", () => {
    const view = renderWith([{ ...BASE, bodyHtml: '<body onload="xss()"><p>Content</p></body>' }]);
    const html = view.messages[0]!.safeBodyHtml;
    expect(html).not.toContain("onload");
    expect(html).toContain("Content");
  });

  it("removes href with javascript: scheme", () => {
    const view = renderWith([{ ...BASE, bodyHtml: '<a href="javascript:alert(1)">Click</a>' }]);
    const html = view.messages[0]!.safeBodyHtml;
    expect(html).not.toContain("javascript:");
    expect(html).toContain("Click");
  });

  it("removes href with JAVASCRIPT: (uppercase) scheme", () => {
    const view = renderWith([{ ...BASE, bodyHtml: '<a href="JAVASCRIPT:alert(1)">Link</a>' }]);
    const html = view.messages[0]!.safeBodyHtml;
    expect(html).not.toContain("JAVASCRIPT:");
    expect(html).toContain("Link");
  });

  it("removes href with data: scheme on anchor", () => {
    const view = renderWith([{ ...BASE, bodyHtml: '<a href="data:text/html,<script>alert(1)</script>">Link</a>' }]);
    const html = view.messages[0]!.safeBodyHtml;
    expect(html).not.toContain("data:text/html");
    expect(html).toContain("Link");
  });

  it("preserves paragraph text through sanitization", () => {
    const view = renderWith([{ ...BASE, bodyHtml: "<p>Hello <strong>world</strong></p>" }]);
    const html = view.messages[0]!.safeBodyHtml;
    expect(html).toContain("Hello");
    expect(html).toContain("world");
  });

  it("preserves table structure", () => {
    const view = renderWith([{ ...BASE, bodyHtml: "<table><tr><td>Cell A</td><td>Cell B</td></tr></table>" }]);
    const html = view.messages[0]!.safeBodyHtml;
    expect(html).toContain("<table");
    expect(html).toContain("Cell A");
  });

  it("preserves blockquote", () => {
    const view = renderWith([{ ...BASE, bodyHtml: "<blockquote><p>Quoted text</p></blockquote>" }]);
    expect(view.messages[0]!.safeBodyHtml).toContain("<blockquote");
  });

  it("BITE PROOF — script tags are really stripped, not just obscured", () => {
    const view = renderWith([{ ...BASE, bodyHtml: "<div><script>window.__XSS__=1</script><p>Safe</p></div>" }]);
    const html = view.messages[0]!.safeBodyHtml;
    expect(html).not.toMatch(/<script/i);
    expect(html).not.toContain("__XSS__");
    expect(typeof (window as unknown as Record<string, unknown>)["__XSS__"]).toBe("undefined");
  });

  it("malformed HTML does not throw and produces sanitized output", () => {
    expect(() => {
      renderWith([{ ...BASE, bodyHtml: "<p>unclosed<b>bold<div>nested" }]);
    }).not.toThrow();
    const view = renderWith([{ ...BASE, bodyHtml: "<p>unclosed<b>bold<div>nested" }]);
    expect(view.messages[0]!.safeBodyHtml).toContain("bold");
  });
});

describe("useMailThreadView — link and image hardening", () => {
  it("adds target=_blank and rel=noopener noreferrer to all links", () => {
    const view = renderWith([{ ...BASE, bodyHtml: '<a href="https://example.com">Visit</a>' }]);
    const html = view.messages[0]!.safeBodyHtml;
    expect(html).toContain('target="_blank"');
    expect(html).toContain("noopener");
    expect(html).toContain("noreferrer");
  });

  it("adds target and rel even when link has no existing attributes", () => {
    const view = renderWith([{ ...BASE, bodyHtml: '<a href="https://safe.org">Link</a>' }]);
    expect(view.messages[0]!.safeBodyHtml).toContain('target="_blank"');
  });

  it("adds loading=lazy and referrerpolicy=no-referrer to remote images", () => {
    const view = renderWith([{ ...BASE, bodyHtml: '<img src="https://tracker.evil.com/pixel.gif" alt="pixel">' }]);
    const html = view.messages[0]!.safeBodyHtml;
    expect(html).toContain('loading="lazy"');
    expect(html).toContain('referrerpolicy="no-referrer"');
  });

  it("does not strip inline data: images", () => {
    const dataUri = "data:image/png;base64,abc123==";
    const view = renderWith([{ ...BASE, bodyHtml: `<img src="${dataUri}" alt="inline">` }]);
    expect(view.messages[0]!.safeBodyHtml).toContain(dataUri);
  });
});

describe("useMailThreadView — remote image count and blocked image count", () => {
  it("counts zero remote images when body has no images", () => {
    const view = renderWith([{ ...BASE, bodyHtml: "<p>text only</p>" }]);
    expect(view.messages[0]!.remoteImageCount).toBe(0);
  });

  it("counts one remote image for a single https img src", () => {
    const view = renderWith([{ ...BASE, bodyHtml: '<img src="https://example.com/logo.png">' }]);
    expect(view.messages[0]!.remoteImageCount).toBe(1);
  });

  it("counts multiple remote images", () => {
    const view = renderWith([{ ...BASE, bodyHtml: '<img src="https://a.com/1.png"><img src="https://b.com/2.png">' }]);
    expect(view.messages[0]!.remoteImageCount).toBe(2);
  });

  it("does not count data: URIs as remote images", () => {
    const view = renderWith([{ ...BASE, bodyHtml: '<img src="data:image/png;base64,abc">' }]);
    expect(view.messages[0]!.remoteImageCount).toBe(0);
  });

  it("blocked image count is zero because remote images load with privacy hardening, not blocking", () => {
    const view = renderWith([{ ...BASE, bodyHtml: '<img src="https://tracker.example.com/pixel.gif">' }]);
    expect(view.messages[0]!.blockedImageCount).toBe(0);
  });

  it("remote images count is zero when body is null", () => {
    const view = renderWith([BASE]);
    expect(view.messages[0]!.remoteImageCount).toBe(0);
  });
});

describe("useMailThreadView — attachment descriptors", () => {
  it("passes attachments through unchanged", () => {
    const attachments = [
      { id: "att-1", fileName: "doc.pdf", mimeType: "application/pdf", sizeBytes: 102400 },
    ];
    const view = renderWith([{ ...BASE, attachments }]);
    expect(view.messages[0]!.attachments).toEqual(attachments);
  });

  it("empty attachments array passes through", () => {
    const view = renderWith([BASE]);
    expect(view.messages[0]!.attachments).toEqual([]);
  });
});

describe("useMailThreadView — message ordering", () => {
  it("preserves the order of messages", () => {
    const m1 = { ...BASE, id: "msg-1", bodyHtml: "<p>first</p>" };
    const m2 = { ...BASE, id: "msg-2", bodyHtml: "<p>second</p>" };
    const view = renderWith([m1, m2]);
    expect(view.messages[0]?.id).toBe("msg-1");
    expect(view.messages[1]?.id).toBe("msg-2");
  });
});
