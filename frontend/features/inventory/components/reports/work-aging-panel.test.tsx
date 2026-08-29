import { render, screen } from "@testing-library/react";
import { WorkAgingPanel } from "./work-aging-panel";
import type { WorkAging } from "@/hooks/api/inventory/operations-metrics";

/**
 * B10 — the zero that means something else.
 *
 * `scopedWarehouseIds: []` means the reader is assigned no warehouse, so every
 * count is zero for a reason that has nothing to do with an idle warehouse. The
 * endpoint returns an array rather than a boolean precisely so this can be
 * rendered differently, and the throughput report above it still conflates the
 * two — "your queue is clear" and "you cannot see any queue" look identical on a
 * card, and only one of them is somebody's problem to fix.
 *
 * Written because it was asked for out loud: the behaviour existed and nothing
 * asserted it, which on this branch has repeatedly meant it did not survive.
 */

jest.mock("next/navigation", () => ({ useRouter: () => ({ push: jest.fn() }) }));

const mockUseWorkAging = jest.fn();
jest.mock("@/hooks/api/inventory/operations-metrics", () => ({
  ...jest.requireActual("@/hooks/api/inventory/operations-metrics"),
  useWorkAging: (...args: unknown[]) => mockUseWorkAging(...args),
}));

function lane(open: number) {
  return {
    open,
    bands: [
      { label: "0-4h" as const, count: open, oldestHours: open > 0 ? 1 : null },
      { label: "4-24h" as const, count: 0, oldestHours: null },
      { label: "24-72h" as const, count: 0, oldestHours: null },
      { label: "72h+" as const, count: 0, oldestHours: null },
    ],
  };
}

function aging(scopedWarehouseIds: number[] | null, open = 0): WorkAging {
  return {
    asOf: "2026-08-29",
    scopedWarehouseIds,
    receipts: lane(open),
    putaway: lane(0),
    picking: lane(0),
    pickExceptions: lane(0),
    shipping: lane(0),
  };
}

function renderWith(data: WorkAging) {
  mockUseWorkAging.mockReturnValue({
    data,
    isLoading: false,
    isError: false,
    error: null,
    refetch: jest.fn(),
  });
  return render(<WorkAgingPanel />);
}

afterEach(() => jest.clearAllMocks());

describe("B10 work-aging panel", () => {
  it("says you are assigned no warehouse rather than showing an empty queue", () => {
    renderWith(aging([], 0));

    expect(screen.getByText(/not assigned to a warehouse/i)).toBeInTheDocument();
    // The decisive half: it must NOT read as an idle queue.
    expect(screen.queryByText(/Nothing open/i)).not.toBeInTheDocument();
  });

  it("says nothing is open when the reader is scoped and the queues really are clear", () => {
    renderWith(aging([3], 0));

    expect(screen.getByText(/Nothing open/i)).toBeInTheDocument();
    expect(screen.queryByText(/not assigned to a warehouse/i)).not.toBeInTheDocument();
  });

  it("treats a null scope as the whole estate rather than as no warehouses", () => {
    // `null` is the caller holding inventory:warehouses:scope-all. Collapsing it
    // with `[]` would tell an administrator they have no sites.
    renderWith(aging(null, 0));

    expect(screen.getByText(/All warehouses/i)).toBeInTheDocument();
    expect(screen.queryByText(/not assigned to a warehouse/i)).not.toBeInTheDocument();
  });

  it("renders the lanes and their open counts when there is work", () => {
    renderWith(aging([3], 5));

    expect(screen.getByText("Receipts")).toBeInTheDocument();
    expect(screen.getByText("5 open")).toBeInTheDocument();
  });
});
