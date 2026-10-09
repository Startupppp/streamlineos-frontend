import { useCallback, useState } from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MailComposeSheet } from "./mail-compose-sheet";
import type { MailComposeMode } from "./mail-compose-schema";
import type { MailAccount } from "@/types/mail";

const sendMutateAsync = jest.fn();
const replyMutateAsync = jest.fn();
const toastError = jest.fn();
const toastSuccess = jest.fn();

jest.mock("next/dynamic", () => ({
  __esModule: true,
  default: () => {
    function MockTiptapEditor({
      content,
      onChangeHtml,
    }: {
      content: string;
      onChangeHtml: (html: string) => void;
    }) {
      return (
        <textarea
          data-testid="mail-body"
          value={content}
          onChange={(e) => onChangeHtml(e.target.value)}
        />
      );
    }
    return MockTiptapEditor;
  },
}));

jest.mock("sonner", () => ({
  toast: {
    error: (...args: unknown[]) => toastError(...args),
    success: (...args: unknown[]) => toastSuccess(...args),
  },
}));

jest.mock("@/hooks/api/mail", () => ({
  useSendMail: () => ({ mutateAsync: sendMutateAsync, isPending: false }),
  useReplyMail: () => ({ mutateAsync: replyMutateAsync, isPending: false }),
  useMailAiDraft: () => ({ mutateAsync: jest.fn(), isPending: false }),
}));

const ACCOUNTS: MailAccount[] = [
  {
    id: 7,
    provider: "gmail",
    accountEmail: "me@example.com",
    accountLabel: null,
    status: "active",
    isPrimary: true,
  },
];

const COMPOSE_MODE: MailComposeMode = { type: "compose" };
const REPLY_MODE: MailComposeMode = {
  type: "reply",
  messageId: "m1",
  threadId: "t1",
  toEmail: "them@example.com",
  subject: "Re: Quarterly plan",
  accountId: 7,
};

const COMPOSE_DRAFT_KEY = "mail:draft:compose:7";
const REPLY_DRAFT_KEY = "mail:draft:reply:7:m1";

function Harness({ mode }: { mode: MailComposeMode }) {
  const [open, setOpen] = useState(true);
  const handleClose = useCallback(() => setOpen(false), []);
  const handleReopen = useCallback(() => setOpen(true), []);
  return (
    <div>
      <button type="button" onClick={handleReopen}>
        reopen
      </button>
      <MailComposeSheet
        open={open}
        onClose={handleClose}
        mode={mode}
        accounts={ACCOUNTS}
      />
    </div>
  );
}

function typeBody(text: string) {
  fireEvent.change(screen.getByTestId("mail-body"), {
    target: { value: text },
  });
}

function readStoredDraft(key: string): unknown {
  const raw = window.localStorage.getItem(key);
  return raw === null ? null : JSON.parse(raw);
}

function setOnline(online: boolean) {
  Object.defineProperty(window.navigator, "onLine", {
    configurable: true,
    get: () => online,
  });
  fireEvent(window, new Event(online ? "online" : "offline"));
}

