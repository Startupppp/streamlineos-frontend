"use client";

import { render, screen } from "@testing-library/react";
import type { PropsWithChildren } from "react";
import { NotificationBell } from "./notification-bell";

let isMobile = false;
let mockUnreadCount = 0;

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

jest.mock("@/hooks/api/notifications", () => ({
  useUnreadNotificationCount: () => ({ data: { count: mockUnreadCount } }),
  useUnreadNotifications: () => ({
    data: [],
    isLoading: false,
    isError: false,
  }),
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

describe("NotificationBell", () => {
  afterEach(() => {
    isMobile = false;
    mockUnreadCount = 0;
  });

  it("uses a popover on desktop", () => {
    render(<NotificationBell />);

    expect(screen.getByTestId("desktop-popover")).toBeInTheDocument();
    expect(screen.queryByTestId("mobile-drawer")).not.toBeInTheDocument();
  });

  it("uses a drawer on mobile", () => {
    isMobile = true;

    render(<NotificationBell />);

    expect(screen.getByTestId("mobile-drawer")).toBeInTheDocument();
    expect(screen.queryByTestId("desktop-popover")).not.toBeInTheDocument();
  });

  it("renders a polite live region with role status", () => {
    render(<NotificationBell />);

    const region = screen.getByRole("status");
    expect(region).toBeInTheDocument();
  });

  it("live region contains the unread count when count is positive", () => {
    mockUnreadCount = 5;

    render(<NotificationBell />);

    const region = screen.getByRole("status");
    expect(region).toHaveTextContent("5 unread notifications");
  });

  it("live region is empty when unread count is zero", () => {
    render(<NotificationBell />);

    const region = screen.getByRole("status");
    expect(region).toHaveTextContent("");
  });
});
