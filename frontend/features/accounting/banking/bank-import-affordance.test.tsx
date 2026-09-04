/**
 * The seventh F16 surface. `accounting-mutation-gates.test.tsx` gives the other
 * six a full hidden/shown/correct-key trio; the Import control could not be
 * asserted there because it lives on step 3 of a wizard and that suite never
 * walked the steps. So this file walks them.
 *
 * The wizard is driven for real: the account arrives on the `bankAccountId`
 * deep link the page already reads, a CSV is uploaded through the real file
 * input, and step 1's "Next: Map Columns" is clicked. Only the step-2 pane is
 * substituted — it is a column-mapping form over Radix Selects, which is
 * navigation, not authorization — and the substitute sets the same mapping
 * fields the real one does before calling `onNext`. Step 3, its
 * `{canImport && …}` wrapper and the LoadingButton inside it are the real
 * components.
 */
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TooltipProvider } from "@/components/ui/tooltip";

const mockUseCan = jest.fn();

jest.mock("@/hooks/api/access", () => ({
  useCan: (key: string) => Boolean(mockUseCan(key)),
}));

jest.mock("sonner", () => ({ toast: { success: jest.fn(), error: jest.fn() } }));

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn(), refresh: jest.fn() }),
  usePathname: () => "/accounting/banking/import",
  useSearchParams: () => new URLSearchParams("bankAccountId=1"),
}));

jest.mock("@/features/accounting/banking/lib/parse-csv", () => ({
  parseCsvFile: jest.fn(async () => ({
    headers: ["Date", "Description", "Amount"],
    rows: [["01/01/2026", "Opening", "100.00"]],
    rowCount: 1,
  })),
  DATE_FORMAT_OPTIONS: ["DD/MM/YYYY", "MM/DD/YYYY", "YYYY-MM-DD"],
}));

interface Step2StubProps {
  onMappingChange: (field: string, value: string) => void;
  onNext: () => void;
}

jest.mock("@/features/accounting/banking/components/bank-import-step2", () => ({
  BankImportStep2: ({ onMappingChange, onNext }: Step2StubProps) => {
    function handleAdvance() {
      onMappingChange("date", "0");
      onMappingChange("description", "1");
      onNext();
    }
    return (
      <button type="button" onClick={handleAdvance}>
        stub: finish mapping
      </button>
    );
  },
}));

const importMutation = { mutate: jest.fn(), mutateAsync: jest.fn(), isPending: false };

jest.mock("@/hooks/api/accounting/banking", () => ({
  useBankAccounts: () => ({
    data: {
      data: [
        {
          id: 1,
          name: "Current",
          accountName: "Current",
          bankName: "HDFC",
          currency: "INR",
          currentBalance: "0.00",
          isActive: true,
        },
      ],
      pagination: { hasMore: false, nextCursor: null },
    },
    isLoading: false,
    isError: false,
    error: null,
    refetch: jest.fn(),
  }),
  useCreateBankImport: () => importMutation,
}));

import { BankImportClient } from "./components/bank-import-client";

const WRITE_KEY = "accounting:banking:import";
const READ_KEY = "accounting:banking:read";

function grantOnly(...keys: string[]): void {
  mockUseCan.mockImplementation((key: string) => keys.includes(key));
}

beforeEach(() => {
  mockUseCan.mockReset();
});

async function walkToReviewStep(): Promise<void> {
  const user = userEvent.setup();
  render(<BankImportClient />, { wrapper: TooltipProvider });

  const csv = new File(["Date,Description,Amount\n01/01/2026,Opening,100.00\n"], "jan.csv", {
    type: "text/csv",
  });
  const fileInput = document.querySelector<HTMLInputElement>('input[type="file"]');
  if (!fileInput) throw new Error("the wizard rendered no file input");
  await user.upload(fileInput, csv);

  const next = await screen.findByRole("button", { name: /next: map columns/i });
  await waitFor(() => expect(next).toBeEnabled());
  await user.click(next);

  await user.click(await screen.findByRole("button", { name: /stub: finish mapping/i }));
  await screen.findByText("Review & Import");
}

describe("Bank Import — Import Transactions", () => {
  it("hides the control from a holder of accounting:banking:read alone", async () => {
    grantOnly(READ_KEY);
    await walkToReviewStep();

    expect(
      screen.queryByRole("button", { name: /import transactions/i }),
    ).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^back$/i })).toBeInTheDocument();
  });

  it("shows the control to a holder of accounting:banking:import", async () => {
    grantOnly(READ_KEY, WRITE_KEY);
    await walkToReviewStep();

    expect(
      screen.getByRole("button", { name: /import transactions/i }),
    ).toBeInTheDocument();
  });

  it("asks for exactly the key useCreateBankImport declares", async () => {
    grantOnly(READ_KEY, WRITE_KEY);
    await walkToReviewStep();

    expect(mockUseCan).toHaveBeenCalledWith(WRITE_KEY);
    expect(mockUseCan).not.toHaveBeenCalledWith("accounting:banking:manage");
    expect(mockUseCan).not.toHaveBeenCalledWith("accounting:manage");
  });
});
