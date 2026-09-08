import { readFileSync } from "node:fs";
import { join } from "node:path";
import { render, screen } from "@testing-library/react";
import type { PropsWithChildren } from "react";
import { NotificationsInboxPage } from "@/features/notifications/inbox/notifications-inbox-page";

/**
 * The route module is an async Server Component that server-prefetches through
 * `lib/prefetch/notifications`, so importing it here drags next-auth's ESM into
 * Jest and RTL cannot render it anyway. The body it hands to the client is this
 * component; the route's composition is asserted from source below so the
 * substitution stays honest.
 */
const NotificationsPage = NotificationsInboxPage;

let mockIsOnline = true;
let mockNotificationItems: Array<{ id: number; title: string }> = [];

jest.mock("@/hooks/common/use-online-status", () => ({
  useOnlineStatus: () => mockIsOnline,
}));

jest.mock("@/hooks/common/use-debounce", () => ({
  useDebouncedValue: <T,>(value: T) => value,
}));

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: jest.fn() }),
}));

jest.mock("@/hooks/api/notifications", () => ({
  useInfiniteNotifications: () => ({
    data: { pages: [mockNotificationItems] },
    isLoading: false,
    isError: false,
    refetch: jest.fn(),
    fetchNextPage: jest.fn(),
    hasNextPage: false,
    isFetchingNextPage: false,
  }),
  useUnreadNotificationCount: () => ({ data: { count: 0 } }),
}));

const noopMutation = { mutate: jest.fn(), isPending: false, variables: undefined };

jest.mock("@/features/notifications/use-notification-inbox", () => ({
  useNotificationInbox: () => ({
    handlers: {
      handleNotificationClick: jest.fn(),
      handleDrawerOpenChange: jest.fn(),
      handleOpenLink: jest.fn(),
      handleMarkReadOne: jest.fn(),
      handleUnarchive: jest.fn(),
      handleSnooze: jest.fn(),
      handleMarkAllRead: jest.fn(),
      handleSelect: jest.fn(),
      handleSelectAll: jest.fn(),
      handleDeselectAll: jest.fn(),
      handleArchive: jest.fn(),
      handlePin: jest.fn(),
      handleDelete: jest.fn(),
      handleBulkMarkRead: jest.fn(),
      handleBulkArchive: jest.fn(),
      handleBulkDelete: jest.fn(),
      handleApprove: jest.fn(),
      handleReject: jest.fn(),
    },
    mutations: {
      markAllRead: noopMutation,
      archive: noopMutation,
      pin: noopMutation,
      unpin: noopMutation,
      deleteMutation: noopMutation,
      bulkMarkRead: noopMutation,
      bulkArchive: noopMutation,
      bulkDelete: noopMutation,
      approve: noopMutation,
      reject: noopMutation,
    },
    emptyTitle: "All caught up",
    emptyDescription: "No notifications to show",
  }),
}));

jest.mock("@/components/ui/page-wrapper", () => ({
  PageWrapper: ({ children }: PropsWithChildren) => <div>{children}</div>,
}));

jest.mock("@/features/notifications/notification-filter-bar", () => ({
  NotificationFilterBar: () => <div data-testid="filter-bar" />,
}));

jest.mock("@/features/notifications/notification-list-skeleton", () => ({
  NotificationListSkeleton: () => <div data-testid="notification-skeleton" />,
}));

jest.mock("@/features/notifications/notification-virtual-list", () => ({
  NotificationVirtualList: () => <div data-testid="notification-list" />,
}));

jest.mock("@/features/notifications/notification-detail-drawer", () => ({
  NotificationDetailDrawer: () => null,
}));

jest.mock("@/components/ui/animated-icon-button", () => ({
  AnimatedIconButton: ({
    "aria-label": label,
    onClick,
  }: {
    "aria-label": string;
    onClick?: () => void;
  }) => <button type="button" aria-label={label} onClick={onClick} />,
}));

jest.mock("@animateicons/react/lucide", () => ({
  XIcon: () => null,
}));

jest.mock("@/components/ui/content-fill-panel", () => ({
  CONTENT_FILL_PANEL: "flex-1",
  CONTENT_PANEL_SOLID: "rounded-xl border",
}));

describe("Notifications page offline indicator", () => {
  it("the /notifications route renders exactly this component", () => {
    const routeSource = readFileSync(
      join(process.cwd(), "app", "(authenticated)", "notifications", "page.tsx"),
      "utf8",
    );
    expect(routeSource).toContain(
      'import { NotificationsInboxPage } from "@/features/notifications/inbox/notifications-inbox-page";',
    );
    expect(routeSource).toContain("<NotificationsInboxPage />");
  });

  afterEach(() => {
    mockIsOnline = true;
    mockNotificationItems = [];
  });

  it("shows the offline warning stripe when the browser is offline", () => {
    mockIsOnline = false;

    render(<NotificationsPage />);

    expect(
      screen.getByText(/you're offline — notifications may be stale/i),
    ).toBeInTheDocument();
  });

  it("does not show the offline stripe when the browser is online", () => {
    mockIsOnline = true;

    render(<NotificationsPage />);

    expect(
      screen.queryByText(/you're offline — notifications may be stale/i),
    ).not.toBeInTheDocument();
  });

  it("announces offline status through an aria-live polite status region", () => {
    mockIsOnline = false;

    render(<NotificationsPage />);

    const region = screen.getByRole("status");
    expect(region).toBeInTheDocument();
    expect(region).toHaveTextContent(/offline/i);
  });

  it("renders the notification list alongside the offline indicator when offline", () => {
    mockIsOnline = false;
    mockNotificationItems = [{ id: 1, title: "Test notification" }];

    render(<NotificationsPage />);

    expect(
      screen.getByText(/you're offline — notifications may be stale/i),
    ).toBeInTheDocument();
    expect(screen.getByTestId("notification-list")).toBeInTheDocument();
  });
});
