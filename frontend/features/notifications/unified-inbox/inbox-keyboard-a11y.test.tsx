import { createElement, type CSSProperties, type ReactNode } from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TooltipProvider } from "@/components/ui/tooltip";
import { InboxItemCard } from "./inbox-item-card";
import { InboxVirtualList, type InboxVirtualListProps } from "./inbox-virtual-list";
import type {
  NotificationInboxItem,
  BroadcastInboxItem,
  MailInboxItem,
  BuildApprovalInboxItem,
} from "@/types/inbox";

jest.mock("@animateicons/react/lucide", () => ({
  Trash2Icon: ({ size: _s, ...rest }: { size?: number; [k: string]: unknown }) => (
    <svg aria-hidden="true" {...rest} />
  ),
}));

jest.mock("@/hooks/common/use-animated-icon", () => ({
  useAnimatedIcon: () => ({ iconRef: { current: null }, hoverHandlers: {} }),
}));

interface MockListProps {
  rowComponent: (props: Record<string, unknown>) => ReactNode;
  rowCount: number;
  rowHeight: number;
  rowProps: Record<string, unknown>;
  rowKey?: (index: number, data: Record<string, unknown>) => string | number;
}

interface ReactWindowMockModule {
  List: jest.Mock<ReactNode, [MockListProps]>;
  useDynamicRowHeight: jest.Mock<number, [{ defaultRowHeight: number; key: string }]>;
}

function getReactWindowMock(): ReactWindowMockModule {
  return jest.requireMock<ReactWindowMockModule>("react-window");
}

jest.mock("react-window", () => {
  function renderRows(props: MockListProps): ReactNode {
    const rows: ReactNode[] = [];
    for (let index = 0; index < props.rowCount; index += 1) {
      const style: CSSProperties = {};
      const ariaAttributes = {
        "aria-posinset": index + 1,
        "aria-setsize": props.rowCount,
        role: "listitem" as const,
      };
      rows.push(
        createElement(props.rowComponent, {
          key: props.rowKey ? props.rowKey(index, props.rowProps) : index,
          index,
          style,
          ariaAttributes,
          ...props.rowProps,
        }),
      );
    }
    return createElement("div", { "data-testid": "virtual-list" }, rows);
  }
  return {
    List: jest.fn(renderRows),
    useDynamicRowHeight: jest.fn((_args: { defaultRowHeight: number; key: string }) => 96),
  };
});

function makeNotificationItem(id: number): NotificationInboxItem {
  return {
    kind: "notification",
    id,
    subject: `Notification subject ${id}`,
    body: "Notification body",
    notifType: "GENERAL",
    priority: "NORMAL",
    category: "SYSTEM",
    sourceModule: "system",
    actor: null,
    isRead: false,
    pinned: false,
    deepLink: null,
    eventKey: null,
    dedupKey: `notification:${id}`,
    timestamp: new Date().toISOString(),
  };
}

function makeBroadcastItem(id: number): BroadcastInboxItem {
  return {
    kind: "broadcast",
    id,
    subject: `Broadcast subject ${id}`,
    body: "Broadcast body",
    notifType: "GENERAL",
    priority: "NORMAL",
    category: "SYSTEM",
    sourceModule: "system",
    actor: null,
    isRead: false,
    deepLink: null,
    dedupKey: `broadcast:${id}`,
    timestamp: new Date().toISOString(),
  };
}

function makeMailItem(id: string): MailInboxItem {
  return {
    kind: "mail",
    id,
    subject: `Mail subject ${id}`,
    snippet: "Mail preview text",
    hasAttachments: false,
    threadId: null,
    accountId: 1,
    sourceModule: "mail",
    actor: { id: "user-9", name: "Priya Sharma", image: null },
    isRead: false,
    deepLink: null,
    dedupKey: `mail:${id}`,
    timestamp: new Date().toISOString(),
  };
}

function makeApprovalItem(id: number): BuildApprovalInboxItem {
  return {
    kind: "build_approval",
    id,
    subject: `Approval subject ${id}`,
    status: "pending",
    approvalKind: "build",
    projectId: 1,
    ticketId: 5,
    dueAt: null,
    sourceModule: "build",
    actor: null,
    isRead: false,
    deepLink: null,
    dedupKey: `build_approval:${id}`,
    timestamp: new Date().toISOString(),
  };
}

