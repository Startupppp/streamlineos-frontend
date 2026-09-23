import { render, screen, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createElement, type ReactNode, type CSSProperties } from "react";
import { TooltipProvider } from "@/components/ui/tooltip";
import type { InboxSourceStatus, UnifiedInboxItem } from "@/types/inbox";
import { InboxShell } from "./inbox-shell";

const markReadMutate = jest.fn();
const refetchMock = jest.fn();

const HEALTHY_NOTIFICATION: UnifiedInboxItem = {
  kind: "notification",
  id: 501,
  subject: "Quarterly review scheduled",
  body: "Body",
  notifType: "INFO",
  priority: "NORMAL",
  category: "SYSTEM",
  sourceModule: "hr",
  isRead: false,
  pinned: false,
  deepLink: null,
  eventKey: null,
  timestamp: new Date().toISOString(),
  actor: null,
  dedupKey: "notification:501",
};

const state: {
  items: UnifiedInboxItem[];
  sources: InboxSourceStatus[];
  degraded: boolean;
} = {
  items: [HEALTHY_NOTIFICATION],
  sources: [],
  degraded: false,
};

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn() }),
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
  useDismissBroadcast: () => ({ mutate: jest.fn() }),
}));

jest.mock("@/hooks/api/inbox", () => ({
  useUnifiedInbox: () => ({
    data: {
      pages: [
        {
          items: state.items,
          hasMore: false,
          nextCursor: null,
          sources: state.sources,
          degraded: state.degraded,
        },
      ],
    },
    isLoading: false,
    isError: false,
    error: null,
    fetchNextPage: jest.fn(),
    hasNextPage: false,
    isFetchingNextPage: false,
    refetch: refetchMock,
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
  PageWrapper: ({
    children,
    filters,
  }: {
    children: ReactNode;
    filters?: ReactNode;
  }) => createElement("div", null, filters, children),
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

jest.mock("@/features/notifications/notification-detail-drawer-lazy", () => ({
  NotificationDetailDrawerLazy: () => null,
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

const MAIL_TIMEOUT: InboxSourceStatus = {
  kind: "mail",
  included: true,
  reason: null,
  available: false,
  error: "timeout",
};

const MAIL_PARTIAL: InboxSourceStatus = {
  kind: "mail",
  included: true,
  reason: null,
  available: true,
  error: "2 of 3 mail accounts unavailable",
};

beforeEach(() => {
  jest.clearAllMocks();
  state.items = [HEALTHY_NOTIFICATION];
  state.sources = [];
  state.degraded = false;
});

describe("inbox degraded/partial state — the page never becomes an error state", () => {
  it("names the failed mail source, offers retry, and keeps healthy rows rendered and clickable", async () => {
    state.degraded = true;
    state.sources = [MAIL_TIMEOUT];
    renderInbox();

    expect(screen.getByRole("status")).toHaveTextContent("Mail");
    expect(screen.getByRole("status")).toHaveTextContent("timeout");
    expect(
      screen.getByRole("button", { name: "Retry Mail" }),
    ).toBeInTheDocument();

    const notificationButton = screen
      .getByText("Quarterly review scheduled")
      .closest("button");
    if (!notificationButton) throw new Error("Notification card has no button");
    expect(notificationButton).toBeInTheDocument();

    await act(async () => {
      await userEvent.click(notificationButton);
    });
    expect(markReadMutate).toHaveBeenCalledWith(501);
  });

  it("raises the banner for a partial degradation where the source is still available", () => {
    state.degraded = true;
    state.sources = [MAIL_PARTIAL];
    renderInbox();

    expect(screen.getByRole("status")).toHaveTextContent("Mail");
    expect(screen.getByRole("status")).toHaveTextContent(
      "2 of 3 mail accounts unavailable",
    );
  });

  it("retries exactly once per click and schedules no timer, so it cannot become a request loop", async () => {
    jest.useFakeTimers({ legacyFakeTimers: false });
    try {
      state.degraded = true;
      state.sources = [MAIL_TIMEOUT];
      renderInbox();

      const retryButton = screen.getByRole("button", { name: "Retry Mail" });
      await act(async () => {
        await userEvent.setup({ delay: null }).click(retryButton);
      });
      expect(refetchMock).toHaveBeenCalledTimes(1);

      act(() => {
        jest.advanceTimersByTime(60_000);
      });
      expect(refetchMock).toHaveBeenCalledTimes(1);

      await act(async () => {
        await userEvent.setup({ delay: null }).click(retryButton);
      });
      expect(refetchMock).toHaveBeenCalledTimes(2);
    } finally {
      jest.useRealTimers();
    }
  });

  it("leaks nothing from the failed mail source into the rendered DOM", () => {
    state.degraded = true;
    state.sources = [MAIL_TIMEOUT];
    const { container } = renderInbox();

    expect(container.textContent).toContain("Quarterly review scheduled");

    const forbiddenLeakedMailStrings = [
      "Payroll adjustment for Q3",
      "payroll@streamlineos.example",
      "acct-042",
      "Mailbox:",
    ];
    for (const forbidden of forbiddenLeakedMailStrings)
      expect(container.textContent).not.toContain(forbidden);
  });

  it("renders no banner at all when the response is not degraded", () => {
    state.degraded = false;
    state.sources = [];
    renderInbox();

    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });
});
