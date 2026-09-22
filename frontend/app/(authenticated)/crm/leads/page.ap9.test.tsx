"use client";

import React from "react";
import { render, screen } from "@testing-library/react";
import LeadsPipelinePage from "./page";

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn() }),
  usePathname: () => "/crm/leads",
  useSearchParams: () => new URLSearchParams(),
}));

jest.mock("sonner", () => ({
  toast: { success: jest.fn(), error: jest.fn() },
}));

jest.mock("@/components/ui/page-wrapper", () => ({
  PageWrapper: ({ children, title }: { children: React.ReactNode; title?: string }) => (
    <div>
      {title ? <h1>{title}</h1> : null}
      {children}
    </div>
  ),
}));

jest.mock("@/components/shared/page-state", () => ({
  PageState: ({
    resolution,
    loading,
  }: {
    resolution: { kind: string };
    loading: React.ReactNode;
  }) => {
    if (resolution.kind === "loading") return <>{loading}</>;
    if (
      resolution.kind === "denied" ||
      resolution.kind === "module-disabled" ||
      resolution.kind === "plan-required" ||
      resolution.kind === "module-denied"
    )
      return <div role="status">Access Restricted</div>;
    return <div>{resolution.kind}</div>;
  },
}));

jest.mock("@/components/ui/skeleton", () => ({
  Skeleton: () => <div data-testid="skeleton" />,
}));

jest.mock("@/components/ui/data-table-skeleton", () => ({
  DataTableSkeleton: () => <div data-testid="data-table-skeleton" />,
}));

jest.mock("@/components/shared/error-state", () => ({
  ErrorState: ({ title }: { title: string }) => <div data-testid="error-state">{title}</div>,
}));

jest.mock("@/features/crm/leads/leads-stats-bar", () => ({
  LeadsStatsBar: () => null,
}));

jest.mock("@/features/crm/leads/leads-toolbar", () => ({
  LeadsToolbar: () => null,
}));

jest.mock("@/features/crm/leads/lead-list-view", () => ({
  LeadListView: () => <div data-testid="lead-list-view" />,
}));

jest.mock("@/features/crm/leads/leads-lazy", () => ({
  CreateLeadSheet: () => null,
  LeadDetailSheet: () => null,
  LeadExportDialog: () => null,
  LeadsFunnelView: () => null,
  LeadsKanban: () => null,
}));

jest.mock("@/features/crm/leads/lead-board-columns", () => ({
  projectBoardColumns: () => null,
}));

jest.mock("@/features/crm/import/import-link-button", () => ({
  ImportLinkButton: () => null,
}));

jest.mock("@/components/renderer/density-toggle", () => ({
  DensityToggle: () => null,
  useDensity: () => ["comfortable", jest.fn()],
}));

jest.mock("@/hooks/api/leads", () => ({
  useLeadBoard: jest.fn(),
  useLeadStats: jest.fn(),
  useUpdateLeadStatus: jest.fn(() => ({ mutateAsync: jest.fn() })),
  useLeads: jest.fn(),
}));

jest.mock("@/hooks/api/crm/metadata", () => ({
  useCrmOptions: jest.fn(() => ({ data: [] })),
  resolveOption: jest.fn((_, v: string) => ({ label: v })),
}));

jest.mock("@/hooks/common/use-leads-filters", () => ({
  useLeadsFilters: () => ({
    view: "table",
    searchQuery: "",
    statusFilter: undefined,
    priorityFilter: undefined,
    sourceFilter: undefined,
    sortColumn: "createdAt",
    sortDirection: "desc",
    pageSize: 25,
    setView: jest.fn(),
    setSearchQuery: jest.fn(),
    setStatusFilter: jest.fn(),
    setPriorityFilter: jest.fn(),
    setSourceFilter: jest.fn(),
    setPageSize: jest.fn(),
    clearFilters: jest.fn(),
  }),
}));

