import React from "react";
import { render, screen } from "@testing-library/react";
import { BreakdownSheet } from "./breakdown-sheet";

jest.mock("@/hooks/api/access", () => ({
  useCan: () => true,
}));

const mockRunEmployee = jest.fn();
const idleMutation = { mutate: jest.fn(), isPending: false };
jest.mock("@/hooks/api/payroll/run-employees", () => ({
  useRunEmployee: () => mockRunEmployee(),
  useAddAdjustment: () => idleMutation,
  useSetEmployeeHold: () => idleMutation,
  useReleaseEmployeeHold: () => idleMutation,
}));

const mockPayrollRun = jest.fn();
jest.mock("@/hooks/api/payroll/runs", () => ({
  usePayrollRun: () => mockPayrollRun(),
}));

function renderSheet(status: string | undefined, holdReason: string | null) {
  mockPayrollRun.mockReturnValue({ data: status ? { run: { status } } : undefined });
  mockRunEmployee.mockReturnValue({ data: { holdReason }, isLoading: false });
  const isLocked = status !== undefined && ["APPROVED", "LOCKED", "PAID", "PAYSLIPS_PUBLISHED", "CLOSED"].includes(status);
  return render(<BreakdownSheet runId={1} runEmployeeId={2} onClose={jest.fn()} isLocked={isLocked} />);
}

describe("BreakdownSheet hold actions", () => {
  it.each(["APPROVED", "LOCKED", "CLOSED"])("HO-05 hides Release while the payout set is frozen (%s)", (status) => {
    renderSheet(status, "Bank details pending");
    expect(screen.queryByRole("button", { name: "Release" })).toBeNull();
    expect(screen.getByText("On hold: Bank details pending")).toBeInTheDocument();
  });

  it("HO-05 hides Release until the run status is known", () => {
    renderSheet(undefined, "Bank details pending");
    expect(screen.queryByRole("button", { name: "Release" })).toBeNull();
  });

  it.each(["DRAFT", "PAID", "PAYSLIPS_PUBLISHED"])("HO-05 offers Release on a %s run", (status) => {
    renderSheet(status, "Bank details pending");
    expect(screen.getByRole("button", { name: "Release" })).toBeInTheDocument();
  });

  it("HO-05 still offers Hold Salary on a locked run", () => {
    renderSheet("LOCKED", null);
    expect(screen.getByRole("button", { name: "Hold Salary" })).toBeInTheDocument();
  });
});
