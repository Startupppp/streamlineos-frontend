import { render, screen } from "@testing-library/react";

let useProjectTimeBudgetMock: jest.Mock;
let useAccessMock: jest.Mock;

const accessGranted = {
  data: { isOrgOwner: false, scopes: { "build:view": "all" }, modules: {} },
  isLoading: false,
};
const accessLoading = { data: undefined, isLoading: true };

jest.mock("@/hooks/api/access", () => ({
  useAccess: () => useAccessMock(),
  useCan: () => true,
}));

jest.mock("@/hooks/api/entitlements", () => ({
  useEntitlements: () => ({ data: undefined }),
}));

jest.mock("@/hooks/api/build/reports", () => ({
  useProjectTimeBudget: (...args: unknown[]) => useProjectTimeBudgetMock(...args),
}));

import { ProjectTimeBudgetSection } from "./project-time-budget-section";

const FULL_DATA = {
  loggedHours: 40,
  billableHours: 30,
  nonBillableHours: 10,
  costEntries: [
    { currency: "INR", costMinor: 20000, rateSources: ["RATE_CARD"] },
  ],
  includedStatus: ["APPROVED"],
  glExpenseDebitMinor: 20000,
  glFunctionalCurrency: "INR",
  estimateBudgetMinor: 500000,
  budgetCurrency: "INR",
  varianceMinor: 480000,
  reconciliationStatus: "matched" as const,
};

function settled<T>(data: T) {
  return { data, isLoading: false, isError: false, error: null };
}

beforeEach(() => {
  jest.clearAllMocks();
  useAccessMock = jest.fn().mockReturnValue(accessGranted);
  useProjectTimeBudgetMock = jest.fn().mockReturnValue(settled(FULL_DATA));
});

describe("ProjectTimeBudgetSection", () => {
  it("renders logged hours stat card when data is available", () => {
    render(<ProjectTimeBudgetSection projectId={10} />);
    expect(screen.getByText("Logged Hours")).toBeInTheDocument();
    expect(screen.getByText(/40\.0 hrs/)).toBeInTheDocument();
  });

  it("renders GL Expense stat card", () => {
    render(<ProjectTimeBudgetSection projectId={10} />);
    expect(screen.getByText("GL Expense")).toBeInTheDocument();
  });

  it("shows reconciliation status badge — positive check: matched", () => {
    render(<ProjectTimeBudgetSection projectId={10} />);
    expect(screen.getByText("Matched")).toBeInTheDocument();
  });

  it("shows unmatched badge when reconciliation is unmatched — negative check", () => {
    useProjectTimeBudgetMock.mockReturnValue(
      settled({ ...FULL_DATA, reconciliationStatus: "unmatched" as const }),
    );
    render(<ProjectTimeBudgetSection projectId={10} />);
    expect(screen.getByText("Unmatched")).toBeInTheDocument();
    expect(screen.queryByText("Matched")).toBeNull();
  });

  it("shows currency mismatch badge when currencies differ", () => {
    useProjectTimeBudgetMock.mockReturnValue(
      settled({
        ...FULL_DATA,
        reconciliationStatus: "currency_mismatch" as const,
        costEntries: [{ currency: "INR", costMinor: 10000, rateSources: ["RATE_CARD"] }],
        glFunctionalCurrency: "USD",
      }),
    );
    render(<ProjectTimeBudgetSection projectId={10} />);
    expect(screen.getByText("Currency mismatch")).toBeInTheDocument();
  });

  it("shows the loading state while access is resolving, not an access denial", () => {
    useAccessMock.mockReturnValue(accessLoading);
    useProjectTimeBudgetMock.mockReturnValue({ data: undefined, isLoading: true, isError: false, error: null });
    render(<ProjectTimeBudgetSection projectId={10} />);
    expect(screen.queryByText(/access restricted/i)).toBeNull();
  });

  it("renders the date-range selector", () => {
    render(<ProjectTimeBudgetSection projectId={10} />);
    expect(screen.getByRole("combobox", { name: /select date range/i })).toBeInTheDocument();
  });

  it("sums costEntries minor units for the timesheet cost card", () => {
    useProjectTimeBudgetMock.mockReturnValue(
      settled({
        ...FULL_DATA,
        glExpenseDebitMinor: 30000,
        costEntries: [
          { currency: "INR", costMinor: 15000, rateSources: ["RATE_CARD"] },
          { currency: "INR", costMinor: 5000, rateSources: ["PROJECT_MEMBER"] },
        ],
      }),
    );
    render(<ProjectTimeBudgetSection projectId={10} />);
    expect(screen.getByText(/200\.00/)).toBeInTheDocument();
  });
});
