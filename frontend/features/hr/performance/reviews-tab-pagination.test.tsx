import type { ReactNode } from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useHrPerformanceReviews } from "@/hooks/api/hr";
import type { PerformanceReviewListItem } from "@/types/hr";

jest.mock("@/hooks/api/access", () => ({
  useCan: jest.fn(() => true),
  useCanState: jest.fn(() => "granted"),
  useModuleEnabled: jest.fn(() => true),
  useAccess: jest.fn(() => ({
    data: { modules: {}, scopes: {}, isOrgOwner: true },
    isLoading: false,
  })),
}));

jest.mock("@/hooks/api/hr", () => ({
  useHrPerformanceReviews: jest.fn(),
  useReviewCycles: jest.fn(() => ({ data: [] })),
  useCreatePerformanceReview: jest.fn(() => ({ mutate: jest.fn(), isPending: false })),
  useUpdatePerformanceReview: jest.fn(() => ({ mutate: jest.fn(), isPending: false })),
  useDeletePerformanceReview: jest.fn(() => ({ mutate: jest.fn(), isPending: false })),
  useHrEmployees: jest.fn(() => ({ data: undefined })),
  unwrapEmployees: jest.fn(() => []),
}));

jest.mock("@/components/shared/hr-sheet", () => ({
  HrSheet: () => null,
}));

jest.mock("@/components/ui/confirm-sheet", () => ({
  ConfirmSheet: () => null,
}));

jest.mock("@/features/hr/performance/ai-generate-review-button", () => ({
  AIGenerateReviewButton: () => null,
}));

jest.mock("sonner", () => ({
  toast: { success: jest.fn(), error: jest.fn() },
}));

jest.mock("@/lib/date-constraints", () => ({
  clearEndIfInvalid: jest.fn((_start: string, end: string) => end),
  planningStartPickerProps: jest.fn(() => ({})),
  planningEndPickerProps: jest.fn(() => ({})),
}));

jest.mock("@/components/illustrations", () => ({
  EmptyLeaderboardIllustration: () => null,
}));

jest.mock("@/components/ui/tabs", () => {
  const { createContext, useContext, createElement } =
    jest.requireActual<typeof import("react")>("react");
  type OnChange = (value: string) => void;
  const Ctx = createContext<OnChange>(() => {});
  return {
    Tabs: ({ children, onValueChange }: { children: ReactNode; onValueChange?: OnChange }) =>
      createElement(Ctx.Provider, { value: onValueChange ?? (() => {}) }, children),
    TabsList: ({ children }: { children: ReactNode }) =>
      createElement("div", { role: "tablist" }, children),
    TabsTrigger: ({ children, value }: { children: ReactNode; value: string }) => {
      const onChange = useContext(Ctx);
      return createElement("button", { type: "button", role: "tab", onClick: () => onChange(value) }, children);
    },
  };
});

import { ReviewsTab } from "./reviews-tab";

const mockReview: PerformanceReviewListItem = {
  id: 1,
  orgId: "org-1",
  userId: "user-1",
  reviewerId: null,
  cycleId: null,
  periodStart: "2026-01-01",
  periodEnd: "2026-06-30",
  status: "DRAFT",
  overallRating: null,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
  user: null,
  reviewer: null,
  cycle: null,
};

function makePageResult(
  hasMore: boolean,
  nextCursor: string | null,
  items: PerformanceReviewListItem[] = [],
) {
  return {
    data: {
      data: items,
      pagination: { limit: 24, hasMore, nextCursor },
    },
    isLoading: false,
    isFetching: false,
  };
}

function Wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return (
    <TooltipProvider>
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    </TooltipProvider>
  );
}

describe("ReviewsTab cursor pagination", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("requests the nextCursor from the previous page when Next is clicked", () => {
    (useHrPerformanceReviews as jest.Mock).mockReturnValue(
      makePageResult(true, "cursor-page2", [mockReview]),
    );

    render(<ReviewsTab />, { wrapper: Wrapper });

    fireEvent.click(screen.getByRole("button", { name: /next/i }));

    const calls = (useHrPerformanceReviews as jest.Mock).mock.calls;
    const lastArg = calls[calls.length - 1][0] as { cursor?: string };
    expect(lastArg.cursor).toBe("cursor-page2");
  });

  it("resets cursor to the first page and sends the new status when the status tab changes", () => {
    (useHrPerformanceReviews as jest.Mock).mockReturnValue(
      makePageResult(true, "cursor-page2", [mockReview]),
    );

    render(<ReviewsTab />, { wrapper: Wrapper });

    fireEvent.click(screen.getByRole("button", { name: /next/i }));

    fireEvent.click(screen.getByRole("tab", { name: /draft/i }));

    const calls = (useHrPerformanceReviews as jest.Mock).mock.calls;
    const lastArg = calls[calls.length - 1][0] as { status?: string; cursor?: string };
    expect(lastArg.status).toBe("DRAFT");
    expect(lastArg.cursor).toBeUndefined();
  });

  it("disables the Next button when pagination.hasMore is false", () => {
    (useHrPerformanceReviews as jest.Mock).mockReturnValue(
      makePageResult(false, null),
    );

    render(<ReviewsTab />, { wrapper: Wrapper });

    expect(screen.getByRole("button", { name: /next/i })).toBeDisabled();
  });
});
