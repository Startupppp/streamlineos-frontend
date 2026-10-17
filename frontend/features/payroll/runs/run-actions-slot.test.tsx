import { fireEvent, render, screen } from "@testing-library/react";
import type { PayrollRun } from "@/types/payroll/runs";
import { RunActionsSlot } from "./run-actions-slot";

const discard = jest.fn();
const idle = { mutate: jest.fn(), isPending: false };

jest.mock("next/navigation", () => ({ useRouter: () => ({ push: jest.fn() }) }));
jest.mock("sonner", () => ({ toast: { success: jest.fn(), error: jest.fn() } }));
jest.mock("@/hooks/api/access", () => ({ useCan: () => true }));
jest.mock("@/features/payroll/shared/run-conflict", () => ({ useRunConflictHandler: () => jest.fn() }));
jest.mock("@/hooks/api/payroll/runs", () => ({
  useGenerateRun: () => idle,
  useRecalculateRun: () => idle,
  useDiscardRun: () => ({ mutate: discard, isPending: false }),
}));
jest.mock("@/hooks/api/payroll/approvals", () => ({
  useReopenRun: () => ({ mutate: jest.fn(), isPending: false }),
}));
jest.mock("@/features/payroll/payout", () => ({
  SubmitApprovalAction: () => null,
  LockActions: () => null,
  PublishPayslipsAction: () => null,
}));

function run(status: string): PayrollRun {
  return { id: 9, status, exceptionCount: 0 } as unknown as PayrollRun;
}

describe("UX-R1-2 a run that has not gone for approval can be discarded", () => {
  it("offers Discard on a generated run and sends the discard on confirm", () => {
    render(<RunActionsSlot run={run("PREVIEW_READY")} />);

    fireEvent.click(screen.getByRole("button", { name: "Discard" }));
    fireEvent.click(screen.getByRole("button", { name: "Discard run" }));

    expect(discard).toHaveBeenCalledWith(9, expect.any(Object));
  });

  it("offers no Discard once the run is pending approval", () => {
    render(<RunActionsSlot run={run("PENDING_APPROVAL")} />);

    expect(screen.queryByRole("button", { name: "Discard" })).toBeNull();
  });

  it("offers Recalculate and Reopen while a run is pending approval", () => {
    render(<RunActionsSlot run={{ ...run("PENDING_APPROVAL"), employeeCount: 0 }} />);

    expect(screen.getByRole("button", { name: "Recalculate" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Reopen run" })).toBeInTheDocument();
  });
});
