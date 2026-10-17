import { fireEvent, render, screen } from "@testing-library/react";
import { MailEmptyPane } from "./mail-empty-pane";
import type { MailMessageSummary } from "@/types/mail";

const refetch = jest.fn();
let queryState: {
  data?: { pages: Array<{ messages: MailMessageSummary[] }> };
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
} = {
  isLoading: false,
  isError: false,
  error: null,
};

jest.mock("@/hooks/api/mail", () => ({
  useMailMessages: () => ({ ...queryState, refetch }),
}));

jest.mock("@/components/ui/scroll-area", () => ({
  SCROLL_AREA_PAGE_BODY_CLASS: "page-body",
  ScrollArea: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

function message(
  overrides: Partial<MailMessageSummary> & Pick<MailMessageSummary, "id">,
): MailMessageSummary {
  return {
    accountId: 7,
    provider: "gmail",
    threadId: null,
    from: { name: "Ada", email: "ada@example.com" },
    to: [],
    subject: "Project update",
    snippet: "This long preview belongs in the main inbox list, not this secondary surface.",
    date: new Date().toISOString(),
    isRead: true,
    isStarred: false,
    hasAttachments: false,
    ...overrides,
  };
}

describe("MailEmptyPane select surface", () => {
  beforeEach(() => {
    refetch.mockClear();
    queryState = { isLoading: false, isError: false, error: null };
  });

  it("renders compact recent-message rows without duplicating snippets and selects a message", () => {
    const needsReply = message({
      id: "needs-reply",
      subject: "Please review the proposal",
      isRead: false,
      hasAttachments: true,
    });
    const recent = message({ id: "recent", from: { name: "Grace", email: "grace@example.com" } });
    queryState.data = { pages: [{ messages: [needsReply, recent] }] };
    const onSelectMessage = jest.fn();

    render(
      <MailEmptyPane
        variant="select"
        selectedAccountId="all"
        onSelectMessage={onSelectMessage}
      />,
    );

    expect(screen.getByRole("heading", { name: "Select a message" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Needs you" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Recent mail" })).toBeInTheDocument();
    expect(screen.queryByText(needsReply.snippet)).not.toBeInTheDocument();
    expect(screen.getByLabelText("Has attachments")).toBeInTheDocument();

    fireEvent.click(
      screen.getByRole("button", {
        name: "Open message from Ada: Please review the proposal",
      }),
    );
    expect(onSelectMessage).toHaveBeenCalledWith(needsReply);
  });

  it("shows preview counts for the rows actually rendered", () => {
    queryState.data = {
      pages: [{ messages: [0, 1, 2, 3].map((index) => message({ id: `unread-${index}`, isRead: false, subject: `Action required ${index}` })) }],
    };

    render(<MailEmptyPane variant="select" onSelectMessage={jest.fn()} />);

    const section = screen.getByRole("heading", { name: "Needs you" }).closest("section");
    expect(section).not.toBeNull();
    expect(section).toHaveTextContent("3");
    expect(screen.queryByText("Action required 3")).toBeNull();
  });

  it("uses the shared empty state when no preview messages are available", () => {
    queryState.data = { pages: [{ messages: [] }] };

    render(<MailEmptyPane variant="select" onSelectMessage={jest.fn()} />);

    expect(screen.getByText("Inbox is clear")).toBeInTheDocument();
    expect(screen.getByText("New mail will appear here when it arrives.")).toBeInTheDocument();
  });

  it("uses PageState error handling and retries the message query", () => {
    queryState = {
      isLoading: false,
      isError: true,
      error: new Error("Mailbox unavailable"),
    };

    render(<MailEmptyPane variant="select" onSelectMessage={jest.fn()} />);

    expect(screen.getByText("Mailbox unavailable")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /try again/i }));
    expect(refetch).toHaveBeenCalledTimes(1);
  });
});
