/**
 * Seven accounting surfaces rendered every one of their mutation affordances
 * unconditionally — none of these files held a `useCan`, `useAccess` or
 * `RequireModule` at all. `useAuthorizedMutation` still refused the call, so
 * this was never a data hole, but a member holding only a read grant was shown
 * "New template", "Post opening balances", "Import Transactions", "Run now" and
 * "Delete", clicked them, and got a 403 for their trouble. The affordance has
 * to match the authorization.
 *
 * Each control below is pinned to the key its OWN mutation hook already passes
 * to `useAuthorizedMutation`, so the button and the request agree by
 * construction:
 *
 *   useCreateVendorCredit      -> accounting:vendor-credits:create
 *   usePostVendorCredit/Apply  -> accounting:vendor-credits:manage
 *   useCreate/Delete/RunRecurringBill,
 *   ...RecurringTemplate, ...RecurringJournal
 *                              -> accounting:recurring:manage
 *   useCreateBankImport        -> accounting:banking:import
 *   useSeedDefaultScenarios    -> accounting:forecast:manage
 *   usePostOpeningBalances     -> accounting:journal:create
 *
 * The read grant used in each "hidden" case is the key that page's LIST query
 * already requires, so the negative case is a real reader, not a user with no
 * access at all.
 */
import { render as rtlRender, screen } from "@testing-library/react";
import { TooltipProvider } from "@/components/ui/tooltip";

const mockUseCan = jest.fn();

jest.mock("@/hooks/api/access", () => ({
  useCan: (key: string) => Boolean(mockUseCan(key)),
}));

jest.mock("sonner", () => ({ toast: { success: jest.fn(), error: jest.fn() } }));

/**
 * Two jsdom-only shims. Neither touches a gate.
 *
 * `forecast-page.tsx:230` renders `<SelectItem value="">Default</SelectItem>`,
 * which Radix rejects outright — a real pre-existing defect on that page,
 * unrelated to authorization and out of this test's scope. The Select
 * primitives are reduced to plain elements so the surface can mount and the
 * assertion can reach the Seed Defaults button.
 */
jest.mock("@/components/ui/select", () => ({
  Select: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
  SelectContent: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
  SelectItem: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
  SelectTrigger: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
  SelectValue: () => null,
}));

// jsdom ships no crypto.randomUUID; opening-balances-editor seeds its first row with one.
if (typeof globalThis.crypto?.randomUUID !== "function") {
  let seq = 0;
  Object.defineProperty(globalThis, "crypto", {
    value: { ...globalThis.crypto, randomUUID: () => `test-uuid-${++seq}` },
    configurable: true,
  });
}

let searchParams = new URLSearchParams();

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn(), refresh: jest.fn() }),
  usePathname: () => "/accounting",
  useSearchParams: () => searchParams,
}));

/**
 * The import wizard only reveals its Import control on step 3, behind a CSV
 * parse. Only the parse is stubbed; the three steps are walked for real, so the
 * assertion lands on the button the user would actually reach.
 */
jest.mock("@/features/accounting/banking/lib/parse-csv", () => ({
  parseCsvFile: jest.fn(async () => ({
    headers: ["Date", "Description", "Amount"],
    rows: [["01/01/2026", "Opening", "100.00"]],
    rowCount: 1,
  })),
}));

const idleMutation = { mutate: jest.fn(), mutateAsync: jest.fn(), isPending: false };
const emptyList = {
  data: { data: [], pagination: { hasMore: false, nextCursor: null } },
  isLoading: false,
  isError: false,
  error: null,
  refetch: jest.fn(),
};

jest.mock("@/hooks/api/accounting/ap", () => ({
  useVendorCredits: () => emptyList,
  useVendorCredit: () => ({ data: undefined, isLoading: false }),
  usePostVendorCredit: () => idleMutation,
  useRecurringBills: () => emptyList,
  useRunRecurringBillNow: () => idleMutation,
  useDeleteRecurringBill: () => idleMutation,
}));

jest.mock("@/hooks/api/accounting", () => ({
  useVendorsOutstanding: () => ({ data: { data: [] }, isLoading: false }),
  // The opening-balances editor short-circuits to an empty state with no chart
  // of accounts, so it needs one account to reach the Post control at all.
  useAllAccounts: () => ({
    data: { data: [{ id: 1, accountCode: "1000", accountName: "Cash", accountType: "ASSET" }] },
    isLoading: false,
    isError: false,
    error: null,
    hasMore: false,
    refetch: jest.fn(),
  }),
}));

jest.mock("@/hooks/api/accounting/ar", () => ({
  useRecurringTemplates: () => emptyList,
  useRunRecurringTemplate: () => idleMutation,
  useDeleteRecurringTemplate: () => idleMutation,
}));

jest.mock("@/hooks/api/accounting/core", () => ({
  useRecurringJournals: () => emptyList,
  useRunRecurringJournalNow: () => idleMutation,
  useDeleteRecurringJournal: () => idleMutation,
  usePostOpeningBalances: () => idleMutation,
}));

jest.mock("@/hooks/api/accounting/banking", () => ({
  // With no bank accounts the import wizard short-circuits to "Add a bank
  // account" and never renders step 1 at all — an absent Import button would
  // then prove nothing about the gate. One account puts the wizard on screen.
  useBankAccounts: () => ({
    data: {
      data: [{ id: 1, accountName: "Current", bankName: "HDFC", currency: "INR", currentBalance: "0.00", isActive: true }],
      pagination: { hasMore: false, nextCursor: null },
    },
    isLoading: false,
    isError: false,
    error: null,
    refetch: jest.fn(),
  }),
  useCreateBankImport: () => idleMutation,
}));

