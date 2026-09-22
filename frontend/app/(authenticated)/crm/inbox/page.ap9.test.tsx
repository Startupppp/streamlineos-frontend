"use client";

import React from "react";
import { render, screen } from "@testing-library/react";
import CrmInboxPage from "./page";

jest.mock("next/dynamic", () => (fn: () => Promise<unknown>) => {
  fn();
  const MockDynamic = () => <div data-testid="inbox-section-card" />;
  MockDynamic.displayName = "MockDynamic";
  return MockDynamic;
});

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
    return <div>{resolution.kind}</div>;
  },
}));

jest.mock("@/components/ui/empty-state", () => ({
  EmptyState: ({ title }: { title: string }) => <div data-testid="empty-state">{title}</div>,
}));

jest.mock("@/components/ui/stat-card", () => ({
  StatCardGridSkeleton: () => <div data-testid="stat-card-skeleton" />,
}));

jest.mock("@/components/ui/skeleton", () => ({
  Skeleton: () => <div data-testid="skeleton" />,
}));

jest.mock("@/components/illustrations", () => ({
  EmptyInboxIllustration: () => null,
}));

jest.mock("@/components/ui/content-fill-panel", () => ({
  CONTENT_FILL_PANEL: "content-fill-panel",
}));

jest.mock("@/components/shared/error-state", () => ({
  ErrorState: ({ title }: { title: string }) => <div data-testid="error-state">{title}</div>,
}));

jest.mock("@/features/crm/inbox/inbox-stat-cards", () => ({
  InboxStatCards: () => null,
}));

jest.mock("@/features/crm/inbox/ai-actions-section", () => ({
  AiActionsSection: () => null,
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

const mockUseInbox = jest.fn();
const mockUseInboxCounts = jest.fn();
const mockUseSnoozeCrmTask = jest.fn();
const mockUseCompleteCrmTask = jest.fn();
jest.mock("@/hooks/api/crm/inbox", () => ({
  useInbox: () => mockUseInbox(),
  useInboxCounts: () => mockUseInboxCounts(),
  useSnoozeCrmTask: () => mockUseSnoozeCrmTask(),
  useCompleteCrmTask: () => mockUseCompleteCrmTask(),
}));

beforeEach(() => {
  jest.clearAllMocks();
  mockUseInbox.mockReturnValue({
    data: undefined,
    isLoading: false,
    isError: false,
    refetch: jest.fn(),
    access: undefined,
  });
  mockUseInboxCounts.mockReturnValue({ data: undefined, isLoading: false });
  mockUseSnoozeCrmTask.mockReturnValue({ mutate: jest.fn(), isPending: false });
  mockUseCompleteCrmTask.mockReturnValue({ mutate: jest.fn(), isPending: false });
  mockUsePageState.mockReturnValue({ kind: "loading" });
});

describe("AP-9: CrmInboxPage must resolve through usePageState not a bare useCanState gate", () => {
  it("does not show access-denied state while the access snapshot is loading — the old useCanState guard wrongly denied permitted users in this window", () => {
    mockUsePageState.mockReturnValue({ kind: "loading" });

    render(<CrmInboxPage />);

    expect(screen.queryByText("Access Restricted")).not.toBeInTheDocument();
  });

  it("shows access-denied view after usePageState resolves crm:leads:view as denied", () => {
    mockUsePageState.mockReturnValue({ kind: "denied", permission: "crm:leads:view" });

    render(<CrmInboxPage />);

    expect(screen.getByText("Access Restricted")).toBeInTheDocument();
  });

  it("renders inbox content (Suspense boundary) when usePageState resolves to ready", () => {
    mockUsePageState.mockReturnValue({ kind: "ready" });

    render(<CrmInboxPage />);

    expect(screen.queryByText("Access Restricted")).not.toBeInTheDocument();
  });

  it("passes permission crm:leads:view with isLoading false and isError false to usePageState — the outer component has no query hooks", () => {
    mockUsePageState.mockReturnValue({ kind: "ready" });

    render(<CrmInboxPage />);

    expect(mockUsePageState).toHaveBeenCalledWith(
      expect.objectContaining({
        permission: "crm:leads:view",
        isLoading: false,
        isError: false,
      }),
    );
  });
});