const noop = () => undefined;
const noopItem = (_item: unknown) => undefined;

const baseVirtualListProps: Omit<InboxVirtualListProps, "items"> = {
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

describe("every inbox row variant is keyboard reachable and activatable", () => {
  it("activates a notification row's handler via Enter, Space, and click alike", async () => {
    const item = makeNotificationItem(1);
    const onNotificationClick = jest.fn();
    render(
      <TooltipProvider>
        <InboxItemCard
          item={item}
          onNotificationClick={onNotificationClick}
          onBroadcastClick={jest.fn()}
          onMailClick={jest.fn()}
          onApprovalClick={jest.fn()}
        />
      </TooltipProvider>,
    );

    const activator = screen.getByRole("button", { name: item.subject });
    activator.focus();
    await userEvent.keyboard("{Enter}");
    await userEvent.keyboard(" ");
    await userEvent.click(activator);

    expect(onNotificationClick).toHaveBeenCalledTimes(3);
    expect(onNotificationClick).toHaveBeenNthCalledWith(1, item);
    expect(onNotificationClick).toHaveBeenNthCalledWith(2, item);
    expect(onNotificationClick).toHaveBeenNthCalledWith(3, item);
  });

  it("activates a broadcast row's handler via Enter, Space, and click alike", async () => {
    const item = makeBroadcastItem(2);
    const onBroadcastClick = jest.fn();
    render(
      <TooltipProvider>
        <InboxItemCard
          item={item}
          onNotificationClick={jest.fn()}
          onBroadcastClick={onBroadcastClick}
          onMailClick={jest.fn()}
          onApprovalClick={jest.fn()}
        />
      </TooltipProvider>,
    );

    const activator = screen.getByRole("button", { name: item.subject });
    activator.focus();
    await userEvent.keyboard("{Enter}");
    await userEvent.keyboard(" ");
    await userEvent.click(activator);

    expect(onBroadcastClick).toHaveBeenCalledTimes(3);
    expect(onBroadcastClick).toHaveBeenNthCalledWith(1, item);
    expect(onBroadcastClick).toHaveBeenNthCalledWith(2, item);
    expect(onBroadcastClick).toHaveBeenNthCalledWith(3, item);
  });

  it("activates a mail row's handler via Enter, Space, and click alike", async () => {
    const item = makeMailItem("mail-1");
    const onMailClick = jest.fn();
    render(
      <TooltipProvider>
        <InboxItemCard
          item={item}
          onNotificationClick={jest.fn()}
          onBroadcastClick={jest.fn()}
          onMailClick={onMailClick}
          onApprovalClick={jest.fn()}
        />
      </TooltipProvider>,
    );

    const activator = screen.getByRole("button", {
      name: `Mail from Priya Sharma: ${item.subject}`,
    });
    activator.focus();
    await userEvent.keyboard("{Enter}");
    await userEvent.keyboard(" ");
    await userEvent.click(activator);

    expect(onMailClick).toHaveBeenCalledTimes(3);
    expect(onMailClick).toHaveBeenNthCalledWith(1, item);
    expect(onMailClick).toHaveBeenNthCalledWith(2, item);
    expect(onMailClick).toHaveBeenNthCalledWith(3, item);
  });

  it("activates a build-approval row's handler via Enter, Space, and click alike", async () => {
    const item = makeApprovalItem(3);
    const onApprovalClick = jest.fn();
    render(
      <TooltipProvider>
        <InboxItemCard
          item={item}
          onNotificationClick={jest.fn()}
          onBroadcastClick={jest.fn()}
          onMailClick={jest.fn()}
          onApprovalClick={onApprovalClick}
        />
      </TooltipProvider>,
    );

    const activator = screen.getByRole("button", {
      name: `Approval request: ${item.subject}`,
    });
    activator.focus();
    await userEvent.keyboard("{Enter}");
    await userEvent.keyboard(" ");
    await userEvent.click(activator);

    expect(onApprovalClick).toHaveBeenCalledTimes(3);
    expect(onApprovalClick).toHaveBeenNthCalledWith(1, item);
    expect(onApprovalClick).toHaveBeenNthCalledWith(2, item);
    expect(onApprovalClick).toHaveBeenNthCalledWith(3, item);
  });
});

describe("the infinite-scroll sentinel outside the virtual list", () => {
  it("renders a keyboard-accessible button that triggers onLoadMore when hasNextPage is true", async () => {
    const onLoadMore = jest.fn();
    render(
      <TooltipProvider>
        <InboxVirtualList
          {...baseVirtualListProps}
          items={[makeNotificationItem(1)]}
          hasNextPage
          onLoadMore={onLoadMore}
        />
      </TooltipProvider>,
    );

    const button = screen.getByRole("button", { name: "Load more items" });
    expect(button).toBeEnabled();
    button.focus();
    await userEvent.keyboard("{Enter}");
    expect(onLoadMore).toHaveBeenCalledTimes(1);
  });

  it("renders a keyboard-accessible button even when offline — offline guards are the caller's responsibility", () => {
    render(
      <TooltipProvider>
        <InboxVirtualList
          {...baseVirtualListProps}
          items={[makeNotificationItem(1)]}
          hasNextPage
          isOnline={false}
          onLoadMore={jest.fn()}
        />
      </TooltipProvider>,
    );

    const button = screen.getByRole("button", { name: "Load more items" });
    expect(button).toBeEnabled();
  });

  it("shows a loading indicator instead of the button while fetching the next page", () => {
    render(
      <TooltipProvider>
        <InboxVirtualList
          {...baseVirtualListProps}
          items={[makeNotificationItem(1)]}
          hasNextPage
          isFetchingNextPage
          onLoadMore={jest.fn()}
        />
      </TooltipProvider>,
    );

    expect(screen.queryByRole("button", { name: "Load more items" })).toBeNull();
    expect(screen.getByRole("status")).toBeInTheDocument();
  });
});

describe("virtualized row height is measured, not hardcoded", () => {
  beforeEach(() => {
    const { List, useDynamicRowHeight } = getReactWindowMock();
    List.mockClear();
    useDynamicRowHeight.mockClear();
  });

  it("passes the hook's measured row height straight through to List", () => {
    const { List, useDynamicRowHeight } = getReactWindowMock();
    render(
      <TooltipProvider>
        <InboxVirtualList {...baseVirtualListProps} items={[makeNotificationItem(1)]} />
      </TooltipProvider>,
    );

    expect(useDynamicRowHeight).toHaveBeenCalledTimes(1);
    const measured = useDynamicRowHeight.mock.results[0]?.value;
    const lastListProps = List.mock.calls.at(-1)?.[0];
    expect(lastListProps?.rowHeight).toBe(measured);
  });

  it("changes the measurement key when the item set changes, triggering a re-measure", () => {
    const { useDynamicRowHeight } = getReactWindowMock();
    const itemsA = [makeNotificationItem(1), makeNotificationItem(2)];
    const { rerender } = render(
      <TooltipProvider>
        <InboxVirtualList {...baseVirtualListProps} items={itemsA} />
      </TooltipProvider>,
    );
    const firstKey = useDynamicRowHeight.mock.calls[0]?.[0]?.key;

    const itemsB = [...itemsA, makeNotificationItem(3)];
    rerender(
      <TooltipProvider>
        <InboxVirtualList {...baseVirtualListProps} items={itemsB} />
      </TooltipProvider>,
    );
    const secondKey = useDynamicRowHeight.mock.calls[1]?.[0]?.key;

    expect(firstKey).toBeDefined();
    expect(secondKey).toBeDefined();
    expect(secondKey).not.toBe(firstKey);
  });

  it("keeps the measurement key stable when only hasNextPage changes, since rowCount is not affected", () => {
    const { useDynamicRowHeight } = getReactWindowMock();
    const items = [makeNotificationItem(1)];
    const { rerender } = render(
      <TooltipProvider>
        <InboxVirtualList {...baseVirtualListProps} items={items} hasNextPage={false} />
      </TooltipProvider>,
    );
    const firstKey = useDynamicRowHeight.mock.calls[0]?.[0]?.key;

    rerender(
      <TooltipProvider>
        <InboxVirtualList {...baseVirtualListProps} items={items} hasNextPage onLoadMore={noop} />
      </TooltipProvider>,
    );
    const secondKey = useDynamicRowHeight.mock.calls[1]?.[0]?.key;

    expect(firstKey).toBeDefined();
    expect(secondKey).toBe(firstKey);
  });
});
