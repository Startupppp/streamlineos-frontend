"use client";

import React from "react";
import { render, screen } from "@testing-library/react";
import DealForecastPage from "./page";
import { ApiError } from "@/lib/api-envelope";

jest.mock("framer-motion", () => ({
  motion: {
    div: ({ children, ...rest }: React.HTMLAttributes<HTMLDivElement>) => <div {...rest}>{children}</div>,
  },
  useReducedMotion: () => false,
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
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
    if (resolution.kind === "error")
      return <div data-testid="error-state">{String(resolution)}</div>;
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

jest.mock("@/features/crm/deals/deal-forecast-summary", () => ({
  DealForecastSummary: () => <div data-testid="forecast-summary" />,
}));

jest.mock("@/features/crm/deals/deal-forecast-chart", () => ({
  DealForecastChart: () => <div data-testid="forecast-chart" />,
}));

jest.mock("@/features/crm/deals/deal-close-date-list", () => ({
  DealCloseDateList: () => <div data-testid="close-date-list" />,
}));

jest.mock("@/lib/motion-variants", () => ({
  useMotionVariants: () => ({ staggerContainer: {}, fadeUp: {} }),
}));

jest.mock("@/lib/get-error-message", () => ({
  getErrorMessage: (e: unknown) => String(e),
}));

jest.mock("@/hooks/api/entitlements", () => ({
  useEntitlements: () => ({ data: undefined }),
}));

const mockUsePageState = jest.fn();
jest.mock("@/hooks/api/use-page-state", () => ({
  usePageState: (...args: Parameters<typeof mockUsePageState>) => mockUsePageState(...args),
}));

const mockUseDeals = jest.fn();
const mockUseForecastSnapshots = jest.fn();
const mockUseCaptureForecastSnapshot = jest.fn();
jest.mock("@/hooks/api/crm", () => ({
  useDeals: () => mockUseDeals(),
  useForecastSnapshots: () => mockUseForecastSnapshots(),
  useCaptureForecastSnapshot: () => mockUseCaptureForecastSnapshot(),
}));

beforeEach(() => {
  jest.clearAllMocks();
  mockUseDeals.mockReturnValue({
    data: [],
    isLoading: false,
    isError: false,
    error: undefined,
    refetch: jest.fn(),
    access: undefined,
  });
  mockUseForecastSnapshots.mockReturnValue({ data: [] });
  mockUseCaptureForecastSnapshot.mockReturnValue({ mutate: jest.fn(), isPending: false });
  mockUsePageState.mockReturnValue({ kind: "loading" });
});

describe("AP-9: DealForecastPage must resolve through usePageState not a bare useCanState gate", () => {
  it("does not show access-denied state while the access snapshot is still loading — the old useCanState guard would wrongly deny permitted users in this window", () => {
    mockUsePageState.mockReturnValue({ kind: "loading" });

    render(<DealForecastPage />);

    expect(screen.queryByText("Access Restricted")).not.toBeInTheDocument();
  });

  it("shows access-denied view after usePageState resolves crm:deals:forecast as denied", () => {
    mockUsePageState.mockReturnValue({ kind: "denied", permission: "crm:deals:forecast" });

    render(<DealForecastPage />);

    expect(screen.getByText("Access Restricted")).toBeInTheDocument();
  });

  it("renders forecast content when usePageState resolves to ready", () => {
    mockUsePageState.mockReturnValue({ kind: "ready" });

    render(<DealForecastPage />);

    expect(screen.queryByText("Access Restricted")).not.toBeInTheDocument();
  });

  it("passes permission crm:deals:forecast to usePageState with the error object so 402 is reachable", () => {
    const err = new ApiError("CRM not in plan.", 402, "MODULE_NOT_ENABLED", {
      moduleKey: "crm",
      reason: "not-in-plan",
      upgradePath: "/settings/billing",
    });
    mockUseDeals.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
      error: err,
      refetch: jest.fn(),
      access: undefined,
    });
    mockUsePageState.mockReturnValue({ kind: "ready" });

    render(<DealForecastPage />);

    expect(mockUsePageState).toHaveBeenCalledWith(
      expect.objectContaining({ permission: "crm:deals:forecast", error: err }),
    );
  });
});
