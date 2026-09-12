import { fireEvent, screen, waitFor } from "@testing-library/react";
import { renderWithProviders } from "@/test-utils";
import { InspectionDetailSheet } from "./inspection-detail-sheet";
import type { InspectionStatus } from "@/features/inventory/lib/inventory-status";

/**
 * A completed inspection result had no action at all.
 *
 * Every footer branch in this sheet is for a live inspection, so a COMPLETED or
 * CANCELLED one rendered an empty footer. `POST
 * /inventory/quality/inspections/:id/correct` was mounted, carried
 * `inventory:quality:inspect`, was fenced, and `useCorrectInspection` was
 * referenced by nothing.
 *
 * The status gate is the part worth pinning. The sheet's own `isTerminal`
 * includes PASSED; the service's `TERMINAL_STATUSES` does not, and answers a
 * PASSED inspection with a 409. Offering the control there would be a button
 * that only ever fails.
 */

const mockCorrectMutate = jest.fn();
let mockCorrectPending = false;
let mockStatus: InspectionStatus = "COMPLETED";
let mockCan: Record<string, boolean> = {};
let mockCorrects: { correctsInspectionId?: number | null; correctionReason?: string | null } = {};

jest.mock("@/hooks/api/access", () => ({ useCan: (key: string) => mockCan[key] ?? false }));

const idle = { mutate: jest.fn(), mutateAsync: jest.fn(), isPending: false };

jest.mock("@/hooks/api/inventory/quality", () => ({
  ...jest.requireActual("@/hooks/api/inventory/quality"),
  useQualityInspection: () => ({
    data: {
      id: 8,
      orgId: "o1",
      status: mockStatus,
      source: "GRN-1",
      lines: [],
      statusTimeline: [],
      createdAt: "2026-09-01T00:00:00.000Z",
      updatedAt: "2026-09-01T00:00:00.000Z",
      ...mockCorrects,
    },
    isLoading: false,
    error: null,
    refetch: jest.fn(),
  }),
  useStartInspection: () => idle,
  usePassInspection: () => idle,
  useFailInspection: () => idle,
  useDisposeInspection: () => idle,
  useCancelInspection: () => idle,
  useCorrectInspection: () => ({ mutate: mockCorrectMutate, isPending: mockCorrectPending }),
}));

const INSPECT = "inventory:quality:inspect";

beforeEach(() => {
  mockCorrectMutate.mockReset();
  mockCorrectPending = false;
  mockStatus = "COMPLETED";
  mockCan = { [INSPECT]: true, "inventory:quality:release": true };
  mockCorrects = {};
});

function renderSheet() {
  return renderWithProviders(
    <InspectionDetailSheet open onOpenChange={jest.fn()} inspectionId={8} />,
  );
}

describe("correcting a finished inspection", () => {
  it.each(["COMPLETED", "CANCELLED"] as const)("offers the control on %s", (status) => {
    mockStatus = status;
    renderSheet();
    expect(screen.getByRole("button", { name: /correct this result/i })).toBeInTheDocument();
  });

  it("withholds it on PASSED, which the service answers with a 409", () => {
    mockStatus = "PASSED";
    renderSheet();
    expect(
      screen.queryByRole("button", { name: /correct this result/i }),
    ).not.toBeInTheDocument();
  });

  it.each(["PENDING", "IN_PROGRESS", "FAILED", "DISPOSITION_REQUIRED"] as const)(
    "withholds it on %s, which is still editable in place",
    (status) => {
      mockStatus = status;
      renderSheet();
      expect(
        screen.queryByRole("button", { name: /correct this result/i }),
      ).not.toBeInTheDocument();
    },
  );

  it("withholds it from a viewer who cannot inspect", () => {
    mockCan = { [INSPECT]: false, "inventory:quality:release": true };
    renderSheet();
    expect(
      screen.queryByRole("button", { name: /correct this result/i }),
    ).not.toBeInTheDocument();
  });

  it("sends the reason, which is what lands on the new inspection", async () => {
    renderSheet();
    fireEvent.click(screen.getByRole("button", { name: /correct this result/i }));

    const reason = await screen.findByLabelText(/what was wrong with the result/i);
    fireEvent.change(reason, { target: { value: "Measured against the wrong plan version" } });
    fireEvent.click(screen.getByRole("button", { name: /raise correction/i }));

    await waitFor(() => expect(mockCorrectMutate).toHaveBeenCalledTimes(1));
    expect(mockCorrectMutate.mock.calls[0]?.[0]).toEqual({
      inspectionId: 8,
      reason: "Measured against the wrong plan version",
    });
  });

  it("refuses to raise a correction with no reason", async () => {
    renderSheet();
    fireEvent.click(screen.getByRole("button", { name: /correct this result/i }));
    await screen.findByLabelText(/what was wrong with the result/i);
    fireEvent.click(screen.getByRole("button", { name: /raise correction/i }));
    expect(mockCorrectMutate).not.toHaveBeenCalled();
  });

  it("says what a correction supersedes, so the two do not read as unrelated", () => {
    mockCorrects = { correctsInspectionId: 3, correctionReason: "Wrong plan version" };
    renderSheet();
    expect(screen.getByText(/Corrects inspection #3 — Wrong plan version/i)).toBeInTheDocument();
  });
});
