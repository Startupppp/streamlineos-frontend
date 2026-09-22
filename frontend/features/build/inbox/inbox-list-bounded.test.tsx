/**
 * The Build inbox read `/notifications` once with `limit: 100`, so it mounted
 * 100 rows at a time AND made notification 101 unreachable — there was no
 * cursor and no pager. The Mentions tab filtered that same fixed page
 * client-side, so a mention older than the newest 100 notifications could not be
 * reached at all. These assert the cursor read, the render bound, and that
 * nothing sits behind the bound unreachably.
 */
import React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { InboxList } from "./inbox-list";
import { INBOX_FETCH_PAGE_SIZE, INBOX_RENDER_PAGE_SIZE } from "./inbox-render-window";
import type { Notification, NotificationSection } from "@/types/notifications";

const useInfiniteNotifications = jest.fn();
const fetchNextPage = jest.fn();

jest.mock("@/hooks/api/notifications", () => ({
  useInfiniteNotifications: (params: unknown) => useInfiniteNotifications(params),
  useMarkNotificationRead: () => ({ mutate: jest.fn() }),
  useMarkAllNotificationsRead: () => ({ mutate: jest.fn(), isPending: false }),
  useBulkMarkRead: () => ({ mutateAsync: jest.fn() }),
  useBulkArchive: () => ({ mutateAsync: jest.fn() }),
  useBulkDelete: () => ({ mutateAsync: jest.fn() }),
}));

jest.mock("@/hooks/api/use-page-state", () => ({
  usePageState: ({ isLoading, isError, error, isEmpty }: {
    isLoading: boolean;
    isError: boolean;
    error?: unknown;
    isEmpty?: boolean;
  }) => {
    if (isLoading) return { kind: "loading" };
    if (isError) return { kind: "error", error };
    if (isEmpty) return { kind: "empty" };
    return { kind: "ready" };
  },
}));

jest.mock("@/hooks/common/use-online-status", () => ({
  useOnlineStatus: jest.fn().mockReturnValue(true),
}));

jest.mock("./inbox-notification-item", () => ({
  InboxNotificationItem: ({ notification }: { notification: { title: string } }) => (
    <div>{notification.title}</div>
  ),
}));

jest.mock("./inbox-filter-bar", () => ({
  InboxFilterBar: () => null,
}));

jest.mock("./inbox-bulk-toolbar", () => ({
  InboxBulkToolbar: () => null,
}));

jest.mock("./use-inbox-keyboard-nav", () => ({
  useInboxKeyboardNav: () => undefined,
}));

import { buildPages, noop, searchRef, renderInbox } from "./inbox-list-test-harness";

function mockPages(counts: number[], hasNextPage: boolean) {
  useInfiniteNotifications.mockReturnValue(buildPages(counts, hasNextPage, fetchNextPage));
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

describe("InboxList — changing the section prop resets the window", () => {
  it("goes back to the first page of rows when the section changes via prop", async () => {
    const user = userEvent.setup();
    mockPages([100, 100, 100], false);
    const { rerender } = renderInbox({ section: "UNREAD" });
    await user.click(screen.getByRole("button", { name: /show 30 more/i }));
    expect(screen.getAllByRole("listitem")).toHaveLength(INBOX_RENDER_PAGE_SIZE * 2);
    rerender(
      <InboxList
        selectedId={null}
        onSelect={noop}
        section="ALL"
        q={null}
        searchInputRef={searchRef}
      />,
    );
    expect(screen.getAllByRole("listitem")).toHaveLength(INBOX_RENDER_PAGE_SIZE);
  });

  it("does not claim there are no mentions while more pages are still unread", () => {
    useInfiniteNotifications.mockReturnValue({
      data: { pages: [[]], pageParams: [] },
      isPending: false,
      isLoading: false,
      isError: false,
      error: null,
      refetch: jest.fn(),
      hasNextPage: true,
      isFetchingNextPage: false,
      fetchNextPage,
    });
    renderInbox({ section: "MENTIONS" });
    expect(screen.queryByText("All caught up")).toBeNull();
    expect(
      screen.getByRole("button", { name: /load older notifications/i }),
    ).toBeInTheDocument();
  });
});

describe("InboxList — disabled query shows skeleton, not empty state", () => {
  it("shows a loading skeleton and not the empty message when the query is pending but not yet fetching", () => {
    useInfiniteNotifications.mockReturnValue({
      data: undefined,
      isPending: true,
      isLoading: false,
      isError: false,
      error: null,
      refetch: jest.fn(),
      hasNextPage: false,
      isFetchingNextPage: false,
      fetchNextPage,
    });
    renderInbox();
    expect(screen.queryByText("All caught up")).toBeNull();
    expect(screen.queryByText("No notifications")).toBeNull();
  });

  it("shows the error state and not the empty message when the query has failed", () => {
    useInfiniteNotifications.mockReturnValue({
      data: undefined,
      isPending: false,
      isLoading: false,
      isError: true,
      error: new Error("Network failure"),
      refetch: jest.fn(),
      hasNextPage: false,
      isFetchingNextPage: false,
      fetchNextPage,
    });
    renderInbox();
    expect(screen.queryByText("All caught up")).toBeNull();
  });
});

describe("InboxList — Mentions tab sends section:MENTIONS directly to the backend", () => {
  it("passes section=MENTIONS to the query when the Mentions tab is active", () => {
    mockPages([], false);
    renderInbox({ section: "MENTIONS" });
    expect(useInfiniteNotifications).toHaveBeenCalledWith(
      expect.objectContaining({ section: "MENTIONS" }),
    );
  });

  it("does not pass category:PROJECTS when the Mentions tab is active", () => {
    mockPages([], false);
    renderInbox({ section: "MENTIONS" });
    expect(useInfiniteNotifications).not.toHaveBeenCalledWith(
      expect.objectContaining({ category: "PROJECTS" }),
    );
  });
});

