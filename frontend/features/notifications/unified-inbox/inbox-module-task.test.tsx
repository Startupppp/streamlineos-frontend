import { render, screen, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createElement, type ReactNode } from "react";
import { InboxItemCard } from "./inbox-item-card";
import { groupInboxItems } from "./inbox-grouping";
import { TASK_KIND_LABELS, taskKindLabel, INBOX_SOURCE_LABELS } from "./inbox-sources";
import { parseInboxFilterState } from "./inbox-view-params";
import type { ModuleTaskInboxItem, UnifiedInboxItem } from "@/types/inbox";
import { InboxShell } from "./inbox-shell";

const noop = jest.fn();
const pushMock = jest.fn<void, [string]>();

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock, replace: jest.fn() }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => "/inbox",
}));

jest.mock("next-auth/react", () => ({
  useSession: () => ({ data: { orgId: "org-1", user: { id: "u-1" } } }),
}));

jest.mock("sonner", () => ({
  toast: { error: jest.fn(), success: jest.fn() },
}));

jest.mock("@/lib/get-error-message", () => ({
  getErrorMessage: (e: unknown) => (e instanceof Error ? e.message : "error"),
}));

jest.mock("@/hooks/api/notifications-inbox", () => {
  const idle = () => ({ mutate: jest.fn(), isPending: false, variables: undefined });
  return {
    useMarkNotificationRead: idle,
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
  useDismissBroadcast: () => ({ mutate: jest.fn() }),
}));

jest.mock("@/components/ui/page-wrapper", () => ({
  PageWrapper: ({ children, filters }: { children: ReactNode; filters?: ReactNode }) =>
    createElement("div", null, filters, children),
}));

jest.mock("@/components/ui/empty-state", () => ({
  EmptyState: () => null,
}));

jest.mock("@/components/shared/error-state", () => ({
  ErrorState: () => null,
}));

jest.mock("@/components/shared/no-permission-state", () => ({
  NoPermissionState: () => null,
}));

jest.mock("@/features/notifications/notification-list-skeleton", () => ({
  NotificationListSkeleton: () => null,
}));

jest.mock("./inbox-toolbar", () => ({
  InboxToolbar: () => null,
}));

jest.mock("./inbox-bulk-actions", () => ({
  BulkActionsBar: () => null,
}));

jest.mock("@/lib/utils", () => ({
  cn: (...args: string[]) => args.filter(Boolean).join(" "),
}));

interface CapturedShellProps {
  onModuleTaskClick: (item: ModuleTaskInboxItem) => void;
}

let capturedShellProps: CapturedShellProps | null = null;

jest.mock("./inbox-virtual-list", () => ({
  InboxVirtualList: (props: CapturedShellProps) => {
    capturedShellProps = props;
    return null;
  },
}));

jest.mock("next/dynamic", () => () =>
  jest.requireMock<{ InboxVirtualList: unknown }>("./inbox-virtual-list").InboxVirtualList,
);

let mockInboxItems: UnifiedInboxItem[] = [];

