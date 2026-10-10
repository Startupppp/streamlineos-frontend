import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MailListPane } from "./mail-list-pane";
import type { MailMessageSummary } from "@/types/mail";
import type { MailTriageGroup } from "./mail-group-messages";

const fetchNextPage = jest.fn();
const generateThreadBrief = jest.fn().mockResolvedValue({
  summary: "Short summary.",
  actionItems: ["Review the message"],
});
beforeAll(() => {
  Object.defineProperties(HTMLElement.prototype, {
    hasPointerCapture: { configurable: true, value: () => false },
    setPointerCapture: { configurable: true, value: () => undefined },
    releasePointerCapture: { configurable: true, value: () => undefined },
    scrollIntoView: { configurable: true, value: () => undefined },
  });
});
const base: MailMessageSummary = {
  id: "unread", accountId: 7, provider: "gmail", threadId: null,
  from: { name: "Sender", email: "sender@example.com" }, to: [],
  subject: "Unread message", snippet: "Hello", date: "2026-10-09T08:00:00Z",
  isRead: false, isStarred: false, hasAttachments: false,
};
const messages = [base, { ...base, id: "attachment", subject: "Attachment message", isRead: true, hasAttachments: true }];
let mailPages = [{ messages, accountErrors: [] }];

jest.mock("@/hooks/api/access", () => ({ useCan: () => true }));
jest.mock("@/hooks/common/use-online-status", () => ({ useOnlineStatus: () => true }));
jest.mock("@/hooks/api/mail", () => ({
  useMailMessages: () => ({ data: { pages: mailPages }, isLoading: false, isError: false, fetchNextPage, hasNextPage: true, isFetchingNextPage: false }),
  useMailAction: () => ({ mutate: jest.fn() }),
  useMailThreadSummary: () => ({ mutateAsync: generateThreadBrief }),
}));

beforeEach(() => {
  mailPages = [{ messages, accountErrors: [] }];
  fetchNextPage.mockReset();
});
jest.mock("./mail-virtual-list", () => ({
  MailVirtualList: ({ groups, onAiBrief }: { groups: MailTriageGroup[]; onAiBrief: (accountId: number, threadId: string) => void }) => <div>{groups.flatMap((group) => group.messages).map((message) => <p key={message.id}>{message.subject}</p>)}<button onClick={() => onAiBrief(7, "thread-1")}>Brief test thread</button></div>,
}));

it("filters loaded messages and keeps cumulative pagination outside the toolbar", async () => {
  const user = userEvent.setup();
  const { container } = render(<MailListPane accounts={[{ id: 7, provider: "gmail", accountEmail: "me@example.com", accountLabel: null, status: "active", isPrimary: true }]} selectedMessageId={null} selectedAccountId="all" onSelectMessage={jest.fn()} onOpenAccountsSheet={jest.fn()} />);
  expect(screen.queryByRole("button", { name: "Filters" })).toBeNull();
  expect(container.querySelector('[data-slot="mail-mobile-filters"]')).toBeNull();
  const mobileFilter = screen.getByRole("combobox", { name: "Filter loaded mail" });
  await user.click(mobileFilter);
  await user.click(screen.getByRole("option", { name: /^Unread$/ }));
  expect(screen.getByText("Unread message")).toBeInTheDocument();
  expect(screen.queryByText("Attachment message")).toBeNull();
  expect(screen.getByRole("navigation", { name: "Pagination" })).toHaveClass("sticky", "bottom-0", "z-40", "max-md:fixed", "max-md:bottom-[calc(4rem+env(safe-area-inset-bottom))]");
  expect(screen.getByLabelText("1 page loaded")).toBeInTheDocument();
  fetchNextPage.mockResolvedValueOnce({ data: { pages: [{ messages, accountErrors: [] }, { messages: [], accountErrors: [] }] } });
  await user.click(screen.getByRole("button", { name: "Load more" }));
  expect(fetchNextPage).toHaveBeenCalledTimes(1);
  await user.click(mobileFilter);
  await user.click(screen.getByRole("option", { name: "With attachments" }));
  expect(screen.queryByText("Unread message")).toBeNull();
  expect(screen.getByText("Attachment message")).toBeInTheDocument();
  await user.click(screen.getByRole("button", { name: "Brief test thread" }));
  expect(screen.getByRole("heading", { name: "Thread brief" })).toBeInTheDocument();
  expect(screen.getByText("Key points and next steps from this thread.")).toBeInTheDocument();
  expect(await screen.findByText("Short summary.")).toBeInTheDocument();
  expect(screen.queryByText(/persistent summary|review it before acting/i)).toBeNull();
});

it("renders the mobile search and view filter directly without a generic Filters trigger", () => {
  const { container } = render(<MailListPane accounts={[{ id: 7, provider: "gmail", accountEmail: "me@example.com", accountLabel: null, status: "active", isPrimary: true }]} selectedMessageId={null} selectedAccountId="all" onSelectMessage={jest.fn()} onOpenAccountsSheet={jest.fn()} />);

  expect(container.querySelector('[data-slot="mail-mobile-filters"]')).toBeNull();
  expect(container.querySelector('[data-slot="mail-toolbar"]')).toHaveClass("flex-row");
  expect(screen.getAllByRole("combobox", { name: "Filter loaded mail" })).toHaveLength(1);
  expect(screen.queryByRole("button", { name: "Filters" })).toBeNull();
});

it("keeps the first 25 messages visible when loading the next cursor page", async () => {
  const user = userEvent.setup();
  const renderPane = () => <MailListPane accounts={[{ id: 7, provider: "gmail", accountEmail: "me@example.com", accountLabel: null, status: "active", isPrimary: true }]} selectedMessageId={null} selectedAccountId="all" onSelectMessage={jest.fn()} onOpenAccountsSheet={jest.fn()} />;
  const view = render(renderPane());

  fetchNextPage.mockImplementationOnce(async () => {
    mailPages = [
      { messages, accountErrors: [] },
      {
        messages: [
          { ...base, id: "page-two", subject: "Message from page two" },
        ],
        accountErrors: [],
      },
    ];
    return { data: { pages: mailPages } };
  });

  expect(screen.getByText("Load more")).toBeVisible();
  await user.click(screen.getByRole("button", { name: "Load more" }));
  view.rerender(renderPane());

  expect(screen.getByText("Unread message")).toBeInTheDocument();
  expect(screen.getByText("Message from page two")).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Load more" })).toBeInTheDocument();
  expect(screen.getByLabelText("2 pages loaded")).toBeInTheDocument();
});