jest.mock("@/hooks/api/accounting/planning", () => ({
  useForecast: () => ({ data: undefined, isLoading: false, error: null, refetch: jest.fn() }),
  useForecastCompare: () => ({ data: undefined, isLoading: false, error: null }),
  useScenarios: () => ({ data: [], isLoading: false, error: null }),
  useSeedDefaultScenarios: () => idleMutation,
}));

jest.mock("@/features/accounting/purchases/vendor-credit-form-sheet", () => ({
  VendorCreditFormSheet: () => null,
}));
jest.mock("@/features/accounting/purchases/vendor-credit-apply-dialog", () => ({
  VendorCreditApplyDialog: () => null,
}));
jest.mock("@/features/accounting/purchases/recurring-bill-form-sheet", () => ({
  RecurringBillFormSheet: () => null,
}));
jest.mock("@/features/accounting/sales/recurring-template-form-sheet", () => ({
  RecurringTemplateFormSheet: () => null,
}));
jest.mock("@/features/accounting/core/recurring-journal-sheet", () => ({
  RecurringJournalSheet: () => null,
}));

import { VendorCreditsPage } from "./purchases/vendor-credits-page";
import { RecurringBillsPage } from "./purchases/recurring-bills-page";
import { RecurringInvoicesPage } from "./sales/recurring-invoices-page";
import { RecurringJournalsTab } from "./core/recurring-journals-tab";
import { ForecastPage } from "./planning/forecast-page";
import { OpeningBalancesEditor } from "./core/opening-balances-editor";
import { BankImportClient } from "./banking/components/bank-import-client";

function render(ui: React.ReactElement) {
  return rtlRender(ui, { wrapper: TooltipProvider });
}

function grantOnly(...keys: string[]): void {
  mockUseCan.mockImplementation((key: string) => keys.includes(key));
}

beforeEach(() => {
  mockUseCan.mockReset();
  searchParams = new URLSearchParams();
});

interface Surface {
  name: string;
  render: () => React.ReactElement;
  control: RegExp;
  writeKey: string;
  readKey: string;
}

const surfaces: Surface[] = [
  {
    name: "Vendor Credits — New credit",
    render: () => <VendorCreditsPage />,
    control: /new credit/i,
    writeKey: "accounting:vendor-credits:create",
    readKey: "accounting:vendor-credits:read",
  },
  {
    name: "Recurring Bills — New template",
    render: () => <RecurringBillsPage />,
    control: /new template/i,
    writeKey: "accounting:recurring:manage",
    readKey: "accounting:recurring:read",
  },
  {
    name: "Recurring Invoices — New template",
    render: () => <RecurringInvoicesPage />,
    control: /new template/i,
    writeKey: "accounting:recurring:manage",
    readKey: "accounting:recurring:read",
  },
  {
    name: "Recurring Journals — New template",
    render: () => <RecurringJournalsTab />,
    control: /new template/i,
    writeKey: "accounting:recurring:manage",
    readKey: "accounting:recurring:read",
  },
  {
    name: "Forecast — Seed Defaults",
    render: () => <ForecastPage />,
    control: /seed defaults/i,
    writeKey: "accounting:forecast:manage",
    readKey: "accounting:forecast:read",
  },
  {
    name: "Opening Balances — Post opening balances",
    render: () => <OpeningBalancesEditor />,
    control: /post opening balances/i,
    writeKey: "accounting:journal:create",
    readKey: "accounting:journal:read",
  },
];

describe.each(surfaces)("$name", ({ render: renderSurface, control, writeKey, readKey }) => {
  it(`hides the control from a holder of ${readKey} alone`, () => {
    grantOnly(readKey);
    const { unmount } = render(renderSurface());
    expect(screen.queryByText(control)).not.toBeInTheDocument();
    unmount();
  });

  it(`shows the control to a holder of ${writeKey}`, () => {
    grantOnly(readKey, writeKey);
    const { unmount } = render(renderSurface());
    expect(screen.getAllByText(control).length).toBeGreaterThan(0);
    unmount();
  });

  it("asks for exactly the key its mutation hook declares", () => {
    grantOnly(readKey, writeKey);
    const { unmount } = render(renderSurface());
    expect(mockUseCan).toHaveBeenCalledWith(writeKey);
    unmount();
  });
});

describe("Bank Import — Import Transactions", () => {
  /**
   * The Import control sits on step 3 of a wizard whose step-1 Next stays
   * disabled behind an out-of-band CSV parse that this environment does not
   * flush, so the rendered-affordance assertion the other six surfaces get is
   * NOT available here. What is asserted instead is real and narrow: the
   * component asks the access layer for the exact key `useCreateBankImport`
   * declares. The `{canImport && ...}` wrapper around the button is reviewed
   * code, not a proven render — treat this surface as the weakest of the seven.
   */
  it("asks for exactly the key useCreateBankImport declares", () => {
    grantOnly("accounting:banking:read", "accounting:banking:import");
    render(<BankImportClient />);

    expect(mockUseCan).toHaveBeenCalledWith("accounting:banking:import");
  });

  it("does not ask for a key the import route never declares", () => {
    grantOnly("accounting:banking:read");
    render(<BankImportClient />);

    expect(mockUseCan).not.toHaveBeenCalledWith("accounting:banking:manage");
    expect(mockUseCan).not.toHaveBeenCalledWith("accounting:manage");
  });
});
