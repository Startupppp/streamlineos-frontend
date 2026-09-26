import React from "react";
import { render, screen } from "@testing-library/react";
import { InboxList } from "./inbox-list";
import { searchRef, noop } from "./inbox-list-test-harness";

const mockUsePageState = jest.fn();

jest.mock("@/hooks/api/use-page-state", () => ({
  usePageState: (...args: unknown[]) => mockUsePageState(...args),
}));

jest.mock("@/hooks/api/notifications", () => ({
  useInfiniteNotifications: () => ({
    data: { pages: [] as unknown[], pageParams: [] },
    isPending: false,
    isLoading: false,
    isError: false,
    error: null,
    refetch: jest.fn(),
    hasNextPage: false,
    isFetchingNextPage: false,
    fetchNextPage: jest.fn(),
  }),
  useMarkNotificationRead: () => ({ mutate: jest.fn() }),
  useMarkAllNotificationsRead: () => ({ mutate: jest.fn(), isPending: false }),
  useBulkMarkRead: () => ({ mutateAsync: jest.fn() }),
  useBulkArchive: () => ({ mutateAsync: jest.fn() }),
  useBulkDelete: () => ({ mutateAsync: jest.fn() }),
}));

jest.mock("@/hooks/common/use-online-status", () => ({
  useOnlineStatus: () => true,
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

function renderInboxList() {
  return render(
    <InboxList
      selectedId={null}
      onSelect={noop}
      section="UNREAD"
      q={null}
      searchInputRef={searchRef}
    />,
  );
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe("InboxList — permission: build:view is forwarded to usePageState", () => {
  it("passes permission=build:view to usePageState so the access gate is active", () => {
    mockUsePageState.mockReturnValue({ kind: "ready" });
    renderInboxList();
    expect(mockUsePageState).toHaveBeenCalledWith(
      expect.objectContaining({ permission: "build:view" }),
    );
  });
});

describe("InboxList — denied state renders Access Restricted and suppresses the notification list", () => {
  it("renders the Access Restricted heading when pageState resolves as denied", () => {
    mockUsePageState.mockReturnValue({ kind: "denied", permission: "build:view" });
    renderInboxList();
    expect(screen.getByRole("heading", { name: "Access Restricted" })).toBeInTheDocument();
  });

  it("does not render the notification list when denied, confirming denial does not leak list structure", () => {
    mockUsePageState.mockReturnValue({ kind: "denied", permission: "build:view" });
    renderInboxList();
    expect(screen.queryByRole("list", { name: "Notifications" })).not.toBeInTheDocument();
  });

  it("renders the notification list when ready, confirming the suppression above is specific to denied and not a rendering failure", () => {
    mockUsePageState.mockReturnValue({ kind: "ready" });
    renderInboxList();
    expect(screen.getByRole("list", { name: "Notifications" })).toBeInTheDocument();
  });
});
