import type { ReactNode } from "react";
import { render, screen } from "@testing-library/react";
import {
  QueryClient,
  QueryClientProvider,
  HydrationBoundary,
  dehydrate,
} from "@tanstack/react-query";
import { TooltipProvider } from "@/components/ui/tooltip";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import type { PayrollRunListItem } from "@/types/payroll/runs";

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn() }),
}));

jest.mock("@animateicons/react/lucide", () => ({
  PlusIcon: () => null,
  EllipsisIcon: () => null,
}));

jest.mock("@/hooks/common/use-animated-icon", () => ({
  useAnimatedIcon: () => ({ iconRef: { current: null }, hoverHandlers: {} }),
}));

jest.mock("@/hooks/api/access", () => ({
  useCan: jest.fn(() => true),
  useModuleEnabled: jest.fn(() => true),
}));

jest.mock("@/lib/api-client", () => ({
  apiClient: { get: jest.fn(), post: jest.fn() },
}));

jest.mock("@/features/payroll/shared/month-picker", () => ({
  MonthPicker: () => null,
}));

jest.mock("@/features/payroll/runs/run-status-badge", () => ({
  RunStatusBadge: ({ status }: { status: string }) => <span>{status}</span>,
}));

import { RunsPageContent } from "./runs-page-content";

const run: PayrollRunListItem = {
  id: 1,
  month: "2026-08",
  status: "DRAFT",
  grossTotal: null,
  netTotal: null,
  employeeCount: 5,
  exceptionCount: 0,
  createdAt: "2026-08-01T00:00:00.000Z",
};

const seededRuns = {
  data: [run],
  pagination: { limit: 20, nextCursor: null, hasMore: false },
};

function makeHydratedState() {
  const seed = new QueryClient();
  seed.setQueryData(queryKeys.payroll.runs({ cursor: undefined, limit: 20 }), seededRuns);
  return dehydrate(seed);
}

function Wrapper({ client, children }: { client: QueryClient; children: ReactNode }) {
  return (
    <TooltipProvider>
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    </TooltipProvider>
  );
}

describe("RunsPageContent server-prefetch seam", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders rows from the hydrated cache and makes no runs API call", () => {
    const state = makeHydratedState();
    const client = new QueryClient();

    render(
      <Wrapper client={client}>
        <HydrationBoundary state={state}>
          <RunsPageContent />
        </HydrationBoundary>
      </Wrapper>,
    );

    expect(screen.getByText("DRAFT")).toBeInTheDocument();
    expect(apiClient.get).not.toHaveBeenCalledWith(
      "/payroll/runs",
      expect.anything(),
      expect.anything(),
    );
  });

  it("fetches from the API when HydrationBoundary carries no cache", () => {
    (apiClient.get as jest.Mock).mockReturnValue(new Promise(() => {}));
    const client = new QueryClient();

    render(
      <Wrapper client={client}>
        <RunsPageContent />
      </Wrapper>,
    );

    expect(apiClient.get).toHaveBeenCalledWith(
      "/payroll/runs",
      expect.anything(),
      expect.anything(),
    );
  });
});
