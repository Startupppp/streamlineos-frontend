import { render, screen, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createElement, type ReactNode, type CSSProperties } from "react";
import { TooltipProvider } from "@/components/ui/tooltip";
import type { UnifiedInboxItem, BuildApprovalInboxItem } from "@/types/inbox";
import { InboxShell } from "./inbox-shell";
import { InboxItemCard } from "./inbox-item-card";

const markReadMutate = jest.fn();
const dismissBroadcastMutate = jest.fn();

const NOW = new Date("2026-09-12T09:00:00.000Z").toISOString();

const NOTIFICATION_SEVEN: UnifiedInboxItem = {
  kind: "notification",
  id: 7,
  subject: "Notification seven",
  body: "Notification body",
  notifType: "INFO",
  priority: "NORMAL",
  category: "SYSTEM",
  sourceModule: "hr",
  isRead: false,
  pinned: false,
  deepLink: null,
  eventKey: null,
  timestamp: NOW,
  actor: null,
  dedupKey: "notification:7",
};

const BROADCAST_SEVEN: UnifiedInboxItem = {
  kind: "broadcast",
  id: 7,
  subject: "Broadcast seven",
  body: "Broadcast body",
  notifType: "INFO",
  priority: "NORMAL",
  category: "SYSTEM",
  sourceModule: "notifications",
  isRead: false,
  deepLink: null,
  timestamp: NOW,
  actor: null,
  dedupKey: "broadcast:7",
};

const state: { items: UnifiedInboxItem[] } = {
  items: [NOTIFICATION_SEVEN, BROADCAST_SEVEN],
};

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn() }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => "/inbox",
}));

jest.mock("next-auth/react", () => ({
  useSession: () => ({ data: { orgId: "org-1", user: { id: "u-1" } } }),
}));

jest.mock("sonner", () => ({ toast: { error: jest.fn(), success: jest.fn() } }));

jest.mock("@/hooks/api/notifications-inbox", () => {
  const idle = () => ({
    mutate: jest.fn(),
    isPending: false,
    variables: undefined,
  });
  return {
    useMarkNotificationRead: () => ({ mutate: markReadMutate }),
    useArchiveNotification: idle,
    useUnarchiveNotification: idle,
    useDeleteNotification: idle,
    usePinNotification: idle,
    useUnpinNotification: idle,
    useSnoozeNotification: idle,
    useApproveNotification: idle,
    useRejectNotification: idle,
  };
});

jest.mock("@/hooks/api/notifications-broadcasts", () => ({
  useDismissBroadcast: () => ({
    mutate: dismissBroadcastMutate,
    isPending: false,
    variables: undefined,
  }),
}));

jest.mock("@/hooks/api/inbox", () => ({
  useUnifiedInbox: () => ({
    data: {
      pages: [
        {
          items: state.items,
          hasMore: false,
          nextCursor: null,
          degraded: false,
          sources: [],
        },
      ],
    },
    isLoading: false,
    isError: false,
    error: null,
    fetchNextPage: jest.fn(),
    hasNextPage: false,
    isFetchingNextPage: false,
    refetch: jest.fn(),
  }),
}));

interface MockListProps {
  rowComponent: (props: Record<string, unknown>) => ReactNode;
  rowCount: number;
  rowProps: Record<string, unknown>;
  rowKey?: (index: number, data: Record<string, unknown>) => string | number;
}

jest.mock("react-window", () => {
  function MockList({ rowComponent, rowCount, rowProps, rowKey }: MockListProps) {
    const rows: ReactNode[] = [];
    for (let index = 0; index < rowCount; index += 1) {
      const style: CSSProperties = {};
      const ariaAttributes = {
        "aria-posinset": index + 1,
        "aria-setsize": rowCount,
        role: "listitem" as const,
      };
      rows.push(
        createElement(rowComponent, {
          key: rowKey ? rowKey(index, rowProps) : index,
          index,
          style,
          ariaAttributes,
          ...rowProps,
        }),
      );
    }
    return createElement("div", { "data-testid": "virtual-list" }, rows);
  }
  return {
    List: MockList,
    useDynamicRowHeight: () => 96,
  };
});

jest.mock("@/components/ui/page-wrapper", () => ({
  PageWrapper: ({ children, filters }: { children: ReactNode; filters?: ReactNode }) =>
    createElement("div", null, filters, children),
}));

jest.mock("@/features/notifications/notification-detail-drawer-lazy", () => ({
  NotificationDetailDrawerLazy: ({
    notification,
  }: {
    notification: { title: string } | null;
  }) =>
    createElement(
      "div",
      { "data-testid": "detail-drawer" },
      notification ? notification.title : "",
    ),
}));

