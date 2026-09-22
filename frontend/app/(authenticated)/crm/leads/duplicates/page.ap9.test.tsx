"use client";

import React from "react";
import { render, screen } from "@testing-library/react";
import DuplicateLeadsPage from "./page";
import { ApiError } from "@/lib/api-envelope";

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

jest.mock("@/components/ui/stat-card", () => ({
  StatCard: ({ label }: { label: string }) => <div>{label}</div>,
  StatCardGrid: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

jest.mock("@/components/ui/empty-state", () => ({
  EmptyState: ({ title }: { title: string }) => <div data-testid="empty-state">{title}</div>,
}));

jest.mock("@/components/illustrations", () => ({
  EmptyLeadsIllustration: () => null,
}));

jest.mock("@/components/renderer", () => ({
  RecordList: () => <div data-testid="record-list" />,
  asRecordValues: (rows: unknown[]) => rows,
}));

jest.mock("@/components/ui/card", () => ({
  Card: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  CardContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  CardHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

jest.mock("@/components/ui/badge", () => ({
  Badge: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
}));

jest.mock("@/components/ui/confirm-dialog", () => ({
  ConfirmDialog: ({ open }: { open: boolean }) =>
    open ? <div data-testid="confirm-dialog" /> : null,
}));

jest.mock("@/components/ui/skeleton", () => ({
  Skeleton: () => <div data-testid="skeleton" />,
}));

jest.mock("@/features/crm/leads/use-lead-layout", () => ({
  useLeadLayout: () => ({ list: { columns: [{ key: "name" }] } }),
}));

jest.mock("@/lib/renderer/layout-adjustment", () => ({
  withColumns: (_layout: unknown, _cols: unknown) => ({
    list: { columns: [{ key: "name" }] },
  }),
}));

jest.mock("@/hooks/api/org-display", () => ({
  useOrgDisplay: () => ({ currency: "INR", locale: "en-IN" }),
}));

jest.mock("@/lib/design-tokens", () => ({
  statusToneClasses: () => ({ surface: "", inkStrong: "", rule: "" }),
}));

jest.mock("@/lib/utils", () => ({
  cn: (...args: string[]) => args.filter(Boolean).join(" "),
}));

jest.mock("@/hooks/api/entitlements", () => ({
  useEntitlements: () => ({ data: undefined }),
}));

const mockUsePageState = jest.fn();
jest.mock("@/hooks/api/use-page-state", () => ({
  usePageState: (...args: Parameters<typeof mockUsePageState>) => mockUsePageState(...args),
}));

const mockUseDuplicateLeads = jest.fn();
const mockUseMergeLead = jest.fn();
jest.mock("@/hooks/api/crm/leads", () => ({
  useDuplicateLeads: () => mockUseDuplicateLeads(),
  useMergeLead: () => mockUseMergeLead(),
}));

beforeEach(() => {
  jest.clearAllMocks();
  mockUseDuplicateLeads.mockReturnValue({
    data: undefined,
    isLoading: false,
    isFetching: false,
    isError: false,
    error: undefined,
    refetch: jest.fn(),
  });
  mockUseMergeLead.mockReturnValue({ mutate: jest.fn(), isPending: false });
  mockUsePageState.mockReturnValue({ kind: "loading" });
});

describe("AP-9: DuplicateLeadsPage must resolve through usePageState not a bare useCanState gate", () => {
  it("does not show access-denied state while the access snapshot is loading — the old useCanState guard wrongly denied permitted users in this window", () => {
    mockUsePageState.mockReturnValue({ kind: "loading" });

    render(<DuplicateLeadsPage />);

    expect(screen.queryByText("Access Restricted")).not.toBeInTheDocument();
  });

  it("shows access-denied view after usePageState resolves crm:leads:view as denied", () => {
    mockUsePageState.mockReturnValue({ kind: "denied", permission: "crm:leads:view" });

    render(<DuplicateLeadsPage />);

    expect(screen.getByText("Access Restricted")).toBeInTheDocument();
  });

  it("renders page content when usePageState resolves to ready", () => {
    mockUsePageState.mockReturnValue({ kind: "ready" });
    mockUseDuplicateLeads.mockReturnValue({
      data: { groups: [], total: 0 },
      isLoading: false,
      isFetching: false,
      isError: false,
      error: undefined,
      refetch: jest.fn(),
    });

    render(<DuplicateLeadsPage />);

    expect(screen.queryByText("Access Restricted")).not.toBeInTheDocument();
  });

  it("passes permission crm:leads:view and error to usePageState so the 402 upgrade path is reachable", () => {
    const err = new ApiError("CRM not in plan.", 402, "MODULE_NOT_ENABLED", {
      moduleKey: "crm",
      reason: "not-in-plan",
      upgradePath: "/settings/billing",
    });
    mockUseDuplicateLeads.mockReturnValue({
      data: undefined,
      isLoading: false,
      isFetching: false,
      isError: true,
      error: err,
      refetch: jest.fn(),
    });
    mockUsePageState.mockReturnValue({ kind: "ready" });

    render(<DuplicateLeadsPage />);

    expect(mockUsePageState).toHaveBeenCalledWith(
      expect.objectContaining({ permission: "crm:leads:view", error: err }),
    );
  });
});
