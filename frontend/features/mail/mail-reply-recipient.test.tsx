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

const REPLY_MODE: MailComposeMode = {
  type: "reply",
  messageId: "m1",
  threadId: "t1",
  toEmail: "original-sender@example.com",
  subject: "Re: Quarterly plan",
  accountId: 7,
};

function noop() {}

function renderReply() {
  return render(
    <MailComposeSheet
      open
      onClose={noop}
      mode={REPLY_MODE}
      accounts={ACCOUNTS}
    />,
  );
}

function typeBody(text: string) {
  fireEvent.change(screen.getByTestId("mail-body"), { target: { value: text } });
}

function retargetTo(email: string) {
  fireEvent.click(
    screen.getByRole("button", { name: "Remove original-sender@example.com" }),
  );
  const [toBox] = screen.getAllByPlaceholderText("Recipients...");
  if (!toBox) throw new Error("reply To field is not rendered");
  fireEvent.change(toBox, { target: { value: email } });
  fireEvent.keyDown(toBox, { key: "Enter", code: "Enter" });
}

describe("MailComposeSheet — the reply recipient the sender chose is the one that is sent", () => {
  beforeEach(() => {
    window.localStorage.clear();
    sendMutateAsync.mockReset().mockResolvedValue({ messageId: "sent-1" });
    replyMutateAsync.mockReset().mockResolvedValue({ messageId: "sent-2" });
    toastError.mockReset();
    toastSuccess.mockReset();
  });

  it("transmits a retargeted To — the field is editable and validated, so it must reach the request body", async () => {
    renderReply();

    retargetTo("someone-else@example.com");
    typeBody("<p>sending this to a different person on purpose</p>");
    fireEvent.click(screen.getByRole("button", { name: /send reply/i }));

    await waitFor(() => expect(replyMutateAsync).toHaveBeenCalledTimes(1));
    expect(replyMutateAsync.mock.calls[0]?.[0]).toMatchObject({
      accountId: 7,
      messageId: "m1",
      threadId: "t1",
      to: ["someone-else@example.com"],
    });
    expect(toastSuccess).toHaveBeenCalledTimes(1);
  });

  it("transmits the prefilled To unchanged when the sender does not retarget it", async () => {
    renderReply();

    typeBody("<p>ordinary reply</p>");
    fireEvent.click(screen.getByRole("button", { name: /send reply/i }));

    await waitFor(() => expect(replyMutateAsync).toHaveBeenCalledTimes(1));
    expect(replyMutateAsync.mock.calls[0]?.[0]).toMatchObject({
      to: ["original-sender@example.com"],
    });
  });

  it("refuses to send with an empty To rather than letting the server pick — no success toast, no request", async () => {
    renderReply();

    fireEvent.click(
      screen.getByRole("button", { name: "Remove original-sender@example.com" }),
    );
    typeBody("<p>who is this for</p>");
    fireEvent.click(screen.getByRole("button", { name: /send reply/i }));

    await screen.findByText("At least one recipient is required");
    expect(replyMutateAsync).not.toHaveBeenCalled();
    expect(toastSuccess).not.toHaveBeenCalled();
  });
});
