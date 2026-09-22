import { render, screen, waitFor } from "@testing-library/react";
import { TooltipProvider } from "@/components/ui/tooltip";
import { MailReadingPane } from "./mail-reading-pane";
import type { MailMessageDetail, MailMessageSummary } from "@/types/mail";

const HOSTILE_BODY = [
  "<p>Invoice attached, please pay.</p>",
  '<script>window.__MAIL_XSS__ = 1</script>',
  '<img src="https://tracker.evil.com/pixel.gif" alt="pixel" onerror="window.__MAIL_XSS__ = 2">',
  '<a href="javascript:window.__MAIL_XSS__ = 3">Click here</a>',
  '<a href="https://legit.example.com">Legit link</a>',
  '<iframe src="https://evil.com/frame"></iframe>',
].join("");

const SELECTED: MailMessageSummary = {
  id: "msg-1",
  threadId: "thread-1",
  accountId: 7,
  provider: "gmail",
  from: { name: "Attacker", email: "attacker@example.com" },
  to: [],
  subject: "Payment request",
  snippet: "Invoice attached",
  date: "2026-02-01T10:00:00.000Z",
  isRead: true,
  isStarred: false,
  hasAttachments: false,
};

const THREAD: MailMessageDetail[] = [
  {
    ...SELECTED,
    cc: [],
    bodyHtml: HOSTILE_BODY,
    bodyText: null,
    attachments: [],
  },
];

jest.mock("@/hooks/api/access", () => ({
  useCan: () => false,
}));

jest.mock("@/hooks/api/mail", () => ({
  useMailThread: () => ({
    data: THREAD,
    isLoading: false,
    isFetching: false,
    isError: false,
    error: null,
    refetch: jest.fn(),
  }),
  useMailMessage: () => ({
    data: undefined,
    isLoading: false,
    isFetching: false,
    isError: false,
    error: null,
    refetch: jest.fn(),
  }),
  useMailAction: () => ({ mutate: jest.fn(), isPending: false }),
  useMailThreadSummary: () => ({ mutateAsync: jest.fn(), isPending: false }),
  useMailAiDraft: () => ({ mutateAsync: jest.fn(), isPending: false }),
}));

async function renderPane(): Promise<Element> {
  render(
    <TooltipProvider>
      <MailReadingPane selectedMessage={SELECTED} onReply={jest.fn()} />
    </TooltipProvider>,
  );
  await waitFor(() =>
    expect(document.querySelector(".mail-html-body")?.childElementCount ?? 0).toBeGreaterThan(0),
  );
  const body = document.querySelector(".mail-html-body");
  if (!body) throw new Error("the thread body never reached the sanitizing renderer");
  return body;
}

function xssFlag(): unknown {
  return Reflect.get(window, "__MAIL_XSS__");
}

describe("mail body sanitization runs on the real thread render path", () => {
  beforeEach(() => {
    Reflect.deleteProperty(window, "__MAIL_XSS__");
  });

  it("the reading pane routes provider HTML through the sanitizing renderer", async () => {
    const body = await renderPane();
    expect(body.innerHTML).toContain("Invoice attached, please pay.");
  });

  it("no script from the thread body ever executes or survives into the DOM", async () => {
    const body = await renderPane();

    expect(body.innerHTML).not.toMatch(/<script/i);
    expect(body.innerHTML).not.toContain("__MAIL_XSS__");
    expect(body.querySelector("iframe")).toBeNull();
    expect(xssFlag()).toBeUndefined();
  });

  it("event handlers and javascript: hrefs are stripped from the rendered message", async () => {
    const body = await renderPane();

    expect(body.innerHTML).not.toContain("onerror");
    expect(body.innerHTML).not.toContain("javascript:");

    const anchors = Array.from(body.querySelectorAll("a"));
    expect(anchors).toHaveLength(2);
    expect(anchors[0]?.getAttribute("href")).toBeNull();

    const legit = body.querySelector('a[href="https://legit.example.com"]');
    expect(legit?.getAttribute("target")).toBe("_blank");
    expect(legit?.getAttribute("rel")).toContain("noopener");
  });

  it("remote tracking pixels are held back until the reader asks for them", async () => {
    const body = await renderPane();
    const img = body.querySelector("img");

    expect(img?.getAttribute("src")).toBeFalsy();
    expect(img?.getAttribute("data-blocked-src")).toBe(
      "https://tracker.evil.com/pixel.gif",
    );
    expect(await screen.findByText(/1 remote image blocked/i)).toBeInTheDocument();
  });

  it("BITE PROOF — the payload really is hostile, so a green result means the sanitizer worked", () => {
    expect(HOSTILE_BODY).toMatch(/<script/i);
    expect(HOSTILE_BODY).toContain("onerror=");
    expect(HOSTILE_BODY).toContain("javascript:");

    const raw = document.createElement("div");
    raw.innerHTML = HOSTILE_BODY;
    expect(raw.querySelector("iframe")).not.toBeNull();
    expect(raw.querySelector("a")?.getAttribute("href")).toContain("javascript:");
  });
});
