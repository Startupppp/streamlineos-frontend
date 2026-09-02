import { render, screen } from "@testing-library/react";
import { InboxVirtualList } from "./inbox-virtual-list";
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
    sourceModule: null,
    isRead: false,
    pinned: false,
    deepLink: null,
    eventKey: null,
    timestamp: new Date().toISOString(),
  } as unknown as UnifiedInboxItem;
}

const noop = () => undefined;
const noopItem = (_item: unknown) => undefined;

const baseProps = {
  hasNextPage: false,
  isFetchingNextPage: false,
  onNotificationClick: noop as Parameters<typeof InboxVirtualList>[0]["onNotificationClick"],
  onMailClick: noopItem as Parameters<typeof InboxVirtualList>[0]["onMailClick"],
  onApprovalClick: noopItem as Parameters<typeof InboxVirtualList>[0]["onApprovalClick"],
  onArchive: noop as Parameters<typeof InboxVirtualList>[0]["onArchive"],
  onDelete: noop as Parameters<typeof InboxVirtualList>[0]["onDelete"],
  onApprove: noop as Parameters<typeof InboxVirtualList>[0]["onApprove"],
  onReject: noop as Parameters<typeof InboxVirtualList>[0]["onReject"],
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
