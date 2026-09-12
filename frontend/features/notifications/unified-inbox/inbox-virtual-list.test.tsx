import { render, screen } from "@testing-library/react";
import { InboxVirtualList, type InboxVirtualListProps } from "./inbox-virtual-list";
import type { UnifiedInboxItem } from "@/types/inbox";

jest.mock("react-window", () => ({
  List: jest.fn(
    ({
      rowCount,
      "data-testid": testId,
    }: {
      rowCount: number;
      "data-testid"?: string;
    }) => (
      <div data-testid={testId ?? "virtual-list"} data-row-count={String(rowCount)} />
    ),
  ),
  useDynamicRowHeight: () => 96,
}));

function makeNotificationItem(id: number): UnifiedInboxItem {
  return {
    kind: "notification",
    id,
    subject: `Notification ${id}`,
    body: "Body text",
    notifType: "GENERAL",
    priority: "NORMAL",
    category: "SYSTEM",
    sourceModule: "system",
    actor: null,
    isRead: false,
    pinned: false,
    deepLink: null,
    eventKey: null,
    dedupKey: `notification:${String(id)}`,
    timestamp: new Date().toISOString(),
  };
}

const noop = () => undefined;
const noopItem = (_item: unknown) => undefined;

const baseProps: Omit<InboxVirtualListProps, "items"> = {
  hasNextPage: false,
  isFetchingNextPage: false,
  isOnline: true,
  onNotificationClick: noopItem,
  onBroadcastClick: noopItem,
  onMailClick: noopItem,
  onApprovalClick: noopItem,
  onArchive: noop,
  onDelete: noop,
  onApprove: noop,
  onReject: noop,
  approvingId: undefined,
  rejectingId: undefined,
  archivingId: undefined,
  deletingId: undefined,
  onLoadMore: noop,
};

describe("InboxVirtualList", () => {
  it("delegates rendering to react-window List rather than mapping all items into the DOM", () => {
    const items = Array.from({ length: 25 }, (_, i) => makeNotificationItem(i + 1));
    render(<InboxVirtualList {...baseProps} items={items} />);
    const list = screen.getByTestId("virtual-list");
    expect(list).toBeInTheDocument();
    expect(list.getAttribute("data-row-count")).toBe("25");
    expect(document.querySelectorAll("[data-testid='virtual-list']")).toHaveLength(1);
  });

  it("includes a load-more row in rowCount when hasNextPage is true", () => {
    const items = Array.from({ length: 10 }, (_, i) => makeNotificationItem(i + 1));
    render(<InboxVirtualList {...baseProps} items={items} hasNextPage />);
    const list = screen.getByTestId("virtual-list");
    expect(list.getAttribute("data-row-count")).toBe("11");
  });

  it("passes rowCount = 0 for an empty list", () => {
    render(<InboxVirtualList {...baseProps} items={[]} />);
    const list = screen.getByTestId("virtual-list");
    expect(list.getAttribute("data-row-count")).toBe("0");
  });
});
