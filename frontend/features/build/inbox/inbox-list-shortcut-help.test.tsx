import React from "react";
import { render, screen, act } from "@testing-library/react";
import { InboxList } from "./inbox-list";
import { searchRef, noop } from "./inbox-list-test-harness";

const mockUseInboxKeyboardNav = jest.fn();

jest.mock("./use-inbox-keyboard-nav", () => ({
  useInboxKeyboardNav: (args: unknown) => mockUseInboxKeyboardNav(args),
}));

jest.mock("@/hooks/api/use-page-state", () => ({
  usePageState: () => ({ kind: "ready" }),
}));

jest.mock("@/hooks/api/notifications", () => ({
  useInfiniteNotifications: () => ({
    data: { pages: [[]], pageParams: [] },
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

jest.mock("@/features/build/shared/shortcut-help-dialog", () => ({
  ShortcutHelpDialog: ({ open }: { open: boolean }) =>
    open ? <div role="dialog" aria-label="Keyboard shortcuts" /> : null,
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

describe("InboxList — ? shortcut help dialog wiring", () => {
  it("passes onShortcutHelp to useInboxKeyboardNav so the ? key can open the help overlay", () => {
    renderInboxList();
    expect(mockUseInboxKeyboardNav).toHaveBeenCalledWith(
      expect.objectContaining({ onShortcutHelp: expect.any(Function) }),
    );
  });

  it("ShortcutHelpDialog is not shown on initial render — paired with the open test below", () => {
    renderInboxList();
    expect(screen.queryByRole("dialog", { name: "Keyboard shortcuts" })).not.toBeInTheDocument();
  });

  it("calling the onShortcutHelp callback opens ShortcutHelpDialog — confirms the state wiring is live and not just forwarded", async () => {
    renderInboxList();
    const capturedArgs = mockUseInboxKeyboardNav.mock.calls[0][0] as { onShortcutHelp: () => void };
    expect(typeof capturedArgs.onShortcutHelp).toBe("function");
    await act(async () => { capturedArgs.onShortcutHelp(); });
    expect(screen.getByRole("dialog", { name: "Keyboard shortcuts" })).toBeInTheDocument();
  });
});
