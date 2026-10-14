import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ApiError } from "@/lib/api-envelope";
import { CreateLoanDialog } from "./create-loan-dialog";
import { LoansPageContent } from "./loans-page";

const mutate = jest.fn();
let scope = "all";
let searchParams = new URLSearchParams();

jest.mock("@/hooks/api/payroll/loans-admin", () => ({
  useCreateAdminLoan: () => ({ mutate, isPending: false }),
}));

jest.mock("@/hooks/api/access", () => ({
  useScope: () => scope,
}));

jest.mock("next/navigation", () => ({
  useSearchParams: () => searchParams,
}));

jest.mock("./loans-table", () => ({ LoansTable: () => null }));

jest.mock("@/components/ui/user-combobox", () => ({
  UserCombobox: ({ value, onChange }: { value: string; onChange: (v: string) => void }) => (
    <input aria-label="Employee" value={value} onChange={(e) => onChange(e.target.value)} />
  ),
}));

jest.mock("sonner", () => ({ toast: { success: jest.fn(), error: jest.fn() } }));

beforeEach(() => {
  mutate.mockReset();
  scope = "all";
  searchParams = new URLSearchParams();
});

describe("the New loan dialog", () => {
  it("shows every missing field inline and sends nothing", async () => {
    const user = userEvent.setup();
    render(<CreateLoanDialog open onOpenChange={jest.fn()} />);
    await user.clear(screen.getByLabelText(/Number of EMIs/));
    await user.click(screen.getByRole("button", { name: "Create loan" }));

    expect(await screen.findByText("Select an employee")).toBeInTheDocument();
    expect(screen.getByText("Amount is required")).toBeInTheDocument();
    expect(screen.getByText("Number of EMIs is required")).toBeInTheDocument();
    expect(screen.getByText("Reason is required")).toBeInTheDocument();
    expect(mutate).not.toHaveBeenCalled();
  });

  it("holds the server's ₹1,000 floor in the form", async () => {
    const user = userEvent.setup();
    render(<CreateLoanDialog open onOpenChange={jest.fn()} />);
    await user.type(screen.getByLabelText("Employee"), "user-2");
    await user.type(screen.getByLabelText(/Amount/), "500");
    await user.type(screen.getByLabelText(/Reason/), "Advance");
    await user.click(screen.getByRole("button", { name: "Create loan" }));

    expect(await screen.findByText(/at least ₹1,000/)).toBeInTheDocument();
    expect(mutate).not.toHaveBeenCalled();
  });

  it("creates the loan for the chosen employee with numeric amounts and previews the EMI", async () => {
    const user = userEvent.setup();
    render(<CreateLoanDialog open onOpenChange={jest.fn()} />);
    await user.type(screen.getByLabelText("Employee"), "user-2");
    await user.type(screen.getByLabelText(/Amount/), "60000");
    await user.type(screen.getByLabelText(/Reason/), "Relocation advance");

    expect(screen.getByText(/EMI: .*5,000.* per payroll run/)).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Create loan" }));

    expect(mutate).toHaveBeenCalledWith(
      { userId: "user-2", amount: 60000, totalEmis: 12, reason: "Relocation advance" },
      expect.anything(),
    );
  });

  it("puts a server refusal under the form instead of a toast", async () => {
    mutate.mockImplementation((_body, opts: { onError: (e: unknown) => void }) =>
      opts.onError(new ApiError("Employee is not a member of this organization", 403, "FORBIDDEN")),
    );
    const user = userEvent.setup();
    render(<CreateLoanDialog open onOpenChange={jest.fn()} />);
    await user.type(screen.getByLabelText("Employee"), "user-2");
    await user.type(screen.getByLabelText(/Amount/), "60000");
    await user.type(screen.getByLabelText(/Reason/), "Advance");
    await user.click(screen.getByRole("button", { name: "Create loan" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(/not a member/);
  });
});

describe("the Loans page's New loan action", () => {
  it("is offered to an org-wide approver, the only caller POST /hr/loans lets choose the employee", () => {
    render(<LoansPageContent />);
    expect(screen.getByRole("button", { name: /New loan/ })).toBeInTheDocument();
  });

  it("is withheld from a team-scoped approver, whose chosen employee the server would silently replace with themselves", () => {
    scope = "team";
    render(<LoansPageContent />);
    expect(screen.queryByRole("button", { name: /New loan/ })).not.toBeInTheDocument();
  });

  it("opens straight away from the Create menu's ?create=1 link", () => {
    searchParams = new URLSearchParams("create=1");
    render(<LoansPageContent />);
    expect(screen.getByRole("dialog", { name: /New loan or advance/ })).toBeInTheDocument();
  });
});