jest.mock("@/hooks/common/use-query-param-open", () => ({
  useQueryParamOpen: () => ({ open: false, onOpenChange: jest.fn() }),
}));

const mockUseCan = jest.fn<boolean, [string]>(() => false);
jest.mock("@/hooks/api/access", () => ({
  useCan: (permission: string) => mockUseCan(permission),
  useScope: jest.fn(() => "all"),
}));

const mockUsePageState = jest.fn();
jest.mock("@/hooks/api/use-page-state", () => ({
  usePageState: (...args: Parameters<typeof mockUsePageState>) => mockUsePageState(...args),
}));

import { useLeadBoard, useLeadStats, useLeads } from "@/hooks/api/leads";
const mockUseLeadBoard = useLeadBoard as jest.Mock;
const mockUseLeadStats = useLeadStats as jest.Mock;
const mockUseLeads = useLeads as jest.Mock;

beforeEach(() => {
  jest.clearAllMocks();
  mockUseLeadBoard.mockReturnValue({
    data: null,
    isLoading: false,
    isError: false,
    error: undefined,
    refetch: jest.fn(),
  });
  mockUseLeadStats.mockReturnValue({
    data: null,
    isLoading: false,
    isError: false,
  });
  mockUseLeads.mockReturnValue({
    data: null,
    isLoading: false,
    isError: false,
    refetch: jest.fn(),
  });
  mockUseCan.mockReturnValue(false);
  mockUsePageState.mockReturnValue({ kind: "loading" });
});

describe("AP-9: LeadsPipelinePage must resolve through usePageState not bare error returns", () => {
  it("does not show access-denied state while the access snapshot is still loading — useCan returns false during this window so a page gated on it wrongly denies permitted users", () => {
    mockUsePageState.mockReturnValue({ kind: "loading" });

    render(<LeadsPipelinePage />);

    expect(screen.queryByText("Access Restricted")).not.toBeInTheDocument();
  });

  it("shows access-denied view when usePageState resolves the permission as denied after the snapshot lands", () => {
    mockUsePageState.mockReturnValue({ kind: "denied", permission: "crm:leads:view" });

    render(<LeadsPipelinePage />);

    expect(screen.getByText("Access Restricted")).toBeInTheDocument();
  });

  it("renders the leads page when usePageState resolves to ready", () => {
    mockUseCan.mockReturnValue(true);
    mockUsePageState.mockReturnValue({ kind: "ready" });
    mockUseLeadBoard.mockReturnValue({
      data: {},
      isLoading: false,
      isError: false,
      error: undefined,
      refetch: jest.fn(),
    });
    mockUseLeadStats.mockReturnValue({
      data: { total: 0 },
      isLoading: false,
      isError: false,
    });
    mockUseLeads.mockReturnValue({
      data: { leads: [], totalCount: 0, hasMore: false },
      isLoading: false,
      isError: false,
      refetch: jest.fn(),
    });

    render(<LeadsPipelinePage />);

    expect(screen.queryByText("Access Restricted")).not.toBeInTheDocument();
  });

  it("passes permission crm:leads:view to usePageState so the correct gate is evaluated", () => {
    mockUsePageState.mockReturnValue({ kind: "ready" });
    mockUseLeadBoard.mockReturnValue({
      data: {},
      isLoading: false,
      isError: false,
      error: undefined,
      refetch: jest.fn(),
    });
    mockUseLeadStats.mockReturnValue({
      data: { total: 0 },
      isLoading: false,
      isError: false,
    });
    mockUseLeads.mockReturnValue({
      data: { leads: [], totalCount: 0, hasMore: false },
      isLoading: false,
      isError: false,
      refetch: jest.fn(),
    });

    render(<LeadsPipelinePage />);

    expect(mockUsePageState).toHaveBeenCalledWith(
      expect.objectContaining({ permission: "crm:leads:view" }),
    );
  });
});
