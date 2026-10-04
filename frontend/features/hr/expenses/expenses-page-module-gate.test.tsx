import { render, screen } from "@testing-library/react";
import { useAccess } from "@/hooks/api/access";
import { useExpensePageData } from "@/hooks/api/hr";
import { ExpensesPage } from "./expenses-page";

/**
 * Expenses are an HRMS surface. Turning Accounting off must not hide the list
 * or mention Accounting.
 */

jest.mock("next-auth/react", () => ({ useSession: () => ({ data: { user: { id: "u1" } } }) }));
jest.mock("@/hooks/common/use-expense-filters", () => ({
  useExpenseFilters: () => ({
    filters: { page: 1, pageSize: 5, search: "", sortBy: "date", sortOrder: "desc" },
    setFilter: jest.fn(),
    setDatePreset: jest.fn(),
    datePreset: "all",
    activeFilterCount: 0,
  }),
}));
jest.mock("@/hooks/api/access", () => ({
  useCan: jest.fn(),
  useAccess: jest.fn(),
  useModuleEnabled: jest.fn(() => true),
}));
jest.mock("@/hooks/api/entitlements", () => ({
  useEntitlements: () => ({ data: { lockedModules: [] } }),
}));
jest.mock("@/hooks/api/hr", () => ({
  useExpensePageData: jest.fn(),
  useUpdateExpenseStatus: () => ({ mutate: jest.fn(), isPending: false }),
  useHrEmployees: () => ({ data: undefined }),
  unwrapEmployees: () => [],
}));
jest.mock("@/features/hr/expenses/components/create-expense-dialog", () => ({ CreateExpenseDialog: () => null }));
jest.mock("@/features/hr/expenses/components/import-expense-sheet", () => ({ ImportExpenseSheet: () => null }));
jest.mock("@/components/expenses/expense-export/expense-export-dialog", () => ({ ExpenseExportDialog: () => null }));
jest.mock("@/features/hr/expenses/expense-stats", () => ({ AdminExpenseStats: () => null }));
jest.mock("@/features/hr/expenses/expense-filters", () => ({
  AdminExpenseFilters: () => null,
  MemberExpenseFilters: () => null,
}));
jest.mock("@/features/hr/expenses/expense-list", () => ({
  AdminExpenseList: () => <p>admin expense list</p>,
  MemberExpenseList: () => <p>member expense list</p>,
}));

const { useCan } = jest.requireMock("@/hooks/api/access") as { useCan: jest.Mock };
const mockedAccess = useAccess as jest.Mock;
const mockedPageData = useExpensePageData as jest.Mock;

function setup({ admin, accounting }: { admin: boolean; accounting: boolean }) {
  useCan.mockReturnValue(admin);
  mockedAccess.mockReturnValue({ data: { modules: { accounting, hr: true } }, isLoading: false });
  mockedPageData.mockReturnValue(
    {
          data: {
            expenses: [{ id: 1, status: "PENDING", amount: "10.00", date: "2026-09-01" }],
            pendingExpenses: [],
            stats: null,
            pagination: { page: 1, pageSize: 5, total: 0, totalPages: 0 },
          },
          isLoading: false,
          isError: false,
          error: null,
          refetch: jest.fn(),
        },
  );
  render(<ExpensesPage />);
}

describe("ExpensesPage without the accounting module", () => {
  it("shows the admin list when Accounting is off", () => {
    setup({ admin: true, accounting: false });
    expect(screen.getByText("admin expense list")).toBeInTheDocument();
    expect(screen.queryByText("Module not enabled")).not.toBeInTheDocument();
    expect(screen.queryByText(/accounting/i)).not.toBeInTheDocument();
  });

  it("renders the admin list when the module is on", () => {
    setup({ admin: true, accounting: true });
    expect(screen.getByText("admin expense list")).toBeInTheDocument();
    expect(screen.queryByText("Module not enabled")).not.toBeInTheDocument();
  });

  it("does not block a member, whose self-service read is not module-gated", () => {
    setup({ admin: false, accounting: false });
    expect(screen.getByText("member expense list")).toBeInTheDocument();
    expect(screen.queryByText("Module not enabled")).not.toBeInTheDocument();
  });
});
