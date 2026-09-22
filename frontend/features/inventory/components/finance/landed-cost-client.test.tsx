import { screen } from "@testing-library/react";
import { TooltipProvider } from "@/components/ui/tooltip";
import { renderWithProviders } from "@/test-utils";
import { LandedCostClient } from "./landed-cost-client";
import { fromMinorUnits, toMinorUnits } from "./landed-cost-schema";
import type { LandedCostVoucherListItem } from "@/hooks/api/inventory/landed-cost";

/**
 * Landed cost, which existed only on the backend.
 *
 * Two things have to hold. The screen keeps a refused read, a failed request and
 * an empty list apart — a landed-cost list that reads "nothing recorded" when
 * the reader simply lacks `inventory:valuation:read` tells them margin is being
 * computed correctly when nobody knows. And money never passes through a float:
 * the backend takes integer minor units precisely because this number becomes
 * both a debit and a credit, so the conversion has to be exact.
 */

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn() }),
  usePathname: () => "/inventory/landed-cost",
  useSearchParams: () => new URLSearchParams(),
}));

const mockUseCan = jest.fn();
jest.mock("@/hooks/api/access", () => ({
  useCan: (key: string) => mockUseCan(key) as boolean,
  useCanState: (key: string) => ((mockUseCan(key) as boolean) ? "granted" : "denied"),
}));

const mockUseVouchers = jest.fn();
jest.mock("@/hooks/api/inventory/landed-cost", () => ({
  ...jest.requireActual("@/hooks/api/inventory/landed-cost"),
  useLandedCostVouchers: () => mockUseVouchers() as unknown,
  useLandedCostVoucher: () => ({ data: undefined, isLoading: false, isError: false }),
  useCreateLandedCostVoucher: () => ({ mutate: jest.fn(), isPending: false }),
  useApplyLandedCostVoucher: () => ({ mutate: jest.fn(), isPending: false }),
  useDeleteLandedCostVoucher: () => ({ mutate: jest.fn(), isPending: false }),
  useAddLandedCostCharge: () => ({ mutate: jest.fn(), isPending: false }),
}));

jest.mock("@/hooks/api/inventory/operations", () => ({
  useGoodsReceipts: () => ({ data: { items: [] }, isLoading: false }),
}));

function voucher(overrides: Partial<LandedCostVoucherListItem> = {}): LandedCostVoucherListItem {
  return {
    id: 5,
    voucherNumber: "LC-0005",
    grnId: 88,
    status: "DRAFT",
    allocationBasis: "VALUE",
    currency: "INR",
    chargeTotalCents: "125075",
    capitalisedValue: null,
    expensedValue: null,
    appliedAt: null,
    createdAt: "2026-09-01T00:00:00.000Z",
    ...overrides,
  };
}

function renderWith(
  query: Record<string, unknown>,
  permissions: Record<string, boolean> = {
    "inventory:valuation:read": true,
    "inventory:landed-cost:manage": true,
  },
) {
  mockUseCan.mockImplementation((key: string) => permissions[key] ?? false);
  mockUseVouchers.mockReturnValue({
    data: undefined,
    isLoading: false,
    isError: false,
    error: null,
    refetch: jest.fn(),
    ...query,
  });
  return renderWithProviders(
    <TooltipProvider>
      <LandedCostClient />
    </TooltipProvider>,
  );
}

afterEach(() => jest.clearAllMocks());

describe("landed cost", () => {
  it("says the read was refused rather than that no cost has been landed", () => {
    renderWith({ data: { items: [], total: 0, page: 1, totalPages: 0 } }, {
      "inventory:valuation:read": false,
    });

    expect(screen.getByText(/inventory:valuation:read/)).toBeInTheDocument();
    expect(screen.queryByText(/No landed cost has been recorded/i)).not.toBeInTheDocument();
  });

  it("says the request failed rather than that no cost has been landed", () => {
    renderWith({ isError: true, error: new Error("502 Bad Gateway") });

    expect(screen.getByText(/Couldn't load landed-cost vouchers/i)).toBeInTheDocument();
    expect(screen.queryByText(/No landed cost has been recorded/i)).not.toBeInTheDocument();
  });

  it("explains what an empty list costs the business", () => {
    renderWith({ data: { items: [], total: 0, page: 1, totalPages: 0 } });

    expect(screen.getByText(/No landed cost has been recorded/i)).toBeInTheDocument();
    expect(screen.getByText(/margin is being computed off the goods price alone/i)).toBeInTheDocument();
  });

  it("shows the voucher by its number and its charges as decimal money", () => {
    renderWith({ data: { items: [voucher()], total: 1, page: 1, totalPages: 1 } });

    expect(screen.getByText("LC-0005")).toBeInTheDocument();
    expect(screen.getByText("INR 1250.75")).toBeInTheDocument();
    // The receipt id and the voucher id are both on the row and neither is a
    // thing to show an operator.
    expect(screen.queryByText("88")).not.toBeInTheDocument();
  });

  it("offers no delete to a reader who cannot manage landed cost", () => {
    renderWith({ data: { items: [voucher()], total: 1, page: 1, totalPages: 1 } }, {
      "inventory:valuation:read": true,
      "inventory:landed-cost:manage": false,
    });

    expect(screen.getByText("LC-0005")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Delete/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Raise voucher/i })).not.toBeInTheDocument();
  });
});

describe("money never becomes a float", () => {
  it.each([
    ["0.01", 1],
    ["1250.75", 125075],
    ["8.1", 810],
    ["1000000.99", 100000099],
    // The classic: 0.1 + 0.2 in binary is not 0.3, and `Math.round(x * 100)` on
    // some of these is off by one. Parsing the digits sidesteps it entirely.
    ["19.99", 1999],
    ["0.29", 29],
    ["1.005", 100],
  ])("converts %s to %i minor units exactly", (amount, cents) => {
    expect(toMinorUnits(amount)).toBe(cents);
  });

  it.each([
    ["1", "0.01"],
    ["125075", "1250.75"],
    ["810", "8.10"],
    ["0", "0.00"],
  ])("renders %s minor units as %s", (cents, decimal) => {
    expect(fromMinorUnits(cents)).toBe(decimal);
  });
});
