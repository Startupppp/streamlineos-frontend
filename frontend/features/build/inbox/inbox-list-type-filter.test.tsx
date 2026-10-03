import React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Toaster } from "sonner";
import { InboxList } from "./inbox-list";
import { INBOX_FETCH_PAGE_SIZE, INBOX_RENDER_PAGE_SIZE } from "./inbox-render-window";

const useInfiniteNotifications = jest.fn();
const fetchNextPage = jest.fn();
const useMarkAllNotificationsRead = jest.fn();
const bulkArchive = jest.fn();

jest.mock("@/hooks/api/notifications", () => ({
  useInfiniteNotifications: (params: unknown) => useInfiniteNotifications(params),
  useMarkNotificationRead: () => ({ mutate: jest.fn() }),
  useMarkAllNotificationsRead: (sourceModule?: string) => useMarkAllNotificationsRead(sourceModule),
  useBulkMarkRead: () => ({ mutateAsync: jest.fn() }),
  useBulkArchive: () => ({ mutateAsync: bulkArchive }),
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
  InboxNotificationItem: function InboxNotificationItem({ notification, isChecked, onToggleSelect }: {
    notification: { id: number; title: string };
    isChecked: boolean;
    onToggleSelect: (id: number) => void;
  }) {
    function handleChange() { onToggleSelect(notification.id); }
    return <label><input type="checkbox" checked={isChecked} onChange={handleChange} />{notification.title}</label>;
  },
}));

jest.mock("./inbox-filter-bar", () => ({
  InboxFilterBar: () => null,
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
  bulkArchive.mockResolvedValue(undefined);
});

describe("InboxList — type prop wires category to the query and resets pagination", () => {
  it.each(["SNOOZED", "ARCHIVED"] satisfies Array<"SNOOZED" | "ARCHIVED">)("exposes three triage tabs for %s while keeping Build scope", (section) => {
    mockPages([1], false);
    render(<InboxList selectedId={null} onSelect={noop} section={section} q={null} searchInputRef={searchRef} />);
    expect(screen.getByRole("tab", { name: "Active" })).toBeVisible();
    expect(screen.getByRole("tab", { name: "Later" })).toBeVisible();
    expect(screen.getByRole("tab", { name: "Done" })).toBeVisible();
    expect(useInfiniteNotifications).toHaveBeenCalledWith(expect.objectContaining({ section, sourceModule: "build" }));
  });
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

  it.each([2, null])("clears prior-project bulk IDs when the project filter changes to %s", async (projectId) => {
    const user = userEvent.setup();
    mockPages([1], false);
    const { rerender } = render(
      <InboxList selectedId={null} onSelect={noop} section="UNREAD" q={null} projectId={1} searchInputRef={searchRef} />,
    );
    await user.click(screen.getByRole("checkbox", { name: "notification-1" }));
    expect(screen.getByText("1 selected")).toBeVisible();
    const next = buildPages([1], false, fetchNextPage);
    next.data.pages = next.data.pages.map((page) => page.map((notification) => ({
      ...notification, id: 2, title: "notification-2",
    })));
    useInfiniteNotifications.mockReturnValue(next);
    rerender(
      <InboxList selectedId={null} onSelect={noop} section="UNREAD" q={null} projectId={projectId} searchInputRef={searchRef} />,
    );
    expect(screen.queryByText("1 selected")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Archive selected" })).not.toBeInTheDocument();
    expect(bulkArchive).not.toHaveBeenCalled();
    await user.click(screen.getByRole("checkbox", { name: "notification-2" }));
    await user.click(screen.getByRole("button", { name: "Archive selected" }));
    expect(bulkArchive).toHaveBeenCalledWith([2]);
  });

  it("preserves bulk selection and the visible window during same-project paging and refresh", async () => {
    const user = userEvent.setup();
    mockPages([100, 100], false);
    const { rerender } = render(
      <InboxList selectedId={null} onSelect={noop} section="UNREAD" q={null} projectId={1} searchInputRef={searchRef} />,
    );
    await user.click(screen.getByRole("checkbox", { name: "notification-1" }));
    await user.click(screen.getByRole("button", { name: /load older notifications/i }));
    expect(screen.getAllByRole("listitem")).toHaveLength(INBOX_RENDER_PAGE_SIZE * 2);
    mockPages([100, 100, 100], false);
    rerender(
      <InboxList selectedId={null} onSelect={noop} section="UNREAD" q={null} projectId={1} searchInputRef={searchRef} />,
    );
    expect(screen.getByText("1 selected")).toBeVisible();
    expect(screen.getByRole("checkbox", { name: "notification-1" })).toBeChecked();
    expect(screen.getAllByRole("listitem")).toHaveLength(INBOX_RENDER_PAGE_SIZE * 2);
    await user.click(screen.getByRole("button", { name: "Archive selected" }));
    expect(bulkArchive).toHaveBeenCalledWith([1]);
  });
});
