import { screen } from "@testing-library/react";
import { TooltipProvider } from "@/components/ui/tooltip";
import { renderWithProviders } from "@/test-utils";
import { GlReconciliationClient } from "./gl-reconciliation-client";
import type { GlReconReport, GlReconRow } from "@/hooks/api/inventory/gl-reconciliation";

/**
 * The states a reconciliation report must not blur into one another.
 *
 * "Accounting is not installed" and "every movement failed to post" produce the
 * same page of zeroes unless the report says which it is — which is why the
 * backend returns the sentence rather than implying it. A refused read produces
 * the same empty table as a clean month. And a filtered-out result is not the
 * same as a month in which nothing moved.
 */

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn() }),
  usePathname: () => "/inventory/reconciliation/gl",
  useSearchParams: () => new URLSearchParams(),
}));

const mockUseCan = jest.fn();
jest.mock("@/hooks/api/access", () => ({
  useCan: (key: string) => mockUseCan(key) as boolean,
}));

const mockUseGlReconciliation = jest.fn();
jest.mock("@/hooks/api/inventory/gl-reconciliation", () => ({
  ...jest.requireActual("@/hooks/api/inventory/gl-reconciliation"),
  useGlReconciliation: (...args: unknown[]) => mockUseGlReconciliation(...args) as unknown,
  useGlReconPeriods: () => ({ data: { installed: true, items: [] } }),
}));

jest.mock("@/hooks/api/inventory/warehouses", () => ({ useWarehouses: () => ({ data: { items: [], total: 0, page: 1, totalPages: 0 } }) }));
jest.mock("@/hooks/api/org-display", () => ({
  useOrgDisplay: () => ({ currency: "INR", locale: "en-IN" }),
}));

function reconRow(overrides: Partial<GlReconRow> = {}): GlReconRow {
  return {
    sourceType: "inv_grn",
    sourceId: "1201",
    label: "Goods receipt GRN-1201",
    sourceEvent: "post",
    postedOn: "2026-09-02",
    movementValue: "84000.0000",
    netQuantity: "120.0000",
    movementCount: 3,
    hasCost: true,
    accountCodes: ["1300", "2000"],
    missingAccountCodes: [],
    journalEntryId: null,
    journalEntryNumber: null,
    journalEntryDate: null,
    journalStatus: null,
    journalValue: null,
    status: "UNMATCHED",
    ...overrides,
  };
}

function report(overrides: Partial<GlReconReport> = {}): GlReconReport {
  return {
    generatedAt: "2026-09-09T10:00:00.000Z",
    window: { fromDate: "2026-09-01", toDate: "2026-09-30", period: null },
    accounting: { journalsInstalled: true, note: null },
    rules: [],
    summary: {
      groups: 1,
      matched: 0,
      valueMismatch: 0,
      missingCoa: 0,
      unmatched: 1,
      notInstalled: 0,
      movementValue: "84000",
      journalValue: "0",
      unreconciledValue: "84000",
    },
    unpostedByDesign: [],
    orphanJournals: [],
    items: [reconRow()],
    total: 1,
    page: 1,
    totalPages: 1,
    ...overrides,
  };
}

function renderWith(
  query: Partial<{
    data: GlReconReport | undefined;
    isLoading: boolean;
    isError: boolean;
    error: Error | null;
  }>,
  canRead = true,
) {
  mockUseCan.mockImplementation((key: string) => (key === "inventory:reports:read" ? canRead : false));
  mockUseGlReconciliation.mockReturnValue({
    data: undefined,
    isLoading: false,
    isError: false,
    error: null,
    refetch: jest.fn(),
    ...query,
  });
  return renderWithProviders(
    <TooltipProvider>
      <GlReconciliationClient />
    </TooltipProvider>,
  );
}

afterEach(() => jest.clearAllMocks());

describe("GL reconciliation", () => {
  it("says the read was refused rather than showing an empty report", () => {
    renderWith({ data: report({ items: [], total: 0 }) }, false);

    expect(screen.getByText(/inventory:reports:read/)).toBeInTheDocument();
    expect(screen.queryByText(/Nothing moved in this window/i)).not.toBeInTheDocument();
  });

  it("says the request failed rather than showing an empty report", () => {
    renderWith({ isError: true, error: new Error("500 Internal Server Error") });

    expect(screen.getByText(/Couldn't run the GL reconciliation/i)).toBeInTheDocument();
    expect(screen.queryByText(/Nothing moved in this window/i)).not.toBeInTheDocument();
  });

  it("shows a movement with no journal entry as unposted, not as matched", () => {
    renderWith({ data: report() });

    expect(screen.getByText("No journal entry")).toBeInTheDocument();
    expect(screen.getByText("Goods receipt GRN-1201")).toBeInTheDocument();
    expect(screen.queryByText("Matched")).not.toBeInTheDocument();
  });

  it("says accounting is not installed instead of showing an alarming gap", () => {
    renderWith({
      data: report({
        accounting: {
          journalsInstalled: false,
          note: "The accounting module is not installed in this workspace, so no inventory movement has produced a journal entry.",
        },
        items: [],
        total: 0,
      }),
    });

    expect(screen.getByText(/accounting module is not installed/i)).toBeInTheDocument();
  });

  it("names the movements a rule deliberately never posts", () => {
    renderWith({
      data: report({
        unpostedByDesign: [
          { sourceType: "inv_transfer", movementCount: 4, movementValue: "12000" },
        ],
      }),
    });

    expect(screen.getByText(/Never posted, by design/i)).toBeInTheDocument();
    expect(screen.getByText(/inv_transfer/)).toBeInTheDocument();
  });
});