jest.mock("next/dynamic", () => () =>
  jest.requireActual<{ InboxVirtualList: unknown }>("./inbox-virtual-list")
    .InboxVirtualList);

jest.mock("./inbox-toolbar", () => ({
  InboxToolbar: () => null,
}));

jest.mock("./inbox-bulk-actions", () => ({
  BulkActionsBar: () => null,
}));

function renderInbox() {
  return render(
    <TooltipProvider>
      <InboxShell />
    </TooltipProvider>,
  );
}

async function clickCardTitled(title: string) {
  const label = screen.getByText(title);
  const activator = label.closest("button");
  if (!activator) throw new Error(`No activator button for card "${title}"`);
  await act(async () => {
    await userEvent.click(activator);
  });
}

beforeEach(() => {
  jest.clearAllMocks();
  state.items = [NOTIFICATION_SEVEN, BROADCAST_SEVEN];
});

function makeApprovalItem(approvalKind: string): BuildApprovalInboxItem {
  return {
    kind: "build_approval",
    id: 1,
    status: "pending",
    approvalKind,
    projectId: null,
    ticketId: null,
    dueAt: null,
    sourceModule: "build",
    actor: null,
    subject: "Approval request",
    timestamp: new Date().toISOString(),
    isRead: false,
    deepLink: null,
    dedupKey: `approval:1:${approvalKind}`,
  };
}

const noop = jest.fn();

describe("ApprovalItemCard — D2 source labels show the approval kind", () => {
  it("shows 'Build' badge for build approval kind", () => {
    render(
      <InboxItemCard
        item={makeApprovalItem("build")}
        onNotificationClick={noop}
        onBroadcastClick={noop}
        onMailClick={noop}
        onApprovalClick={noop}
      />,
    );
    expect(screen.getByText("Build")).toBeInTheDocument();
  });

  it("shows 'Leave' badge for leave approval kind", () => {
    render(
      <InboxItemCard
        item={makeApprovalItem("leave")}
        onNotificationClick={noop}
        onBroadcastClick={noop}
        onMailClick={noop}
        onApprovalClick={noop}
      />,
    );
    expect(screen.getByText("Leave")).toBeInTheDocument();
  });

  it("shows 'Work from home' badge for wfh approval kind", () => {
    render(
      <InboxItemCard
        item={makeApprovalItem("wfh")}
        onNotificationClick={noop}
        onBroadcastClick={noop}
        onMailClick={noop}
        onApprovalClick={noop}
      />,
    );
    expect(screen.getByText("Work from home")).toBeInTheDocument();
  });

  it("shows 'HR workflow' badge for workflow approval kind", () => {
    render(
      <InboxItemCard
        item={makeApprovalItem("workflow")}
        onNotificationClick={noop}
        onBroadcastClick={noop}
        onMailClick={noop}
        onApprovalClick={noop}
      />,
    );
    expect(screen.getByText("HR workflow")).toBeInTheDocument();
  });

  it("shows 'Timesheet' badge for timesheet approval kind", () => {
    render(
      <InboxItemCard
        item={makeApprovalItem("timesheet")}
        onNotificationClick={noop}
        onBroadcastClick={noop}
        onMailClick={noop}
        onApprovalClick={noop}
      />,
    );
    expect(screen.getByText("Timesheet")).toBeInTheDocument();
  });

  it("falls back to the raw kind string for an unknown approval kind and does not throw", () => {
    render(
      <InboxItemCard
        item={makeApprovalItem("future_kind_from_new_backend_adapter")}
        onNotificationClick={noop}
        onBroadcastClick={noop}
        onMailClick={noop}
        onApprovalClick={noop}
      />,
    );
    expect(screen.getByText("future_kind_from_new_backend_adapter")).toBeInTheDocument();
  });
});

describe("inbox item identity — a broadcast and a notification sharing id 7", () => {
  it("dismisses the broadcast instead of marking notification 7 read", async () => {
    renderInbox();

    await clickCardTitled("Broadcast seven");

    expect(dismissBroadcastMutate).toHaveBeenCalledTimes(1);
    expect(dismissBroadcastMutate).toHaveBeenCalledWith(7);
    expect(markReadMutate).not.toHaveBeenCalled();
  });

  it("opens the broadcast's own content in the drawer, not the notification's", async () => {
    renderInbox();

    await clickCardTitled("Broadcast seven");

    expect(screen.getByTestId("detail-drawer")).toHaveTextContent("Broadcast seven");
  });

  it("still marks a real notification read and shows its own content", async () => {
    renderInbox();

    await clickCardTitled("Notification seven");

    expect(markReadMutate).toHaveBeenCalledWith(7);
    expect(dismissBroadcastMutate).not.toHaveBeenCalled();
    expect(screen.getByTestId("detail-drawer")).toHaveTextContent("Notification seven");
  });
});