describe("MailComposeSheet — draft lifecycle and offline sending", () => {
  beforeEach(() => {
    window.localStorage.clear();
    sendMutateAsync.mockReset().mockResolvedValue({ messageId: "sent-1" });
    replyMutateAsync.mockReset().mockResolvedValue({ messageId: "sent-2" });
    toastError.mockReset();
    toastSuccess.mockReset();
    setOnline(true);
  });

  afterEach(() => {
    setOnline(true);
  });

  it("Escape preserves the unsent body and restores it when the sheet reopens", async () => {
    render(<Harness mode={COMPOSE_MODE} />);

    typeBody("<p>half-written thought</p>");
    fireEvent.keyDown(document, { key: "Escape", code: "Escape" });

    await waitFor(() =>
      expect(screen.queryByTestId("mail-body")).not.toBeInTheDocument(),
    );
    expect(readStoredDraft(COMPOSE_DRAFT_KEY)).toMatchObject({
      bodyHtml: "<p>half-written thought</p>",
    });

    fireEvent.click(screen.getByRole("button", { name: /reopen/i }));

    const restored = await screen.findByTestId("mail-body");
    expect(restored).toHaveValue("<p>half-written thought</p>");
  });

  it("recovers recipients and the sending account into the submitted compose payload", async () => {
    const draft = { bodyHtml: "<p>Saved message</p>", subject: "Saved subject", accountId: 8, to: ["to@example.com"], cc: ["cc@example.com"], bcc: ["bcc@example.com"] };
    window.localStorage.setItem(COMPOSE_DRAFT_KEY, JSON.stringify(draft));
    render(<MailComposeSheet open onClose={jest.fn()} mode={COMPOSE_MODE} accounts={[...ACCOUNTS, { ...ACCOUNTS[0], id: 8, accountEmail: "second@example.com", isPrimary: false }]} />);
    fireEvent.click(screen.getByRole("button", { name: /^send$/i }));
    await waitFor(() => expect(sendMutateAsync).toHaveBeenCalledWith(draft));
    expect(window.localStorage.getItem(COMPOSE_DRAFT_KEY)).toBeNull();
  });

  it("BITE PROOF — the restored body really comes from storage, not from a form that was never reset", async () => {
    window.localStorage.setItem(
      COMPOSE_DRAFT_KEY,
      JSON.stringify({ bodyHtml: "<p>from a previous session</p>" }),
    );
    render(<Harness mode={COMPOSE_MODE} />);

    expect(await screen.findByTestId("mail-body")).toHaveValue(
      "<p>from a previous session</p>",
    );
  });

  it("Discard clears the stored draft, so reopening starts empty", async () => {
    render(<Harness mode={COMPOSE_MODE} />);

    typeBody("<p>throwaway</p>");
    fireEvent.click(screen.getByRole("button", { name: /discard/i }));

    await waitFor(() =>
      expect(screen.queryByTestId("mail-body")).not.toBeInTheDocument(),
    );
    expect(window.localStorage.getItem(COMPOSE_DRAFT_KEY)).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: /reopen/i }));
    expect(await screen.findByTestId("mail-body")).toHaveValue("");
  });

  it("offline: send is refused, the draft is kept, and the user is told", async () => {
    render(<Harness mode={REPLY_MODE} />);

    typeBody("<p>reply while the tunnel eats the wifi</p>");
    setOnline(false);
    fireEvent.click(screen.getByRole("button", { name: /send reply/i }));

    await waitFor(() => expect(toastError).toHaveBeenCalledTimes(1));
    expect(replyMutateAsync).not.toHaveBeenCalled();
    expect(String(toastError.mock.calls[0]?.[0])).toMatch(/offline/i);
    expect(readStoredDraft(REPLY_DRAFT_KEY)).toEqual({
      bodyHtml: "<p>reply while the tunnel eats the wifi</p>",
      accountId: 7, to: ["them@example.com"], cc: [],
    });
  });

  it("reconnecting lets the same draft send, and a sent draft is cleared", async () => {
    render(<Harness mode={REPLY_MODE} />);

    typeBody("<p>reply while the tunnel eats the wifi</p>");
    setOnline(false);
    fireEvent.click(screen.getByRole("button", { name: /send reply/i }));
    await waitFor(() => expect(toastError).toHaveBeenCalledTimes(1));

    setOnline(true);
    fireEvent.click(screen.getByRole("button", { name: /send reply/i }));

    await waitFor(() => expect(replyMutateAsync).toHaveBeenCalledTimes(1));
    expect(replyMutateAsync.mock.calls[0]?.[0]).toMatchObject({
      accountId: 7,
      messageId: "m1",
      threadId: "t1",
      bodyHtml: "<p>reply while the tunnel eats the wifi</p>",
    });
    await waitFor(() =>
      expect(window.localStorage.getItem(REPLY_DRAFT_KEY)).toBeNull(),
    );
  });

  it("a failed send keeps the draft and offers a retry", async () => {
    replyMutateAsync.mockRejectedValue(new Error("upstream refused"));
    render(<Harness mode={REPLY_MODE} />);

    typeBody("<p>please survive the failure</p>");
    fireEvent.click(screen.getByRole("button", { name: /send reply/i }));

    await waitFor(() => expect(toastError).toHaveBeenCalledTimes(1));
    expect(readStoredDraft(REPLY_DRAFT_KEY)).toEqual({
      bodyHtml: "<p>please survive the failure</p>",
      accountId: 7, to: ["them@example.com"], cc: [],
    });
    const options = toastError.mock.calls[0]?.[1];
    expect(options).toMatchObject({ action: { label: "Retry" } });
  });

  it("uses equal-width mobile actions and a single-row scrollable AI toolbar", () => {
    render(<Harness mode={COMPOSE_MODE} />);

    const send = screen.getByRole("button", { name: /^send$/i });
    const footer = send.parentElement;
    expect(footer).toHaveClass("grid", "grid-cols-2", "w-full");
    expect(footer).not.toHaveClass("sm:flex");
    expect(send).toHaveClass("w-full");
    expect(send).not.toHaveClass("sm:w-auto");
    expect(screen.getByRole("button", { name: "Discard" })).toHaveClass("w-full");

    const aiToolbar = screen.getByRole("button", { name: "Write with AI" }).parentElement;
    expect(aiToolbar).toHaveClass("flex-nowrap", "overflow-x-auto");
  });

  it("offers a collapsible addressing section", () => {
    render(<Harness mode={COMPOSE_MODE} />);

    const toggle = screen.getByRole("button", { name: "Message details" });
    expect(toggle).toHaveAttribute("aria-expanded", "true");
    expect(toggle).toHaveTextContent("Message details");
    fireEvent.click(toggle);
    expect(toggle).toHaveAttribute("aria-expanded", "false");
    expect(toggle).toHaveTextContent("Add recipients and subject");
    expect(screen.queryByLabelText("Subject")).toBeNull();
  });

  it("starts with message details collapsed on mobile", () => {
    const previousWidth = window.innerWidth;
    Object.defineProperty(window, "innerWidth", { configurable: true, value: 394 });

    render(<Harness mode={COMPOSE_MODE} />);

    expect(screen.getByRole("button", { name: "Message details" })).toHaveAttribute(
      "aria-expanded",
      "false",
    );
    expect(screen.queryByLabelText("Subject")).toBeNull();
    Object.defineProperty(window, "innerWidth", { configurable: true, value: previousWidth });
  });
});
