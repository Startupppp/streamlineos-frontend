"use client";

import React from "react";
import { render, screen } from "@testing-library/react";
import WinLossAnalysisPage from "./page";
import { ApiError } from "@/lib/api-envelope";

jest.mock("framer-motion", () => ({
  motion: {
    div: ({ children, ...rest }: React.HTMLAttributes<HTMLDivElement>) => <div {...rest}>{children}</div>,
  },
  useReducedMotion: () => false,
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
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
    if (resolution.kind === "error")
      return <div data-testid="error-state">{(resolution as { message?: string }).message}</div>;
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
  EmptyDealsIllustration: () => null,
}));

jest.mock("@/components/charts/chart-empty-state", () => ({
  ChartEmptyState: () => null,
}));

jest.mock("@/lib/format-utils", () => ({
  formatCurrency: (v: number) => String(v),
}));

jest.mock("@/lib/motion-variants", () => ({
  useMotionVariants: () => ({ staggerContainer: {}, fadeUp: {} }),
}));

jest.mock("@/hooks/api/entitlements", () => ({
  useEntitlements: () => ({ data: undefined }),
}));

const mockUsePageState = jest.fn();
jest.mock("@/hooks/api/use-page-state", () => ({
  usePageState: (...args: Parameters<typeof mockUsePageState>) => mockUsePageState(...args),
}));

const mockUseWinLossAnalysis = jest.fn();
jest.mock("@/hooks/api/crm", () => ({
  useWinLossAnalysis: () => mockUseWinLossAnalysis(),
}));

beforeEach(() => {
  jest.clearAllMocks();
  mockUseWinLossAnalysis.mockReturnValue({
    data: undefined,
    isLoading: false,
    isError: false,
    error: undefined,
    refetch: jest.fn(),
    access: undefined,
  });
  mockUsePageState.mockReturnValue({ kind: "loading" });
});

describe("AP-9: WinLossAnalysisPage must resolve through usePageState not a bare useCanState gate", () => {
  it("does not show access-denied state while the access snapshot is still loading — useCanState would return denied before the snapshot lands", () => {
    mockUsePageState.mockReturnValue({ kind: "loading" });

    render(<WinLossAnalysisPage />);

    expect(screen.queryByText("Access Restricted")).not.toBeInTheDocument();
  });

  it("shows access-denied view after the access snapshot confirms crm:deals:read is not held", () => {
    mockUsePageState.mockReturnValue({ kind: "denied", permission: "crm:deals:read" });

    render(<WinLossAnalysisPage />);

    expect(screen.getByText("Access Restricted")).toBeInTheDocument();
  });

  it("renders win/loss content when usePageState resolves to ready", () => {
    mockUsePageState.mockReturnValue({ kind: "ready" });
    mockUseWinLossAnalysis.mockReturnValue({
      data: {
        summary: { won: 2, wonValue: 1000, lost: 1, lostValue: 500, total: 3, winRate: 0.67 },
        lostByReason: [],
        wonByStage: [],
      },
      isLoading: false,
      isError: false,
      error: undefined,
      refetch: jest.fn(),
      access: undefined,
    });

    render(<WinLossAnalysisPage />);

    expect(screen.queryByText("Access Restricted")).not.toBeInTheDocument();
  });

  it("passes permission crm:deals:read to usePageState with the error object so 402 upgrade path is reachable", () => {
    const err = new ApiError("CRM module not enabled.", 402, "MODULE_NOT_ENABLED", {
      moduleKey: "crm",
      reason: "not-in-plan",
      upgradePath: "/settings/billing",
    });
    mockUseWinLossAnalysis.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
      error: err,
      refetch: jest.fn(),
      access: undefined,
    });
    mockUsePageState.mockReturnValue({ kind: "ready" });

    render(<WinLossAnalysisPage />);

    expect(mockUsePageState).toHaveBeenCalledWith(
      expect.objectContaining({ permission: "crm:deals:read", error: err }),
    );
  });
});
