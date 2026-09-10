import { fireEvent, screen, waitFor } from "@testing-library/react";
import { renderWithProviders, axeViolationIds } from "@/test-utils";
import { LandedCostDetailSheet } from "./landed-cost-detail-sheet";
import { LandedCostAddChargeDialog } from "./landed-cost-add-charge-dialog";

/**
 * A charge could be typed into a voucher only while raising it.
 *
 * `POST /inventory/landed-cost/:voucherId/charges` was mounted, permissioned and
 * fenced, and `useAddLandedCostCharge` was referenced by nothing but two tests.
 * Freight and duty are invoiced by different parties days apart, so the second
 * one arriving meant deleting the draft and retyping the first.
 *
 * The reachability assertion is the one that matters: the dialog passing its own
 * tests while no sheet mounted it is the exact shape of the original defect.
 */

const mockAddMutate = jest.fn();
let mockAddPending = false;
let mockVoucher: Record<string, unknown> | undefined;

jest.mock("@/hooks/api/access", () => ({ useCan: () => true }));

jest.mock("@/hooks/api/inventory/landed-cost", () => ({
  ...jest.requireActual("@/hooks/api/inventory/landed-cost"),
  useLandedCostVoucher: () => ({
    data: mockVoucher,
    isLoading: false,
    isError: false,
    error: null,
    refetch: jest.fn(),
  }),
  useApplyLandedCostVoucher: () => ({ mutate: jest.fn(), isPending: false }),
  useAddLandedCostCharge: () => ({ mutate: mockAddMutate, isPending: mockAddPending }),
}));

function voucher(status: "DRAFT" | "APPLIED") {
  return {
    id: 12,
    voucherNumber: "LC-0012",
    grnId: 3,
    status,
    allocationBasis: "VALUE",
    currency: "INR",
    chargeTotalCents: "125075",
    capitalisedValue: null,
    expensedValue: null,
    appliedAt: null,
    createdAt: "2026-09-01T00:00:00.000Z",
    notes: null,
    chargeTotal: "1250.75",
    charges: [
      {
        id: 1,
        chargeType: "FREIGHT",
        description: "Road freight",
        amountCents: "125075",
        vendorId: null,
        reference: null,
      },
    ],
    allocations: [],
  };
}

beforeEach(() => {
  mockAddMutate.mockReset();
  mockAddPending = false;
  mockVoucher = voucher("DRAFT");
});

describe("adding a charge to a raised voucher", () => {
  it("offers the control on the sheet a person actually opens", () => {
    renderWithProviders(
      <LandedCostDetailSheet voucherId={12} canManage onOpenChange={jest.fn()} />,
    );
    expect(screen.getByRole("button", { name: /add charge/i })).toBeInTheDocument();
  });

  it("withholds it once the voucher is applied, which the handler 409s", () => {
    mockVoucher = voucher("APPLIED");
    renderWithProviders(
      <LandedCostDetailSheet voucherId={12} canManage onOpenChange={jest.fn()} />,
    );
    expect(screen.queryByRole("button", { name: /add charge/i })).not.toBeInTheDocument();
  });

  it("withholds it from a viewer who cannot manage landed cost", () => {
    renderWithProviders(
      <LandedCostDetailSheet voucherId={12} canManage={false} onOpenChange={jest.fn()} />,
    );
    expect(screen.queryByRole("button", { name: /add charge/i })).not.toBeInTheDocument();
    // The voucher itself still reads — the read key is a different permission.
    expect(screen.getByText("Road freight")).toBeInTheDocument();
  });

  it("sends integer minor units, never a float", async () => {
    renderWithProviders(
      <LandedCostAddChargeDialog
        open
        onOpenChange={jest.fn()}
        voucherId={12}
        voucherNumber="LC-0012"
      />,
    );
    fireEvent.change(screen.getByLabelText(/description/i), {
      target: { value: "Customs duty" },
    });
    fireEvent.change(screen.getByLabelText(/amount/i), { target: { value: "1250.75" } });
    fireEvent.click(screen.getByRole("button", { name: /add charge/i }));

    await waitFor(() => expect(mockAddMutate).toHaveBeenCalledTimes(1));
    expect(mockAddMutate.mock.calls[0]?.[0]).toEqual({
      voucherId: 12,
      chargeType: "FREIGHT",
      description: "Customs duty",
      amountCents: 125075,
      reference: undefined,
    });
  });

  it("refuses a fractional amount the ledger could not balance", async () => {
    renderWithProviders(
      <LandedCostAddChargeDialog
        open
        onOpenChange={jest.fn()}
        voucherId={12}
        voucherNumber="LC-0012"
      />,
    );
    fireEvent.change(screen.getByLabelText(/description/i), { target: { value: "Duty" } });
    fireEvent.change(screen.getByLabelText(/amount/i), { target: { value: "12.345" } });
    fireEvent.click(screen.getByRole("button", { name: /add charge/i }));

    await waitFor(() =>
      expect(screen.getByText(/at most two decimal places/i)).toBeInTheDocument(),
    );
    expect(mockAddMutate).not.toHaveBeenCalled();
  });

  it("refuses an amount of zero", async () => {
    renderWithProviders(
      <LandedCostAddChargeDialog
        open
        onOpenChange={jest.fn()}
        voucherId={12}
        voucherNumber="LC-0012"
      />,
    );
    fireEvent.change(screen.getByLabelText(/description/i), { target: { value: "Duty" } });
    fireEvent.change(screen.getByLabelText(/amount/i), { target: { value: "0" } });
    fireEvent.click(screen.getByRole("button", { name: /add charge/i }));

    await waitFor(() => expect(screen.getByText(/more than zero/i)).toBeInTheDocument());
    expect(mockAddMutate).not.toHaveBeenCalled();
  });

  it("shows the in-flight add as a pending submit", () => {
    mockAddPending = true;
    renderWithProviders(
      <LandedCostAddChargeDialog
        open
        onOpenChange={jest.fn()}
        voucherId={12}
        voucherNumber="LC-0012"
      />,
    );
    expect(screen.getByRole("button", { name: /adding/i })).toBeDisabled();
  });

  it("has no accessibility violations", async () => {
    const { baseElement } = renderWithProviders(
      <LandedCostAddChargeDialog
        open
        onOpenChange={jest.fn()}
        voucherId={12}
        voucherNumber="LC-0012"
      />,
    );
    await expect(axeViolationIds(baseElement)).resolves.toEqual([]);
  });
});
