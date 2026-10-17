"use client";

import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { toast } from "sonner";
import { ApiError } from "@/lib/api-envelope";
import { apiClient } from "@/lib/api-client";
import { buildWorkQueryKeys } from "@/lib/query-keys/build-work";
import { ClientVisibilityPage } from "./client-visibility-page";

jest.mock("@/lib/api-client", () => ({ apiClient: { patch: jest.fn() } }));

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
  CONTENT_FILL_PANEL: "pm-fill-panel-class",
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
  useAccess: () => ({ data: { permissions: ["build:clientvisibility:manage"] }, refetch: jest.fn() }),
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

const mockInfiniteScrollSentinel = jest.fn((_props: Record<string, unknown>) => null);
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
  it("reports a failed Ticket toggle once through the real mutation hook and retains the prior visibility", async () => {
    mockUseCan.mockReturnValue(true);
    mockUsePageState.mockReturnValue({ kind: "ready" });
    const ticket = { id: 7, ticketNumber: 7, title: "T7", type: "bug", clientVisible: false, version: 3 };
    mockUseTicketsInfinite.mockReturnValue({ ...emptyInfiniteQuery(), items: [ticket] });
    mockUseUpdateTicketVisibility.mockImplementation(
      jest.requireActual<typeof import("@/hooks/api/build/client-portal")>("@/hooks/api/build/client-portal").useUpdateTicketVisibility,
    );
    jest.mocked(apiClient.patch).mockRejectedValueOnce(new ApiError("Conflict", 409));
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
    const ticketKey = buildWorkQueryKeys.projects.ticket(1, 7);
    qc.setQueryData(ticketKey, ticket);
    const invalidateSpy = jest.spyOn(qc, "invalidateQueries");
    render(<QueryClientProvider client={qc}><ClientVisibilityPage projectId={1} /></QueryClientProvider>);
    const toggle = screen.getByRole("switch", { name: "Toggle client visibility for ticket #7" });
    fireEvent.click(toggle);
    await waitFor(() => expect(apiClient.patch).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(toggle).toBeEnabled());
    expect(apiClient.patch).toHaveBeenCalledWith(
      "/build/1/client-visibility/tickets/7", { clientVisible: true, version: 3 }, undefined, expect.anything(),
    );
    expect(toggle).toHaveAttribute("aria-checked", "false");
    expect(qc.getQueryData(ticketKey)).toEqual(ticket);
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ticketKey });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: buildWorkQueryKeys.projects.clientPortal.visibility(1) });
    expect(toast.error).toHaveBeenCalledWith("This action conflicts with existing data.");
    expect(toast.error).toHaveBeenCalledTimes(1);
  });

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
    const ticketSentinelProps = sentinelCalls
      .map(([props]) => props)
      .find((props) => props.label === "Load more tickets");
    expect(ticketSentinelProps).toBeDefined();
    expect(ticketSentinelProps).toEqual(
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
