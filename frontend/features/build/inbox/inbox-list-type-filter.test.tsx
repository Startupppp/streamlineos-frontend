import React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Toaster } from "sonner";
import { InboxList } from "./inbox-list";
import { INBOX_FETCH_PAGE_SIZE, INBOX_RENDER_PAGE_SIZE } from "./inbox-render-window";

const useInfiniteNotifications = jest.fn();
const fetchNextPage = jest.fn();
const useMarkAllNotificationsRead = jest.fn();

jest.mock("@/hooks/api/notifications", () => ({
  useInfiniteNotifications: (params: unknown) => useInfiniteNotifications(params),
  useMarkNotificationRead: () => ({ mutate: jest.fn() }),
  useMarkAllNotificationsRead: (sourceModule?: string) => useMarkAllNotificationsRead(sourceModule),
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

import { buildPages, noop, searchRef } from "./inbox-list-test-harness";

function mockPages(counts: number[], hasNextPage: boolean) {
  useInfiniteNotifications.mockReturnValue(buildPages(counts, hasNextPage, fetchNextPage));
}

beforeEach(() => {
  jest.clearAllMocks();
  useMarkAllNotificationsRead.mockReturnValue({ mutate: jest.fn(), isPending: false });
});

describe("InboxList — type prop wires category to the query and resets pagination", () => {
  it("shows a customer-facing error when the scoped mark-all route is unavailable", async () => {
    const user = userEvent.setup();
    const mutate = jest.fn((variables: void, options?: { onError?: (error: unknown) => void }) => {
      options?.onError?.({ status: 404, code: "NOT_FOUND" });
    });
    useMarkAllNotificationsRead.mockReturnValue({ mutate, isPending: false });
    mockPages([1], false);
    render(<><Toaster /><InboxList selectedId={null} onSelect={noop} section="UNREAD" q={null} searchInputRef={searchRef} /></>);
    await user.click(screen.getByRole("button", { name: "Mark all read" }));
    expect(await screen.findByText("The requested item could not be found.")).toBeVisible();
    expect(mutate).toHaveBeenCalledTimes(1);
  });

  it("binds both the list and mark-all action to Build", () => {
    mockPages([1], false);
    render(<InboxList selectedId={null} onSelect={noop} section="UNREAD" q={null} searchInputRef={searchRef} />);
    expect(useInfiniteNotifications).toHaveBeenCalledWith(expect.objectContaining({ sourceModule: "build" }));
    expect(useMarkAllNotificationsRead).toHaveBeenCalledWith("build");
  });

  it("forwards the type prop as category to useInfiniteNotifications", () => {
    mockPages([INBOX_FETCH_PAGE_SIZE], false);
    render(
      <InboxList
        selectedId={null}
        onSelect={noop}
        section="UNREAD"
        q={null}
        type="PROJECTS"
        searchInputRef={searchRef}
      />,
    );
    expect(useInfiniteNotifications).toHaveBeenCalledWith(
      expect.objectContaining({ category: "PROJECTS" }),
    );
  });

  it("does not include category in the request when type prop is omitted", () => {
    mockPages([INBOX_FETCH_PAGE_SIZE], false);
    render(<InboxList selectedId={null} onSelect={noop} section="UNREAD" q={null} searchInputRef={searchRef} />);
    expect(useInfiniteNotifications).not.toHaveBeenCalledWith(
      expect.objectContaining({ category: expect.anything() }),
    );
  });

  it("changing the type prop resets pagesShown back to the first window", async () => {
    const user = userEvent.setup();
    mockPages([100, 100, 100], false);
    const { rerender } = render(
      <InboxList
        selectedId={null}
        onSelect={noop}
        section="UNREAD"
        q={null}
        type={null}
        searchInputRef={searchRef}
      />,
    );
    await user.click(screen.getByRole("button", { name: /load older notifications/i }));
    expect(screen.getAllByRole("listitem")).toHaveLength(INBOX_RENDER_PAGE_SIZE * 2);
    rerender(
      <InboxList
        selectedId={null}
        onSelect={noop}
        section="UNREAD"
        q={null}
        type="PROJECTS"
        searchInputRef={searchRef}
      />,
    );
    expect(screen.getAllByRole("listitem")).toHaveLength(INBOX_RENDER_PAGE_SIZE);
  });
});
