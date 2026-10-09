import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MailListPane } from "./mail-list-pane";
import type { MailMessageSummary } from "@/types/mail";
import type { MailTriageGroup } from "./mail-group-messages";

const fetchNextPage = jest.fn();
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

jest.mock("@/hooks/api/access", () => ({ useCan: () => true }));
jest.mock("@/hooks/common/use-online-status", () => ({ useOnlineStatus: () => true }));
jest.mock("@/hooks/api/mail", () => ({
  useMailMessages: () => ({ data: { pages: [{ messages, accountErrors: [] }] }, isLoading: false, isError: false, fetchNextPage, hasNextPage: true, isFetchingNextPage: false }),
  useMailAction: () => ({ mutate: jest.fn() }),
  useMailThreadSummary: () => ({ mutateAsync: jest.fn() }),
}));
jest.mock("./mail-virtual-list", () => ({
  MailVirtualList: ({ groups, onAiBrief }: { groups: MailTriageGroup[]; onAiBrief: (accountId: number, threadId: string) => void }) => <div>{groups.flatMap((group) => group.messages).map((message) => <p key={message.id}>{message.subject}</p>)}<button onClick={() => onAiBrief(7, "thread-1")}>Brief test thread</button></div>,
}));

it("filters the current page and keeps explicit pagination outside the toolbar", async () => {
  const user = userEvent.setup();
  render(<MailListPane accounts={[{ id: 7, provider: "gmail", accountEmail: "me@example.com", accountLabel: null, status: "active", isPrimary: true }]} selectedMessageId={null} selectedAccountId="all" onSelectMessage={jest.fn()} onOpenAccountsSheet={jest.fn()} />);
  await user.click(screen.getByRole("combobox", { name: "Filter loaded mail" }));
  await user.click(screen.getByRole("option", { name: "Unread", exact: true }));
  expect(screen.getByText("Unread message")).toBeInTheDocument();
  expect(screen.queryByText("Attachment message")).toBeNull();
  expect(screen.getByRole("navigation", { name: "Pagination" })).toBeInTheDocument();
  expect(screen.getByLabelText("Current page 1")).toBeInTheDocument();
  fetchNextPage.mockResolvedValueOnce({ data: { pages: [{ messages, accountErrors: [] }, { messages: [], accountErrors: [] }] } });
  await user.click(screen.getByRole("button", { name: "Next page" }));
  expect(fetchNextPage).toHaveBeenCalledTimes(1);
  await user.click(screen.getByRole("combobox", { name: "Filter loaded mail" }));
  await user.click(screen.getByRole("option", { name: "With attachments" }));
  expect(screen.queryByText("Unread message")).toBeNull();
  expect(screen.getByText("Attachment message")).toBeInTheDocument();
  await user.click(screen.getByRole("button", { name: "Brief test thread" }));
  expect(screen.getByRole("heading", { name: "Thread brief" })).toBeInTheDocument();
});
