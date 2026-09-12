import { fireEvent, screen, waitFor } from "@testing-library/react";
import { renderWithProviders, axeViolationIds } from "@/test-utils";
import { GrnDetailSheet } from "./grn-detail-sheet";
import { GrnEditDraftDialog } from "./grn-edit-draft-dialog";

/**
 * A receipt's date could be wrong from the moment it was raised.
 *
 * `receive-goods-sheet.tsx` stamps `receivedDate: getTodayString()` and offers
 * no field for it, so a Friday-evening pallet booked in on Monday carries
 * Monday's date. `PATCH /inventory/goods-receipts/:grnId` accepted the
 * correction the whole time and `useUpdateGrnDraft` was called by nothing.
 */

const mockUpdateMutate = jest.fn();
let mockUpdatePending = false;
let mockStatus: "DRAFT" | "COUNTING" | "QUALITY_REVIEW" | "POSTED" | "CANCELLED" = "DRAFT";
let mockCan: Record<string, boolean> = {};

jest.mock("@/hooks/api/access", () => ({
  useCan: (key: string) => mockCan[key] ?? false,
  useAccess: () => ({ data: { isOrgOwner: false }, refetch: () => Promise.resolve({ data: undefined }) }),
}));

jest.mock("@/hooks/api/inventory/operations", () => ({
  ...jest.requireActual("@/hooks/api/inventory/operations"),
  useGoodsReceipt: () => ({
    data: {
      id: 5,
      grnNumber: "GRN-0005",
      poId: 2,
      status: mockStatus,
      receivedDate: "2026-09-07",
      locationId: null,
      notes: "Left on dock 3",
      postedAt: null,
      createdBy: "u1",
      createdAt: "2026-09-07T00:00:00.000Z",
      purchaseOrder: null,
      creator: null,
      poster: null,
      lines: [],
    },
    isLoading: false,
    error: null,
    refetch: jest.fn(),
  }),
  useUpdateGrnDraft: () => ({ mutate: mockUpdateMutate, isPending: mockUpdatePending }),
}));

const READ = "inventory:purchase-orders:read";
const RECEIVE = "inventory:purchase-orders:receive";

beforeEach(() => {
  mockUpdateMutate.mockReset();
  mockUpdatePending = false;
  mockStatus = "DRAFT";
  mockCan = { [READ]: true, [RECEIVE]: true };
});

function renderSheet() {
  return renderWithProviders(
    <GrnDetailSheet grnId={5} open onOpenChange={jest.fn()} />,
  );
}

describe("correcting a receipt that has not posted", () => {
  it.each(["DRAFT", "COUNTING"] as const)("offers the control on %s", (status) => {
    mockStatus = status;
    renderSheet();
    expect(screen.getByRole("button", { name: /correct date or notes/i })).toBeInTheDocument();
  });

  it.each(["QUALITY_REVIEW", "POSTED", "CANCELLED"] as const)(
    "withholds it on %s, which the service refuses",
    (status) => {
      mockStatus = status;
      renderSheet();
      expect(
        screen.queryByRole("button", { name: /correct date or notes/i }),
      ).not.toBeInTheDocument();
    },
  );

  it("withholds it from a viewer who may read but not receive", () => {
    mockCan = { [READ]: true, [RECEIVE]: false };
    renderSheet();
    expect(
      screen.queryByRole("button", { name: /correct date or notes/i }),
    ).not.toBeInTheDocument();
    expect(screen.getByText("GRN GRN-0005")).toBeInTheDocument();
  });

  it("sends the corrected notes with the receipt's own id", async () => {
    renderWithProviders(
      <GrnEditDraftDialog
        open
        onOpenChange={jest.fn()}
        grnId={5}
        grnNumber="GRN-0005"
        receivedDate="2026-09-07"
        notes="Left on dock 3"
      />,
    );
    fireEvent.change(screen.getByLabelText(/notes/i), {
      target: { value: "Pallet damaged in transit" },
    });
    fireEvent.click(screen.getByRole("button", { name: /save changes/i }));

    await waitFor(() => expect(mockUpdateMutate).toHaveBeenCalledTimes(1));
    expect(mockUpdateMutate.mock.calls[0]?.[0]).toEqual({
      grnId: 5,
      receivedDate: "2026-09-07",
      notes: "Pallet damaged in transit",
    });
  });

  it("seeds the form from the receipt rather than from today", () => {
    renderWithProviders(
      <GrnEditDraftDialog
        open
        onOpenChange={jest.fn()}
        grnId={5}
        grnNumber="GRN-0005"
        receivedDate="2026-09-07"
        notes={null}
      />,
    );
    expect(screen.getByLabelText(/notes/i)).toHaveValue("");
    expect(screen.getByText(/07 Sep 2026/i)).toBeInTheDocument();
  });

  it("shows the in-flight save as a pending submit", () => {
    mockUpdatePending = true;
    renderWithProviders(
      <GrnEditDraftDialog
        open
        onOpenChange={jest.fn()}
        grnId={5}
        grnNumber="GRN-0005"
        receivedDate="2026-09-07"
        notes={null}
      />,
    );
    expect(screen.getByRole("button", { name: /saving/i })).toBeDisabled();
  });

  it("has no accessibility violations", async () => {
    const { baseElement } = renderWithProviders(
      <GrnEditDraftDialog
        open
        onOpenChange={jest.fn()}
        grnId={5}
        grnNumber="GRN-0005"
        receivedDate="2026-09-07"
        notes={null}
      />,
    );
    await expect(axeViolationIds(baseElement)).resolves.toEqual([]);
  });
});
