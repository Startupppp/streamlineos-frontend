"use client";

import React from "react";
import { render, screen } from "@testing-library/react";
import CrmActivitiesPage from "./page";

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn() }),
  usePathname: () => "/crm/activities",
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

jest.mock("@/components/ui/data-table-skeleton", () => ({
  DataTableSkeleton: () => <div data-testid="data-table-skeleton" />,
}));

jest.mock("@/components/ui/empty-state", () => ({
  EmptyState: ({ title }: { title: string }) => <div data-testid="empty-state">{title}</div>,
}));

jest.mock("@/components/illustrations", () => ({
  EmptyActivityIllustration: () => null,
}));

jest.mock("@/features/crm/activities/activity-filters", () => ({
  ActivityFilters: () => null,
}));

jest.mock("@/features/crm/activities/log-activity-dialog", () => ({
  LogActivityDialog: () => null,
}));

jest.mock("@/features/crm/activities/activities-stats-bar", () => ({
  ActivitiesStatsBar: () => null,
}));

jest.mock("@/components/renderer", () => ({
  RecordList: () => <div data-testid="record-list" />,
}));

jest.mock("@/components/renderer/density-toggle", () => ({
  DensityToggle: () => null,
  useDensity: () => ["comfortable", jest.fn()],
}));

jest.mock("@/components/renderer/use-tenant-layout", () => ({
  useTenantLayout: (layout: unknown) => layout,
}));

jest.mock("@/lib/renderer/crm/activity-layout", () => ({
  activityLayoutWithTypes: () => ({ list: { columns: [{ key: "title" }] } }),
  activityRecordFields: (row: unknown) => row,
  activityStatus: () => "pending",
  activityTypeOptions: () => [],
}));

jest.mock("@/hooks/api/crm/metadata", () => ({
  useCrmOptions: jest.fn(() => ({ data: [] })),
}));

jest.mock("@/hooks/api/crm/crm-activities", () => ({
  useCrmActivities: jest.fn(),
  useLogCrmActivity: jest.fn(() => ({ mutate: jest.fn(), isPending: false })),
  useCompleteCrmActivity: jest.fn(() => ({ mutate: jest.fn(), isPending: false, variables: undefined })),
}));

jest.mock("@/lib/get-error-message", () => ({
  getErrorMessage: (e: unknown) => String(e),
}));

jest.mock("@/components/ui/content-fill-panel", () => ({
  CONTENT_FILL_PANEL: "content-fill-panel",
}));

const mockUsePageState = jest.fn();
jest.mock("@/hooks/api/use-page-state", () => ({
  usePageState: (...args: Parameters<typeof mockUsePageState>) => mockUsePageState(...args),
}));

import { useCrmActivities } from "@/hooks/api/crm/crm-activities";
const mockUseCrmActivities = useCrmActivities as jest.Mock;

const LOADED_DATA = {
  tasks: [{ id: 1, title: "Follow-up call", status: "pending", entityType: "LEAD", entityId: 5 }],
  total: 1,
};

beforeEach(() => {
  jest.clearAllMocks();
  mockUseCrmActivities.mockReturnValue({
    data: LOADED_DATA,
    isLoading: false,
    isError: false,
    error: undefined,
    refetch: jest.fn(),
  });
  mockUsePageState.mockReturnValue({ kind: "loading" });
});

describe("AP-9: CrmActivitiesPage — wrong permission tasks:read replaced with crm:activities:view", () => {
  it("does not show access-denied state while the access snapshot is still loading — useCan returned false during this window so the old gate wrongly denied permitted users", () => {
    mockUsePageState.mockReturnValue({ kind: "loading" });

    render(<CrmActivitiesPage />);

    expect(screen.queryByText("Access Restricted")).not.toBeInTheDocument();
  });

  it("shows access-denied view when usePageState resolves the permission as denied after the snapshot lands", () => {
    mockUsePageState.mockReturnValue({ kind: "denied", permission: "crm:activities:view" });

    render(<CrmActivitiesPage />);

    expect(screen.getByText("Access Restricted")).toBeInTheDocument();
  });

  it("renders the activity list when usePageState resolves to ready — loaded data present so the list actually renders", () => {
    mockUsePageState.mockReturnValue({ kind: "ready" });

    render(<CrmActivitiesPage />);

    expect(screen.queryByText("Access Restricted")).not.toBeInTheDocument();
    expect(screen.getByTestId("record-list")).toBeInTheDocument();
  });

  it("passes crm:activities:view — not tasks:read which belongs to the task board — to usePageState", () => {
    mockUsePageState.mockReturnValue({ kind: "ready" });

    render(<CrmActivitiesPage />);

    expect(mockUsePageState).toHaveBeenCalledWith(
      expect.objectContaining({ permission: "crm:activities:view" }),
    );
    expect(mockUsePageState).not.toHaveBeenCalledWith(
      expect.objectContaining({ permission: "tasks:read" }),
    );
  });
});
