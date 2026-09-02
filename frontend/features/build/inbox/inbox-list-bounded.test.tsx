/**
 * The Build inbox read `/notifications` once with `limit: 100`, so it mounted
 * 100 rows at a time AND made notification 101 unreachable — there was no
 * cursor and no pager. The Mentions tab filtered that same fixed page
 * client-side, so a mention older than the newest 100 notifications could not be
 * reached at all. These assert the cursor read, the render bound, and that
 * nothing sits behind the bound unreachably.
 */
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { InboxList } from "./inbox-list";
import { INBOX_FETCH_PAGE_SIZE, INBOX_RENDER_PAGE_SIZE } from "./inbox-render-window";
import type { Notification } from "@/types/notifications";

const useInfiniteNotifications = jest.fn();
const fetchNextPage = jest.fn();

jest.mock("@/hooks/api/notifications", () => ({
  useInfiniteNotifications: (params: unknown) => useInfiniteNotifications(params),
  useMarkNotificationRead: () => ({ mutate: jest.fn() }),
  useMarkAllNotificationsRead: () => ({ mutate: jest.fn(), isPending: false }),
}));

jest.mock("./inbox-notification-item", () => ({
  InboxNotificationItem: ({ notification }: { notification: { title: string } }) => (
    <div>{notification.title}</div>
  ),
}));

function makeNotifications(count: number): Notification[] {
  return Array.from({ length: count }, (_, i) => ({
    id: i + 1,
    orgId: "org-1",
    userId: "user-1",
    type: "INFO" as const,
    priority: "NORMAL" as const,
    category: "PROJECTS" as const,
    sourceModule: "build",
    eventKey: "build.ticket.mention",
    title: `notification-${i + 1}`,
    message: null,
    link: null,
    isRead: false,
    pinned: false,
    channel: "IN_APP",
    archivedAt: null,
    snoozedUntil: null,
    createdAt: "2026-01-01T00:00:00.000Z",
  }));
}

function mockPages(counts: number[], hasNextPage: boolean) {
  let issued = 0;
  const pages = counts.map((count) => {
    const page = makeNotifications(count).map((n) => ({ ...n, id: n.id + issued, title: `notification-${n.id + issued}` }));
    issued += count;
    return page;
  });
  useInfiniteNotifications.mockReturnValue({
    data: { pages, pageParams: [] },
    isLoading: false,
    isError: false,
    error: null,
    refetch: jest.fn(),
    hasNextPage,
    isFetchingNextPage: false,
    fetchNextPage,
  });
}

const noop = () => undefined;

function renderInbox() {
  return render(<InboxList selectedId={null} onSelect={noop} />);
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe("InboxList — it reads a cursor, not one fixed page", () => {
  it("asks for a page the cursor route can continue from", () => {
    mockPages([INBOX_FETCH_PAGE_SIZE], true);
    renderInbox();
    expect(useInfiniteNotifications).toHaveBeenCalledWith(
      expect.objectContaining({ section: "UNREAD", limit: INBOX_FETCH_PAGE_SIZE }),
    );
  });

  it("offers a way to reach the notifications after the first page", async () => {
    const user = userEvent.setup();
    mockPages([INBOX_FETCH_PAGE_SIZE], true);
    renderInbox();
    await user.click(screen.getByRole("button", { name: /load older notifications/i }));
    expect(fetchNextPage).toHaveBeenCalledTimes(1);
  });
});

describe("InboxList — the mounted row count is bounded", () => {
  it("mounts one page of rows for 300 accumulated notifications, not 300", () => {
    mockPages([100, 100, 100], false);
    renderInbox();
    expect(screen.getAllByRole("listitem")).toHaveLength(INBOX_RENDER_PAGE_SIZE);
  });

  it("mounts every row when the accumulated pages already fit one window", () => {
    mockPages([8], false);
    renderInbox();
    expect(screen.getAllByRole("listitem")).toHaveLength(8);
    expect(screen.queryByRole("button", { name: /show .* more/i })).toBeNull();
  });

  it("keeps row 51 reachable behind the bound", async () => {
    const user = userEvent.setup();
    mockPages([100, 100, 100], false);
    renderInbox();
    expect(screen.queryByText("notification-51")).toBeNull();
    await user.click(screen.getByRole("button", { name: /show 30 more \(30 of 300\)/i }));
    expect(screen.getByText("notification-51")).toBeInTheDocument();
    expect(screen.getAllByRole("listitem")).toHaveLength(INBOX_RENDER_PAGE_SIZE * 2);
  });

  it("reveals held rows without firing a second cursor request", async () => {
    const user = userEvent.setup();
    mockPages([100, 100, 100], true);
    renderInbox();
    await user.click(screen.getByRole("button", { name: /show 30 more/i }));
    expect(fetchNextPage).not.toHaveBeenCalled();
  });
});

describe("InboxList — the bound keeps its semantics", () => {
  it("names the list and reports the true set size", () => {
    mockPages([100, 100, 100], false);
    renderInbox();
    expect(screen.getByRole("list", { name: "Notifications" })).toBeInTheDocument();
    const rows = screen.getAllByRole("listitem");
    expect(rows[0]).toHaveAttribute("aria-setsize", "300");
    expect(rows[0]).toHaveAttribute("aria-posinset", "1");
  });

  it("declares the set size unknown while the cursor has more pages", () => {
    mockPages([100], true);
    renderInbox();
    expect(screen.getAllByRole("listitem")[0]).toHaveAttribute("aria-setsize", "-1");
  });
});

describe("InboxList — changing the filter resets the window", () => {
  it("goes back to the first page of rows when the tab changes", async () => {
    const user = userEvent.setup();
    mockPages([100, 100, 100], false);
    renderInbox();
    await user.click(screen.getByRole("button", { name: /show 30 more/i }));
    expect(screen.getAllByRole("listitem")).toHaveLength(INBOX_RENDER_PAGE_SIZE * 2);
    await user.click(screen.getByRole("tab", { name: "All" }));
    expect(screen.getAllByRole("listitem")).toHaveLength(INBOX_RENDER_PAGE_SIZE);
  });

  it("does not claim there are no mentions while more pages are still unread", () => {
    useInfiniteNotifications.mockReturnValue({
      data: { pages: [[]], pageParams: [] },
      isLoading: false,
      isError: false,
      error: null,
      refetch: jest.fn(),
      hasNextPage: true,
      isFetchingNextPage: false,
      fetchNextPage,
    });
    renderInbox();
    expect(screen.queryByText("All caught up")).toBeNull();
    expect(
      screen.getByRole("button", { name: /load older notifications/i }),
    ).toBeInTheDocument();
  });
});