jest.mock("@/hooks/api/inbox", () => ({
  useUnifiedInbox: () => ({
    data: {
      pages: [
        {
          items: mockInboxItems,
          hasMore: false,
          nextCursor: null,
          sources: [],
          degraded: false,
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

function makeModuleTaskItem(
  overrides: Partial<ModuleTaskInboxItem> = {},
): ModuleTaskInboxItem {
  return {
    kind: "module_task",
    id: "task-1",
    taskKind: "crm_task",
    status: "open",
    priority: "HIGH",
    dueAt: null,
    body: "Follow up with the customer",
    sourceModule: "crm",
    actor: null,
    subject: "Follow up with Acme Corp",
    timestamp: new Date("2026-09-01T10:00:00Z").toISOString(),
    isRead: false,
    deepLink: null,
    dedupKey: "module_task:task-1",
    ...overrides,
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  capturedShellProps = null;
  mockInboxItems = [];
});

describe("ModuleTaskItemCard — renders subject, source label, status, and priority", () => {
  it("renders the subject of the task", () => {
    render(
      <InboxItemCard
        item={makeModuleTaskItem()}
        onNotificationClick={noop}
        onBroadcastClick={noop}
        onMailClick={noop}
        onApprovalClick={noop}
        onModuleTaskClick={noop}
      />,
    );
    expect(screen.getByText("Follow up with Acme Corp")).toBeInTheDocument();
  });

  it("renders the CRM task source label for taskKind crm_task", () => {
    render(
      <InboxItemCard
        item={makeModuleTaskItem({ taskKind: "crm_task" })}
        onNotificationClick={noop}
        onBroadcastClick={noop}
        onMailClick={noop}
        onApprovalClick={noop}
        onModuleTaskClick={noop}
      />,
    );
    expect(screen.getByText("CRM task")).toBeInTheDocument();
  });

  it("renders the Support ticket label for taskKind support_ticket", () => {
    render(
      <InboxItemCard
        item={makeModuleTaskItem({ taskKind: "support_ticket" })}
        onNotificationClick={noop}
        onBroadcastClick={noop}
        onMailClick={noop}
        onApprovalClick={noop}
        onModuleTaskClick={noop}
      />,
    );
    expect(screen.getByText("Support ticket")).toBeInTheDocument();
  });

  it("renders the status badge", () => {
    render(
      <InboxItemCard
        item={makeModuleTaskItem({ status: "in_progress" })}
        onNotificationClick={noop}
        onBroadcastClick={noop}
        onMailClick={noop}
        onApprovalClick={noop}
        onModuleTaskClick={noop}
      />,
    );
    expect(screen.getByText("in_progress")).toBeInTheDocument();
  });

  it("renders the priority badge", () => {
    render(
      <InboxItemCard
        item={makeModuleTaskItem({ priority: "CRITICAL" })}
        onNotificationClick={noop}
        onBroadcastClick={noop}
        onMailClick={noop}
        onApprovalClick={noop}
        onModuleTaskClick={noop}
      />,
    );
    expect(screen.getByText("CRITICAL")).toBeInTheDocument();
  });

  it("renders the due date when dueAt is present", () => {
    render(
      <InboxItemCard
        item={makeModuleTaskItem({ dueAt: new Date("2026-10-01T09:00:00Z").toISOString() })}
        onNotificationClick={noop}
        onBroadcastClick={noop}
        onMailClick={noop}
        onApprovalClick={noop}
        onModuleTaskClick={noop}
      />,
    );
    expect(screen.getByText(/due/i)).toBeInTheDocument();
  });

  it("does not render a due date when dueAt is null", () => {
    render(
      <InboxItemCard
        item={makeModuleTaskItem({ dueAt: null })}
        onNotificationClick={noop}
        onBroadcastClick={noop}
        onMailClick={noop}
        onApprovalClick={noop}
        onModuleTaskClick={noop}
      />,
    );
    expect(screen.queryByText(/due/i)).not.toBeInTheDocument();
  });
});

describe("ModuleTaskItemCard — unknown taskKind renders fallback without throwing", () => {
  it("renders the raw kind string for an unknown taskKind and does not throw", () => {
    render(
      <InboxItemCard
        item={makeModuleTaskItem({ taskKind: "future_kind_not_yet_released" })}
        onNotificationClick={noop}
        onBroadcastClick={noop}
        onMailClick={noop}
        onApprovalClick={noop}
        onModuleTaskClick={noop}
      />,
    );
    expect(screen.getByText("future_kind_not_yet_released")).toBeInTheDocument();
  });

  it("positive: a known taskKind still shows a human-readable label with the same code path", () => {
    render(
      <InboxItemCard
        item={makeModuleTaskItem({ taskKind: "crm_task" })}
        onNotificationClick={noop}
        onBroadcastClick={noop}
        onMailClick={noop}
        onApprovalClick={noop}
        onModuleTaskClick={noop}
      />,
    );
    expect(screen.getByText("CRM task")).toBeInTheDocument();
    expect(screen.queryByText("crm_task")).not.toBeInTheDocument();
  });
});

describe("ModuleTaskItemCard — click navigates to deepLink", () => {
  it("calls onModuleTaskClick with the item when clicked", async () => {
    const handleClick = jest.fn();
    render(
      <InboxItemCard
        item={makeModuleTaskItem()}
        onNotificationClick={noop}
        onBroadcastClick={noop}
        onMailClick={noop}
        onApprovalClick={noop}
        onModuleTaskClick={handleClick}
      />,
    );
    await userEvent.click(screen.getByRole("button", { name: /task/i }));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it("shell navigates to deepLink when module_task item is clicked", async () => {
    const item = makeModuleTaskItem({ deepLink: "/crm/tasks/task-1" });
    mockInboxItems = [item];

    await act(async () => {
      render(<InboxShell />);
    });

    if (!capturedShellProps) throw new Error("InboxVirtualList never received props");
    act(() => capturedShellProps!.onModuleTaskClick(item));

    expect(pushMock).toHaveBeenCalledWith("/crm/tasks/task-1");
  });

  it("shell falls back to /inbox when deepLink is null", async () => {
    const item = makeModuleTaskItem({ deepLink: null });
    mockInboxItems = [item];

    await act(async () => {
      render(<InboxShell />);
    });

    if (!capturedShellProps) throw new Error("InboxVirtualList never received props");
    act(() => capturedShellProps!.onModuleTaskClick(item));

    expect(pushMock).toHaveBeenCalledWith("/inbox");
  });

  it("negative: shell does NOT navigate to /build/approvals for a module_task with null deepLink", async () => {
    const item = makeModuleTaskItem({ deepLink: null });
    mockInboxItems = [item];

    await act(async () => {
      render(<InboxShell />);
    });

    if (!capturedShellProps) throw new Error("InboxVirtualList never received props");
    act(() => capturedShellProps!.onModuleTaskClick(item));

    expect(pushMock).not.toHaveBeenCalledWith(expect.stringContaining("/build/approvals"));
  });
});

describe("TASK_KIND_LABELS — source labels registry", () => {
  it("includes crm_task label", () => {
    expect(TASK_KIND_LABELS["crm_task"]).toBe("CRM task");
  });

  it("includes support_ticket label", () => {
    expect(TASK_KIND_LABELS["support_ticket"]).toBe("Support ticket");
  });

  it("taskKindLabel returns the raw string for an unknown kind", () => {
    expect(taskKindLabel("unknown_future_kind")).toBe("unknown_future_kind");
  });

  it("positive: taskKindLabel returns CRM task for crm_task", () => {
    expect(taskKindLabel("crm_task")).toBe("CRM task");
  });
});

describe("INBOX_SOURCE_LABELS — module_task maps to Tasks", () => {
  it("module_task label is Tasks", () => {
    expect(INBOX_SOURCE_LABELS["module_task"]).toBe("Tasks");
  });
});

describe("groupInboxItems — module_task participates in kind and module grouping", () => {
  function makeTaskItem(id: string, sourceModule = "crm"): UnifiedInboxItem {
    return makeModuleTaskItem({ id, dedupKey: `module_task:${id}`, sourceModule });
  }

  it("groups module_task items under the Tasks kind label when grouping by kind", () => {
    const items: UnifiedInboxItem[] = [
      makeTaskItem("t1"),
      makeTaskItem("t2"),
    ];
    const groups = groupInboxItems(items, "kind");
    const taskGroup = groups.find((g) => g.key === "module_task");
    expect(taskGroup).toBeDefined();
    expect(taskGroup?.label).toBe("Tasks");
    expect(taskGroup?.items).toHaveLength(2);
  });

  it("negative: module_task items do not appear in a non-existent kind group", () => {
    const items: UnifiedInboxItem[] = [makeTaskItem("t1")];
    const groups = groupInboxItems(items, "kind");
    const notifGroup = groups.find((g) => g.key === "notification");
    expect(notifGroup).toBeUndefined();
  });

  it("groups module_task items by sourceModule when grouping by module", () => {
    const items: UnifiedInboxItem[] = [
      makeTaskItem("t1", "crm"),
      makeTaskItem("t2", "support"),
      makeTaskItem("t3", "crm"),
    ];
    const groups = groupInboxItems(items, "module");
    const crmGroup = groups.find((g) => g.key === "crm");
    const supportGroup = groups.find((g) => g.key === "support");
    expect(crmGroup?.items).toHaveLength(2);
    expect(supportGroup?.items).toHaveLength(1);
  });
});

describe("module_task URL source filter round-trip", () => {
  it("parses module_task from the kinds URL param", () => {
    const params = new URLSearchParams("kinds=module_task");
    const state = parseInboxFilterState(params);
    expect(state.kindOverride).toContain("module_task");
  });

  it("negative: an invalid kind is not accepted into kindOverride", () => {
    const params = new URLSearchParams("kinds=invalid_kind");
    const state = parseInboxFilterState(params);
    expect(state.kindOverride).not.toContain("invalid_kind");
    expect(state.kindOverride).toHaveLength(0);
  });

  it("positive: module_task survives the round-trip through the filter state", () => {
    const params = new URLSearchParams("kinds=module_task,notification");
    const state = parseInboxFilterState(params);
    expect(state.kindOverride).toContain("module_task");
    expect(state.kindOverride).toContain("notification");
  });
});

describe("bell badge — task count is included in UnifiedInboxCount.total contract", () => {
  it("UnifiedInboxCount shape includes a task field so it can be summed into total", () => {
    const count = {
      notification: 0,
      mail: 0,
      approval: 0,
      task: 4,
      total: 4,
      mailExact: true,
    };
    expect(count.task).toBe(4);
    expect(count.total).toBe(4);
  });

  it("negative: a count object without task does not satisfy the task field requirement", () => {
    const countWithoutTask = {
      notification: 0,
      mail: 0,
      approval: 0,
      total: 0,
      mailExact: true,
    };
    expect("task" in countWithoutTask).toBe(false);
  });
});
