"use client";

import { render, screen } from "@testing-library/react";
import type { PropsWithChildren } from "react";
import { NotificationBell } from "./notification-bell";
import { NotificationBellPanel } from "./notification-bell-panel";

let isMobile = false;
let mockUnifiedCount = {
  notification: 0,
  mail: 0,
  approval: 0,
  total: 0,
  mailExact: true,
};
let mockInboxData: {
  pages: Array<{
    items: Array<{
      kind: string;
      id: number | string;
      subject: string;
      timestamp: string;
      isRead: boolean;
      deepLink: string | null;
      dedupKey: string;
      [key: string]: unknown;
    }>;
    hasMore: boolean;
    nextCursor: string | null;
    sources: Array<{
      kind: string;
      included: boolean;
      reason: string | null;
      available: boolean;
      error: string | null;
    }>;
    degraded: boolean;
  }>;
} = { pages: [] };
let mockIsLoading = false;
let mockIsError = false;

jest.mock("next/link", () => {
  return function Link({
    children,
    href,
    ...props
  }: PropsWithChildren<{ href: string }>) {
    return (
      <a href={href} {...props}>
        {children}
      </a>
    );
  };
});

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: jest.fn() }),
}));

jest.mock("@/hooks/common/use-mobile", () => ({
  useIsMobile: () => isMobile,
}));

jest.mock("@/hooks/common/use-animated-icon", () => ({
  useAnimatedIcon: () => ({
    iconRef: { current: null },
    hoverHandlers: {},
  }),
}));

jest.mock("@/hooks/api/inbox", () => ({
  useUnifiedInboxCount: () => ({ data: mockUnifiedCount }),
  useUnifiedInbox: () => ({
    data: mockInboxData,
    isLoading: mockIsLoading,
    isError: mockIsError,
  }),
}));

jest.mock("@/hooks/api/notifications-inbox", () => ({
  useMarkNotificationRead: () => ({ mutate: jest.fn() }),
  useMarkAllNotificationsRead: () => ({ mutate: jest.fn(), isPending: false }),
}));

jest.mock("./use-notification-events", () => ({
  useNotificationEvents: jest.fn(),
}));

jest.mock("@/components/ui/popover", () => ({
  Popover: ({ children }: PropsWithChildren) => (
    <div data-testid="desktop-popover">{children}</div>
  ),
  PopoverContent: ({ children }: PropsWithChildren) => <div>{children}</div>,
  PopoverTrigger: ({ children }: PropsWithChildren) => <>{children}</>,
}));

jest.mock("@/components/ui/drawer", () => ({
  Drawer: ({ children }: PropsWithChildren) => (
    <div data-testid="mobile-drawer">{children}</div>
  ),
  DrawerContent: ({ children }: PropsWithChildren) => <div>{children}</div>,
  DrawerTitle: ({ children }: PropsWithChildren) => <h3>{children}</h3>,
  DrawerTrigger: ({ children }: PropsWithChildren) => <>{children}</>,
}));

function renderPanel(unreadCount = 0) {
  return render(
    <NotificationBellPanel
      unreadCount={unreadCount}
      surface="popover"
      onClose={jest.fn()}
    />,
  );
}

describe("NotificationBell — unified count badge", () => {
  afterEach(() => {
    isMobile = false;
    mockUnifiedCount = {
      notification: 0,
      mail: 0,
      approval: 0,
      total: 0,
      mailExact: true,
    };
    mockInboxData = { pages: [] };
    mockIsLoading = false;
    mockIsError = false;
  });

  it("shows no badge when total is zero", () => {
    mockUnifiedCount = { notification: 0, mail: 0, approval: 0, total: 0, mailExact: true };
    render(<NotificationBell />);
    expect(screen.queryByText(/^\d/)).not.toBeInTheDocument();
  });

  it("shows the badge when notification-only count is non-zero", () => {
    mockUnifiedCount = { notification: 3, mail: 0, approval: 0, total: 3, mailExact: true };
    render(<NotificationBell />);
    expect(screen.getByText("3")).toBeInTheDocument();
  });

  it("shows the badge when mail-only count is non-zero", () => {
    mockUnifiedCount = { notification: 0, mail: 5, approval: 0, total: 5, mailExact: false };
    render(<NotificationBell />);
    expect(screen.getByText("5")).toBeInTheDocument();
  });

  it("shows the badge when approval-only count is non-zero", () => {
    mockUnifiedCount = { notification: 0, mail: 0, approval: 2, total: 2, mailExact: true };
    render(<NotificationBell />);
    expect(screen.getByText("2")).toBeInTheDocument();
  });

  it("sums notification + mail + approval into the total and displays that on the badge", () => {
    mockUnifiedCount = { notification: 1, mail: 2, approval: 3, total: 6, mailExact: true };
    render(<NotificationBell />);
    expect(screen.getByText("6")).toBeInTheDocument();
  });

  it("live region reflects the unified total, not a single source", () => {
    mockUnifiedCount = { notification: 1, mail: 2, approval: 3, total: 6, mailExact: true };
    render(<NotificationBell />);
    const region = screen.getByRole("status");
    expect(region).toHaveTextContent("6 unread items in inbox");
  });

  it("live region is empty when total is zero", () => {
    render(<NotificationBell />);
    const region = screen.getByRole("status");
    expect(region).toHaveTextContent("");
  });

  it("a source the actor cannot access contributes 0 and does not inflate the badge", () => {
    mockUnifiedCount = { notification: 2, mail: 0, approval: 0, total: 2, mailExact: true };
    render(<NotificationBell />);
    expect(screen.getByText("2")).toBeInTheDocument();
    expect(screen.queryByText("3")).not.toBeInTheDocument();
  });
});

