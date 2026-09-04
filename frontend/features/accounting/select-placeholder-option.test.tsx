/**
 * Three accounting surfaces rendered `<SelectItem value="">` as their "no
 * selection" option. Radix throws from SelectItem's render body on an empty
 * value, and `SelectContent` mounts its children into a detached fragment even
 * while the menu is CLOSED — so the throw happens on mount, not on open. Every
 * one of these surfaces was a white screen:
 *
 *   features/accounting/planning/forecast-page.tsx            (/accounting/forecast)
 *   features/accounting/banking/components/bank-import-step2.tsx (import wizard, step 2)
 *   features/accounting/banking/components/add-bank-account-sheet.tsx
 *
 * These tests mount each surface against the REAL Radix Select — no
 * `@/components/ui/select` mock — so a reintroduced empty value fails here.
 */
import { render, screen } from "@testing-library/react";
import { TooltipProvider } from "@/components/ui/tooltip";

jest.mock("sonner", () => ({ toast: { success: jest.fn(), error: jest.fn() } }));

jest.mock("@/hooks/api/access", () => ({
  useCan: () => true,
}));

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn(), refresh: jest.fn() }),
  usePathname: () => "/accounting",
  useSearchParams: () => new URLSearchParams(),
}));

const idleMutation = { mutate: jest.fn(), mutateAsync: jest.fn(), isPending: false };

jest.mock("@/hooks/api/accounting/planning", () => ({
  useForecast: () => ({ data: undefined, isLoading: false, error: null, refetch: jest.fn() }),
  useForecastCompare: () => ({ data: undefined, isLoading: false, error: null }),
  useScenarios: () => ({ data: { items: [{ id: 7, name: "Base case" }] }, isLoading: false, error: null }),
  useSeedDefaultScenarios: () => idleMutation,
}));

jest.mock("@/hooks/api/accounting/banking", () => ({
  useCreateBankAccount: () => idleMutation,
}));

jest.mock("@/hooks/api/accounting", () => ({
  useAllAccounts: () => ({
    data: { data: [{ id: 1, accountCode: "1000", accountName: "Cash", accountType: "ASSET" }] },
    isLoading: false,
    isError: false,
    error: null,
    hasMore: false,
    refetch: jest.fn(),
  }),
}));

import { ForecastPage } from "./planning/forecast-page";
import { BankImportStep2 } from "./banking/components/bank-import-step2";
import { AddBankAccountSheet } from "./banking/components/add-bank-account-sheet";

function renderWithTooltip(ui: React.ReactElement) {
  return render(ui, { wrapper: TooltipProvider });
}

const parsedCsv = {
  headers: ["Date", "Description", "Amount"],
  rows: [["01/01/2026", "Opening", "100.00"]],
  rowCount: 1,
};

const emptyMapping = {
  date: "",
  description: "",
  amountMode: "single" as const,
  amount: "",
  debit: "",
  credit: "",
  reference: "",
  counterparty: "",
};

describe("accounting Select placeholder options", () => {
  it("mounts the cash-flow forecast page without a Radix empty-value throw", () => {
    renderWithTooltip(<ForecastPage />);
    expect(screen.getByRole("button", { name: /compare scenarios/i })).toBeInTheDocument();
  });

  it("mounts the bank-import column mapping step without a Radix empty-value throw", () => {
    renderWithTooltip(
      <BankImportStep2
        parsedCsv={parsedCsv}
        mapping={emptyMapping}
        dateFormat="DD/MM/YYYY"
        onMappingChange={jest.fn()}
        onDateFormatChange={jest.fn()}
        onBack={jest.fn()}
        onNext={jest.fn()}
        isValid={false}
      />,
    );
    expect(screen.getByText("Column Mapping")).toBeInTheDocument();
  });

  it("mounts the add-bank-account sheet without a Radix empty-value throw", () => {
    renderWithTooltip(<AddBankAccountSheet open onOpenChange={jest.fn()} />);
    expect(screen.getByText("Linked Ledger Account (optional)")).toBeInTheDocument();
  });
});
