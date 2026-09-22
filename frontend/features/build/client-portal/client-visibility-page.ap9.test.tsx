"use client";

import React from "react";
import { render, screen } from "@testing-library/react";
import { ClientVisibilityPage } from "./client-visibility-page";

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

const mockUseClientVisibility = jest.fn();
const mockUseUpdateTicketVisibility = jest.fn();
const mockUseUpdateMilestoneVisibility = jest.fn();

jest.mock("@/hooks/api/build/client-portal", () => ({
  useClientVisibility: (...args: [number]) => mockUseClientVisibility(...args),
  useUpdateTicketVisibility: (...args: [number]) =>
    mockUseUpdateTicketVisibility(...args),
  useUpdateMilestoneVisibility: (...args: [number]) =>
    mockUseUpdateMilestoneVisibility(...args),
}));

beforeEach(() => {
  jest.clearAllMocks();
  mockUseClientVisibility.mockReturnValue({
    data: undefined,
    isLoading: false,
    isError: false,
    error: undefined,
    refetch: jest.fn(),
  });
  mockUseUpdateTicketVisibility.mockReturnValue({ mutate: jest.fn(), isPending: false });
  mockUseUpdateMilestoneVisibility.mockReturnValue({ mutate: jest.fn(), isPending: false });
  mockUseCan.mockReturnValue(false);
  mockUsePageState.mockReturnValue({ kind: "loading" });
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
    mockUseClientVisibility.mockReturnValue({
      data: { tickets: [], milestones: [] },
      isLoading: false,
      isError: false,
      error: undefined,
      refetch: jest.fn(),
    });

    render(<ClientVisibilityPage projectId={1} />);

    expect(screen.queryByText("Access Restricted")).not.toBeInTheDocument();
  });

  it("passes permission build:clientvisibility:manage to usePageState so the correct gate is evaluated", () => {
    mockUsePageState.mockReturnValue({ kind: "ready" });
    mockUseClientVisibility.mockReturnValue({
      data: { tickets: [], milestones: [] },
      isLoading: false,
      isError: false,
      error: undefined,
      refetch: jest.fn(),
    });

    render(<ClientVisibilityPage projectId={1} />);

    expect(mockUsePageState).toHaveBeenCalledWith(
      expect.objectContaining({ permission: "build:clientvisibility:manage" }),
    );
  });
});