describe("NotificationBellPanel — unified inbox preview", () => {
  afterEach(() => {
    mockInboxData = { pages: [] };
    mockIsLoading = false;
    mockIsError = false;
  });

  it("shows loading skeleton while data is loading", () => {
    mockIsLoading = true;
    renderPanel();
    const skeletonItems = document.querySelectorAll("[class*='skeleton' i], [data-slot='skeleton']");
    expect(skeletonItems.length).toBeGreaterThan(0);
  });

  it("shows error state with a link to /inbox when loading fails", () => {
    mockIsError = true;
    renderPanel();
    expect(screen.getByText(/couldn't load inbox/i)).toBeInTheDocument();
    const link = screen.getByRole("link", { name: /open inbox/i });
    expect(link).toHaveAttribute("href", "/inbox");
    expect(link).not.toHaveAttribute("href", "/notifications");
  });

  it("shows empty state with a message when there are no items", () => {
    mockInboxData = {
      pages: [
        {
          items: [],
          hasMore: false,
          nextCursor: null,
          sources: [],
          degraded: false,
        },
      ],
    };
    renderPanel();
    expect(screen.getByText(/you're all caught up/i)).toBeInTheDocument();
  });

  it("footer link goes to /inbox not /notifications", () => {
    renderPanel();
    const links = screen.getAllByRole("link");
    const footerLink = links.find((l) => l.textContent?.includes("Open Inbox"));
    expect(footerLink).toBeDefined();
    expect(footerLink).toHaveAttribute("href", "/inbox");
    const notifLink = links.find((l) => l.getAttribute("href") === "/notifications");
    expect(notifLink).toBeUndefined();
  });

  it("names unavailable sources when the response is degraded", () => {
    mockInboxData = {
      pages: [
        {
          items: [],
          hasMore: false,
          nextCursor: null,
          sources: [
            {
              kind: "mail",
              included: false,
              reason: "error",
              available: false,
              error: "upstream timeout",
            },
          ],
          degraded: true,
        },
      ],
    };
    renderPanel();
    expect(screen.getByText(/mail/i)).toBeInTheDocument();
    expect(screen.getByText(/temporarily unavailable/i)).toBeInTheDocument();
  });

  it("does not show a degraded banner when degraded is false", () => {
    mockInboxData = {
      pages: [
        {
          items: [],
          hasMore: false,
          nextCursor: null,
          sources: [
            {
              kind: "mail",
              included: true,
              reason: null,
              available: true,
              error: null,
            },
          ],
          degraded: false,
        },
      ],
    };
    renderPanel();
    expect(screen.queryByText(/temporarily unavailable/i)).not.toBeInTheDocument();
  });

  it("renders notification items with their subject", () => {
    mockInboxData = {
      pages: [
        {
          items: [
            {
              kind: "notification",
              id: 1,
              subject: "You have a new message",
              timestamp: new Date().toISOString(),
              isRead: false,
              deepLink: null,
              dedupKey: "notif-1",
              notifType: "INFO",
              priority: "NORMAL",
              category: "SYSTEM",
              eventKey: null,
              body: "body text",
              pinned: false,
              sourceModule: "core",
              actor: null,
            },
          ],
          hasMore: false,
          nextCursor: null,
          sources: [],
          degraded: false,
        },
      ],
    };
    renderPanel();
    expect(screen.getByText("You have a new message")).toBeInTheDocument();
  });

  it("shows mark-all-read button when unreadCount is positive and there are readable items", () => {
    mockInboxData = {
      pages: [
        {
          items: [
            {
              kind: "notification",
              id: 1,
              subject: "Unread notification",
              timestamp: new Date().toISOString(),
              isRead: false,
              deepLink: null,
              dedupKey: "notif-1",
              notifType: "INFO",
              priority: "NORMAL",
              category: "SYSTEM",
              eventKey: null,
              body: "body",
              pinned: false,
              sourceModule: "core",
              actor: null,
            },
          ],
          hasMore: false,
          nextCursor: null,
          sources: [],
          degraded: false,
        },
      ],
    };
    renderPanel(1);
    expect(
      screen.getByRole("button", { name: /mark all notifications read/i }),
    ).toBeInTheDocument();
  });

  it("does not show mark-all-read button when unreadCount is zero", () => {
    mockInboxData = {
      pages: [
        {
          items: [
            {
              kind: "notification",
              id: 1,
              subject: "Read notification",
              timestamp: new Date().toISOString(),
              isRead: true,
              deepLink: null,
              dedupKey: "notif-1",
              notifType: "INFO",
              priority: "NORMAL",
              category: "SYSTEM",
              eventKey: null,
              body: "body",
              pinned: false,
              sourceModule: "core",
              actor: null,
            },
          ],
          hasMore: false,
          nextCursor: null,
          sources: [],
          degraded: false,
        },
      ],
    };
    renderPanel(0);
    expect(
      screen.queryByRole("button", { name: /mark all notifications read/i }),
    ).not.toBeInTheDocument();
  });
});
