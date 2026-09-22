"use client";

import React from "react";
import { render, screen } from "@testing-library/react";
import CampaignAttributionPage from "./page";

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

jest.mock("@/features/crm/campaigns/attribution-by-model", () => ({
  AttributionByModel: () => <div data-testid="attribution-by-model" />,
}));

const mockUsePageState = jest.fn();
jest.mock("@/hooks/api/use-page-state", () => ({
  usePageState: (...args: Parameters<typeof mockUsePageState>) => mockUsePageState(...args),
}));

beforeEach(() => {
  jest.clearAllMocks();
  mockUsePageState.mockReturnValue({ kind: "loading" });
});

describe("AP-9: CampaignAttributionPage — old isPending/!canView gate replaced with usePageState", () => {
  it("does not show access-denied state while the access snapshot is still loading — the old !canView check falsely denied users before rights loaded", () => {
    mockUsePageState.mockReturnValue({ kind: "loading" });

    render(<CampaignAttributionPage />);

    expect(screen.queryByText("Access Restricted")).not.toBeInTheDocument();
  });

  it("shows access-denied view when usePageState resolves the permission as denied after the snapshot lands", () => {
    mockUsePageState.mockReturnValue({ kind: "denied", permission: "crm:reports:view" });

    render(<CampaignAttributionPage />);

    expect(screen.getByText("Access Restricted")).toBeInTheDocument();
  });

  it("renders AttributionByModel when usePageState resolves to ready — component present so the positive is non-vacuous", () => {
    mockUsePageState.mockReturnValue({ kind: "ready" });

    render(<CampaignAttributionPage />);

    expect(screen.queryByText("Access Restricted")).not.toBeInTheDocument();
    expect(screen.getByTestId("attribution-by-model")).toBeInTheDocument();
  });

  it("passes crm:reports:view to usePageState so the correct backend permission key is evaluated", () => {
    mockUsePageState.mockReturnValue({ kind: "ready" });

    render(<CampaignAttributionPage />);

    expect(mockUsePageState).toHaveBeenCalledWith(
      expect.objectContaining({ permission: "crm:reports:view" }),
    );
  });
});
