"use client";

import React from "react";
import { render, screen } from "@testing-library/react";
import { ClientVisibilityPage } from "./client-visibility-page";

jest.mock("next/navigation", () => ({
  useRouter: () => ({ replace: jest.fn() }),
  useSearchParams: () => ({ get: () => null, toString: () => "" }),
  usePathname: () => "/build/1/client-portal",
}));

const mockUseOnlineStatus = jest.fn(() => true);
jest.mock("@/hooks/common/use-online-status", () => ({
  useOnlineStatus: () => mockUseOnlineStatus(),
}));

jest.mock("framer-motion", () => ({
  motion: {
    div: ({ children, ...rest }: React.HTMLAttributes<HTMLDivElement>) => (
      <div {...rest}>{children}</div>
    ),
  },
  useReducedMotion: () => false,
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

jest.mock("next/link", () => ({
  __esModule: true,
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

jest.mock("sonner", () => ({
  toast: { error: jest.fn(), success: jest.fn() },
}));

jest.mock("@/components/pm-chrome", () => ({
  PmPageShell: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  PmPanel: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  PmSection: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  PM_ROW: "pm-row-class",
  PM_FILL_PANEL: "pm-fill-panel-class",
}));

jest.mock("@/components/ui/page-wrapper", () => ({
  PageWrapper: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

jest.mock("@/components/ui/scroll-area", () => ({
  ScrollArea: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  ScrollBar: () => null,
}));

jest.mock("@/components/ui/page-tabs-toolbar", () => ({
  PageTabsToolbar: ({ tabs }: { tabs: React.ReactNode }) => <div>{tabs}</div>,
}));

jest.mock("@/components/shared/page-state", () => ({
  PageState: ({
    resolution,
    loading,
    children,
  }: {
    resolution: { kind: string };
    loading: React.ReactNode;
    children?: React.ReactNode;
  }) => {
    if (resolution.kind === "loading") return <>{loading}</>;
    if (
      resolution.kind === "denied" ||
      resolution.kind === "module-disabled" ||
      resolution.kind === "plan-required" ||
      resolution.kind === "module-denied"
    )
      return <div role="status">Access Restricted</div>;
    return <>{children}</>;
  },
}));

const mockUseCan = jest.fn<boolean, [string]>(() => false);
jest.mock("@/hooks/api/access", () => ({
  useCan: (permission: string) => mockUseCan(permission),
}));

jest.mock("@/hooks/api/entitlements", () => ({
  useEntitlements: () => ({ data: undefined }),
}));

const mockUsePageState = jest.fn();
jest.mock("@/hooks/api/use-page-state", () => ({
  usePageState: (...args: Parameters<typeof mockUsePageState>) =>
    mockUsePageState(...args),
}));

const mockUseTicketsInfinite = jest.fn();
const mockUseMilestonesInfinite = jest.fn();
const mockUseUpdateTicketVisibility = jest.fn();
const mockUseUpdateMilestoneVisibility = jest.fn();

const emptyInfiniteQuery = () => ({
  items: [],
  hasMore: false,
  isLoading: false,
  isError: false,
  error: undefined,
  isFetchingNextPage: false,
  fetchNextPage: jest.fn(),
  refetch: jest.fn(),
});

jest.mock("@/hooks/api/build/client-portal", () => ({
  useClientVisibilityTicketsInfinite: (...args: [number]) => mockUseTicketsInfinite(...args),
  useClientVisibilityMilestonesInfinite: (...args: [number]) => mockUseMilestonesInfinite(...args),
  useUpdateTicketVisibility: (...args: [number]) =>
    mockUseUpdateTicketVisibility(...args),
  useUpdateMilestoneVisibility: (...args: [number]) =>
    mockUseUpdateMilestoneVisibility(...args),
}));

const mockInfiniteScrollSentinel = jest.fn(() => null);
jest.mock("@/components/ui/infinite-scroll-sentinel", () => ({
  InfiniteScrollSentinel: (props: Record<string, unknown>) => mockInfiniteScrollSentinel(props),
}));

beforeEach(() => {
  jest.clearAllMocks();
  mockUseTicketsInfinite.mockReturnValue(emptyInfiniteQuery());
  mockUseMilestonesInfinite.mockReturnValue(emptyInfiniteQuery());
  mockUseUpdateTicketVisibility.mockReturnValue({ mutate: jest.fn(), isPending: false });
  mockUseUpdateMilestoneVisibility.mockReturnValue({ mutate: jest.fn(), isPending: false });
  mockUseCan.mockReturnValue(false);
  mockUsePageState.mockReturnValue({ kind: "loading" });
  mockInfiniteScrollSentinel.mockReturnValue(null);
  mockUseOnlineStatus.mockReturnValue(true);
});

describe("AP-9: ClientVisibilityPage must resolve through usePageState not a bare boolean useCan gate", () => {
  it("does not show access-denied state while the access snapshot is still loading — useCan returns false during this window so a page gated on !useCan wrongly denies permitted users", () => {
    mockUseCan.mockReturnValue(false);
    mockUsePageState.mockReturnValue({ kind: "loading" });

    render(<ClientVisibilityPage projectId={1} />);

    expect(screen.queryByText("Access Restricted")).not.toBeInTheDocument();
  });

  it("shows access-denied view when the access snapshot confirms the permission is not held", () => {
    mockUseCan.mockReturnValue(false);
    mockUsePageState.mockReturnValue({
      kind: "denied",
      permission: "build:clientvisibility:manage",
    });

    render(<ClientVisibilityPage projectId={1} />);

    expect(screen.getByText("Access Restricted")).toBeInTheDocument();
  });

  it("renders visibility content when usePageState resolves to ready with permission held", () => {
    mockUseCan.mockReturnValue(true);
    mockUsePageState.mockReturnValue({ kind: "ready" });
    mockUseTicketsInfinite.mockReturnValue({ ...emptyInfiniteQuery() });
    mockUseMilestonesInfinite.mockReturnValue({ ...emptyInfiniteQuery() });

    render(<ClientVisibilityPage projectId={1} />);

    expect(screen.queryByText("Access Restricted")).not.toBeInTheDocument();
  });

  it("passes permission build:clientvisibility:manage to usePageState so the correct gate is evaluated", () => {
    mockUsePageState.mockReturnValue({ kind: "ready" });
    mockUseTicketsInfinite.mockReturnValue({ ...emptyInfiniteQuery() });
    mockUseMilestonesInfinite.mockReturnValue({ ...emptyInfiniteQuery() });

    render(<ClientVisibilityPage projectId={1} />);

    expect(mockUsePageState).toHaveBeenCalledWith(
      expect.objectContaining({ permission: "build:clientvisibility:manage" }),
    );
  });
});

describe("C4: ClientVisibilityPage uses IntersectionObserver sentinel so lists are bounded at 10k items", () => {
  it("renders InfiniteScrollSentinel for tickets so the DOM is bounded as more pages are fetched", () => {
    mockUsePageState.mockReturnValue({ kind: "ready" });
    const fetchNextPage = jest.fn();
    mockUseTicketsInfinite.mockReturnValue({
      ...emptyInfiniteQuery(),
      items: [{ id: 1, ticketNumber: 1, title: "T1", type: "bug", clientVisible: false }],
      hasMore: true,
      isFetchingNextPage: false,
      fetchNextPage,
    });
    mockUseMilestonesInfinite.mockReturnValue(emptyInfiniteQuery());

    render(<ClientVisibilityPage projectId={1} />);

    expect(mockInfiniteScrollSentinel).toHaveBeenCalledWith(
      expect.objectContaining({ hasNextPage: true }),
    );
  });

  it("passes hasNextPage=false to InfiniteScrollSentinel when hasMore is false so the sentinel does not trigger spurious fetches", () => {
    mockUsePageState.mockReturnValue({ kind: "ready" });
    const fetchNextPage = jest.fn();
    mockUseTicketsInfinite.mockReturnValue({
      ...emptyInfiniteQuery(),
      items: [{ id: 1, ticketNumber: 1, title: "T1", type: "bug", clientVisible: false }],
      hasMore: false,
      isFetchingNextPage: false,
      fetchNextPage,
    });
    mockUseMilestonesInfinite.mockReturnValue(emptyInfiniteQuery());

    render(<ClientVisibilityPage projectId={1} />);

    const sentinelCalls = mockInfiniteScrollSentinel.mock.calls;
    const ticketSentinelCall = sentinelCalls.find(
      ([props]: [Record<string, unknown>]) =>
        (props as { label?: string }).label === "Load more tickets",
    );
    expect(ticketSentinelCall).toBeDefined();
    expect(ticketSentinelCall![0]).toEqual(
      expect.objectContaining({ hasNextPage: false }),
    );
  });
});

describe("offline state — CCG-5", () => {
  it("shows the offline banner when useOnlineStatus returns false so stale data is labelled", () => {
    mockUseOnlineStatus.mockReturnValue(false);
    mockUsePageState.mockReturnValue({ kind: "ready" });
    render(<ClientVisibilityPage projectId={1} />);
    expect(screen.getByText(/you're offline/i)).toBeInTheDocument();
  });

  it("does not show the offline banner when useOnlineStatus returns true so the banner is absent during normal operation — pairs the above", () => {
    mockUseOnlineStatus.mockReturnValue(true);
    mockUsePageState.mockReturnValue({ kind: "ready" });
    render(<ClientVisibilityPage projectId={1} />);
    expect(screen.queryByText(/you're offline/i)).not.toBeInTheDocument();
  });
});
