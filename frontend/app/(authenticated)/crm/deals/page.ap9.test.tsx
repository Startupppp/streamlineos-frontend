"use client";

import React from "react";
import { render, screen } from "@testing-library/react";
import DealsPage from "./page";

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn() }),
  usePathname: () => "/crm/deals",
  useSearchParams: () => new URLSearchParams(),
}));

jest.mock("sonner", () => ({
  toast: { success: jest.fn(), error: jest.fn() },
}));

jest.mock("framer-motion", () => ({
  motion: {
    div: ({ children, ...props }: React.HTMLAttributes<HTMLDivElement>) => <div {...props}>{children}</div>,
  },
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
    return <div>{resolution.kind}</div>;
  },
}));

jest.mock("@/features/crm/deals/deals-loading-skeleton", () => ({
  DealsLoadingSkeleton: () => <div data-testid="deals-loading-skeleton" />,
}));

jest.mock("@/features/crm/deals/deal-list", () => ({
  DealList: () => <div data-testid="deal-list" />,
}));

jest.mock("@/features/crm/deals/deals-filter-bar", () => ({
  DealsFilterBar: () => null,
}));

jest.mock("@/features/crm/deals/deals-stats-bar", () => ({
  DealsStatsBar: () => null,
}));

jest.mock("@/features/crm/deals/deal-forecast-widget", () => ({
  DealForecastWidget: () => null,
}));

jest.mock("@/features/crm/deals/deal-side-panel", () => ({
  DealSidePanel: () => null,
}));

jest.mock("@/features/crm/deals/deals-create-sheet", () => ({
  DealsCreateSheet: () => null,
}));

jest.mock("@/features/crm/deals/kanban-column", () => ({
  KanbanColumn: () => null,
}));

jest.mock("@/features/crm/deals/win-loss-dialog", () => ({
  WinLossDialog: () => null,
}));

jest.mock("@/features/crm/deals/stage-skip-dialog", () => ({
  StageSkipDialog: () => null,
}));

jest.mock("@/features/crm/deals/use-deals-export", () => ({
  useDealsExport: () => jest.fn(),
}));

jest.mock("@/features/crm/import/import-link-button", () => ({
  ImportLinkButton: () => null,
}));

jest.mock("@/components/celebration/confetti-overlay", () => ({
  ConfettiOverlay: () => null,
}));

jest.mock("@/components/ui/scroll-area", () => ({
  ScrollArea: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

jest.mock("@/components/ui/confirm-dialog", () => ({
  ConfirmDialog: () => null,
}));

jest.mock("@/components/renderer/density-toggle", () => ({
  useDensity: () => ["comfortable", jest.fn()],
}));

jest.mock("@/lib/motion-variants", () => ({
  useMotionVariants: () => ({ staggerContainer: {}, fadeUp: {} }),
}));

jest.mock("@hello-pangea/dnd", () => ({
  DragDropContext: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  Droppable: ({ children }: { children: (provided: unknown) => React.ReactNode }) =>
    children({ droppableProps: {}, innerRef: jest.fn(), placeholder: null }),
  Draggable: ({ children }: { children: (provided: unknown) => React.ReactNode }) =>
    children({ draggableProps: {}, dragHandleProps: {}, innerRef: jest.fn() }),
}));

jest.mock("@/hooks/api/crm", () => ({
  useDeals: jest.fn(),
  useUpdateDealStage: jest.fn(() => ({ mutate: jest.fn(), isPending: false })),
  useDeleteDeal: jest.fn(() => ({ mutate: jest.fn(), isPending: false })),
  useCrmPipelines: jest.fn(() => ({ data: [] })),
}));

jest.mock("@/hooks/api/hr", () => ({
  useHrEmployees: jest.fn(() => ({ data: [] })),
}));

jest.mock("@/hooks/common/use-debounce", () => ({
  useDebouncedValue: (v: string) => v,
}));

jest.mock("@/hooks/common/use-query-param-open", () => ({
  useQueryParamOpen: () => ({ open: false, onOpenChange: jest.fn(), setOpen: jest.fn() }),
}));

const mockUseCan = jest.fn<boolean, [string]>(() => false);
jest.mock("@/hooks/api/access", () => ({
  useCan: (permission: string) => mockUseCan(permission),
}));

const mockUsePageState = jest.fn();
jest.mock("@/hooks/api/use-page-state", () => ({
  usePageState: (...args: Parameters<typeof mockUsePageState>) => mockUsePageState(...args),
}));

import { useDeals } from "@/hooks/api/crm";
const mockUseDeals = useDeals as jest.Mock;

beforeEach(() => {
  jest.clearAllMocks();
  mockUseDeals.mockReturnValue({
    data: undefined,
    isLoading: false,
    isError: false,
    error: undefined,
    refetch: jest.fn(),
  });
  mockUseCan.mockReturnValue(false);
  mockUsePageState.mockReturnValue({ kind: "loading" });
});

describe("AP-9: DealsPage must resolve through usePageState for both table and kanban views", () => {
  it("does not show access-denied state while the access snapshot is still loading — useCan returns false during this window so a page gated on it wrongly denies permitted users", () => {
    mockUsePageState.mockReturnValue({ kind: "loading" });

    render(<DealsPage />);

    expect(screen.queryByText("Access Restricted")).not.toBeInTheDocument();
  });

  it("shows access-denied view when usePageState resolves the permission as denied after the snapshot lands", () => {
    mockUsePageState.mockReturnValue({ kind: "denied", permission: "crm:deals:read" });

    render(<DealsPage />);

    expect(screen.getByText("Access Restricted")).toBeInTheDocument();
  });

  it("renders the deals page when usePageState resolves to ready", () => {
    mockUseCan.mockReturnValue(true);
    mockUsePageState.mockReturnValue({ kind: "ready" });
    mockUseDeals.mockReturnValue({
      data: [],
      isLoading: false,
      isError: false,
      error: undefined,
      refetch: jest.fn(),
    });

    render(<DealsPage />);

    expect(screen.queryByText("Access Restricted")).not.toBeInTheDocument();
  });

  it("passes permission crm:deals:read to usePageState so the correct gate is evaluated", () => {
    mockUsePageState.mockReturnValue({ kind: "ready" });
    mockUseDeals.mockReturnValue({
      data: [],
      isLoading: false,
      isError: false,
      error: undefined,
      refetch: jest.fn(),
    });

    render(<DealsPage />);

    expect(mockUsePageState).toHaveBeenCalledWith(
      expect.objectContaining({ permission: "crm:deals:read" }),
    );
  });
});
