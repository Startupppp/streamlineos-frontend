import { screen } from "@testing-library/react";
import { TooltipProvider } from "@/components/ui/tooltip";
import { renderWithProviders } from "@/test-utils";
import { InventoryMetricsCard } from "./inventory-metrics-card";
import { ShelfLifeRulesCard } from "./shelf-life-rules-card";
import type { InventoryMetricsSnapshot, ShelfLifeRule } from "@/hooks/api/inventory/system-health";

/**
 * The two settings surfaces that had no caller at all.
 *
 * `GET /inventory/metrics` is where a dead outbox shows up: an inventory webhook
 * retried to exhaustion and dropped. Nothing read it, so that state existed only
 * in the database. And `GET/PUT /inventory/settings/shelf-life-rules` is a
 * stored setting FEFO allocation reads on every pick with nothing that could
 * write it — a dead switch, permanently whatever the database happened to hold.
 */

const mockUseCan = jest.fn(() => true);
jest.mock("@/hooks/api/access", () => ({ useCan: () => mockUseCan() }));

const mockUseInventoryMetrics = jest.fn();
const mockUseShelfLifeRules = jest.fn();
jest.mock("@/hooks/api/inventory/system-health", () => ({
  useInventoryMetrics: () => mockUseInventoryMetrics() as unknown,
  useRunExpirySweep: () => ({ mutate: jest.fn(), isPending: false }),
  useShelfLifeRules: () => mockUseShelfLifeRules() as unknown,
  usePutShelfLifeRule: () => ({ mutate: jest.fn(), isPending: false }),
}));

jest.mock("@/hooks/api/crm/clients", () => ({ useSimpleClientsList: () => ({ data: [] }) }));

function metrics(overrides: Partial<InventoryMetricsSnapshot> = {}): InventoryMetricsSnapshot {
  return {
    invariants: { negativeLevels: 0, orphanedReservations: 0 },
    ageing: { oldestActiveReservationHours: null, expiredUnreleasedReservations: 0 },
    outbox: { pending: 0, dead: 0, lagSeconds: null },
    imports: { failedJobs: 0 },
    counters: {},
    countersNote: "Counters reset on deploy.",
    ...overrides,
  };
}

function renderMetrics(state: Record<string, unknown>) {
  mockUseInventoryMetrics.mockReturnValue({
    data: undefined,
    isLoading: false,
    isError: false,
    error: null,
    refetch: jest.fn(),
    ...state,
  });
  return renderWithProviders(
    <TooltipProvider>
      <InventoryMetricsCard />
    </TooltipProvider>,
  );
}

function renderShelfLife(state: Record<string, unknown>) {
  mockUseShelfLifeRules.mockReturnValue({
    data: undefined,
    isLoading: false,
    isError: false,
    error: null,
    refetch: jest.fn(),
    ...state,
  });
  return renderWithProviders(
    <TooltipProvider>
      <ShelfLifeRulesCard />
    </TooltipProvider>,
  );
}

afterEach(() => jest.clearAllMocks());

describe("inventory system-health gauges", () => {
  it("reports dropped events rather than a quiet zero", () => {
    renderMetrics({ data: metrics({ outbox: { pending: 2, dead: 5, lagSeconds: 900 } }) });

    expect(screen.getByText("Events dropped")).toBeInTheDocument();
    expect(screen.getByText("5")).toBeInTheDocument();
    expect(screen.getByText(/900s behind/)).toBeInTheDocument();
  });

  it("says the gauges could not be read rather than rendering zeroes", () => {
    renderMetrics({ isError: true, error: new Error("503 Service Unavailable") });

    expect(screen.getByText(/Couldn't read the gauges/i)).toBeInTheDocument();
    expect(screen.queryByText("Events dropped")).not.toBeInTheDocument();
  });

  it("offers the expiry sweep, which had no trigger in the product at all", () => {
    renderMetrics({ data: metrics() });

    expect(screen.getByRole("button", { name: /Run expiry sweep/i })).toBeInTheDocument();
  });
});

describe("shelf-life floors", () => {
  it("says no floor is set, and that allocation will therefore take any lot", () => {
    renderShelfLife({ data: [] as ShelfLifeRule[] });

    expect(screen.getByText(/No floor is set/i)).toBeInTheDocument();
    expect(screen.getByText(/take any lot with life left on it/i)).toBeInTheDocument();
  });

  it("names the customer a floor belongs to rather than its id", () => {
    const rule: ShelfLifeRule = {
      id: 3,
      clientId: 91,
      clientName: "Ramky Infrastructure",
      minShelfLifeDays: 120,
      notes: "2026 supply contract",
      updatedAt: "2026-09-01T00:00:00.000Z",
    };
    renderShelfLife({ data: [rule] });

    expect(screen.getByText("Ramky Infrastructure")).toBeInTheDocument();
    expect(screen.getByText("120 d")).toBeInTheDocument();
    expect(screen.queryByText("91")).not.toBeInTheDocument();
  });

  it("calls the null-customer row the default instead of showing a blank", () => {
    const rule: ShelfLifeRule = {
      id: 1,
      clientId: null,
      clientName: null,
      minShelfLifeDays: 30,
      notes: null,
      updatedAt: "2026-09-01T00:00:00.000Z",
    };
    renderShelfLife({ data: [rule] });

    expect(screen.getByText("Every customer")).toBeInTheDocument();
  });

  it("says the floors could not be loaded rather than that none is set", () => {
    renderShelfLife({ isError: true, error: new Error("500 Internal Server Error") });

    expect(screen.getByText(/Couldn't load the shelf-life floors/i)).toBeInTheDocument();
    expect(screen.queryByText(/No floor is set/i)).not.toBeInTheDocument();
  });
});
