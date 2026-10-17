import { fireEvent, render, screen } from "@testing-library/react";
import { toast } from "sonner";
import { PublishPayslipsAction } from "./publish-payslips-action";

jest.mock("sonner", () => ({ toast: { success: jest.fn(), warning: jest.fn(), error: jest.fn() } }));

jest.mock("@/hooks/api/access", () => ({ useCan: () => true }));

jest.mock("@/features/payroll/shared/run-conflict", () => ({ useRunConflictHandler: () => jest.fn() }));

const mutate = jest.fn();
const mockUseRunEmployees = jest.fn();
jest.mock("@/hooks/api/payroll", () => ({
  usePublishPayslips: () => ({ mutate, isPending: false }),
  useRunEmployees: (...args: unknown[]) => mockUseRunEmployees(...args),
}));

function row(id: number, holdReason: string | null) {
  return { id, holdReason };
}

function roster(rows: ReturnType<typeof row>[], hasMore = false) {
  return { data: { data: rows, pagination: { hasMore, total: rows.length } } };
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe("PublishPayslipsAction", () => {
  it("labels the button with releasable and held counts", () => {
    mockUseRunEmployees.mockReturnValue(roster([row(1, null), row(2, null), row(3, "On hold")]));
    render(<PublishPayslipsAction runId={7} status="PAID" />);
    expect(screen.getByRole("button", { name: "Release 2 payslips · 1 on hold" })).toBeInTheDocument();
  });

  it("omits the held suffix when nobody is on hold", () => {
    mockUseRunEmployees.mockReturnValue(roster([row(1, null)]));
    render(<PublishPayslipsAction runId={7} status="PAID" />);
    expect(screen.getByRole("button", { name: "Release 1 payslip" })).toBeInTheDocument();
  });

  it("claims no count when the roster is larger than one page", () => {
    mockUseRunEmployees.mockReturnValue(roster([row(1, null)], true));
    render(<PublishPayslipsAction runId={7} status="PAID" />);
    expect(screen.getByRole("button", { name: "Release payslips" })).toBeInTheDocument();
  });

  it("reports the server's released and held counts", () => {
    mockUseRunEmployees.mockReturnValue(roster([row(1, null), row(2, "On hold")]));
    mutate.mockImplementation((_vars, opts: { onSuccess: (d: unknown) => void }) =>
      opts.onSuccess({ published: 1, total: 1, heldCount: 1, runStatus: "PAID" }),
    );
    render(<PublishPayslipsAction runId={7} status="PAID" />);
    fireEvent.click(screen.getByRole("button", { name: "Release 1 payslip · 1 on hold" }));
    fireEvent.click(screen.getByRole("button", { name: "Release" }));
    expect(mutate).toHaveBeenCalledWith({ runId: 7 }, expect.anything());
    expect(toast.success).toHaveBeenCalledWith("Released 1 payslip. 1 on hold.");
  });
});
