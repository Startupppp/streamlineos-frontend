import React from "react";
import { render, screen } from "@testing-library/react";
import { InboxList } from "./inbox-list";
import { INBOX_FETCH_PAGE_SIZE } from "./inbox-render-window";
import { searchRef, noop } from "./inbox-list-test-harness";

const useInfiniteNotifications = jest.fn();
const mockUseOnlineStatus = jest.fn();

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
  useOnlineStatus: () => mockUseOnlineStatus(),
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

function emptyPage() {
  useInfiniteNotifications.mockReturnValue({
    data: { pages: [[]], pageParams: [] },
    isPending: false,
    isLoading: false,
    isError: false,
    error: null,
    refetch: jest.fn(),
    hasNextPage: false,
    isFetchingNextPage: false,
    fetchNextPage: jest.fn(),
  });
}

beforeEach(() => {
  jest.clearAllMocks();
  mockUseOnlineStatus.mockReturnValue(true);
});

describe("InboxList — offline suppresses the empty state so stale data is preserved", () => {
  it("does not show the empty-state text when offline and zero rows are cached, because isEmpty is false when isOnline is false", () => {
    mockUseOnlineStatus.mockReturnValue(false);
    emptyPage();
    render(
      <InboxList
        selectedId={null}
        onSelect={noop}
        section="UNREAD"
        q={null}
        searchInputRef={searchRef}
      />,
    );
    expect(screen.queryByText("All caught up")).toBeNull();
    expect(screen.queryByText("No notifications")).toBeNull();
  });

  it("shows All caught up when online and zero rows are cached, confirming the isOnline guard is the mechanism", () => {
    emptyPage();
    render(
      <InboxList
        selectedId={null}
        onSelect={noop}
        section="UNREAD"
        q={null}
        searchInputRef={searchRef}
      />,
    );
    expect(screen.getByText("All caught up")).toBeInTheDocument();
  });
});

describe("InboxList — chat gap renders as empty not error because chat notifications are never persisted", () => {
  it("renders All caught up rather than an error when no build notifications exist, because the inbox cannot distinguish a missing notification class from an empty result", () => {
    emptyPage();
    render(
      <InboxList
        selectedId={null}
        onSelect={noop}
        section="UNREAD"
        q={null}
        searchInputRef={searchRef}
      />,
    );
    expect(screen.getByText("All caught up")).toBeInTheDocument();
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("passes sourceModule=build to the query so only persisted build notifications are requested, which excludes the chat Ably path that never writes a row", () => {
    emptyPage();
    render(
      <InboxList
        selectedId={null}
        onSelect={noop}
        section="UNREAD"
        q={null}
        searchInputRef={searchRef}
      />,
    );
    expect(useInfiniteNotifications).toHaveBeenCalledWith(
      expect.objectContaining({ sourceModule: "build" }),
    );
  });
});

describe("InboxList — fetch page size constant governs the query limit regardless of network state", () => {
  it("requests INBOX_FETCH_PAGE_SIZE notifications when online", () => {
    emptyPage();
    render(
      <InboxList
        selectedId={null}
        onSelect={noop}
        section="UNREAD"
        q={null}
        searchInputRef={searchRef}
      />,
    );
    expect(useInfiniteNotifications).toHaveBeenCalledWith(
      expect.objectContaining({ limit: INBOX_FETCH_PAGE_SIZE }),
    );
  });

  it("still requests INBOX_FETCH_PAGE_SIZE notifications when offline because the hook is not gated on network status", () => {
    mockUseOnlineStatus.mockReturnValue(false);
    emptyPage();
    render(
      <InboxList
        selectedId={null}
        onSelect={noop}
        section="UNREAD"
        q={null}
        searchInputRef={searchRef}
      />,
    );
    expect(useInfiniteNotifications).toHaveBeenCalledWith(
      expect.objectContaining({ limit: INBOX_FETCH_PAGE_SIZE }),
    );
  });
});
