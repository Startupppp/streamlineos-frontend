import type { ReactNode } from "react";
import { fireEvent, render, screen } from "@testing-library/react";

jest.mock("sonner", () => ({ toast: { error: jest.fn(), success: jest.fn() } }));

jest.mock("@/components/ui/page-wrapper", () => ({
  PageWrapper: ({ title, children, actions }: { title: ReactNode; children: ReactNode; actions?: ReactNode }) => (
    <div>
      <h1>{title}</h1>
      {actions}
      {children}
    </div>
  ),
}));
jest.mock("@/components/shared/page-state", () => ({
  PageState: ({ children }: { children: ReactNode }) => <>{children}</>,
}));
jest.mock("@/hooks/api/use-page-state", () => ({ usePageState: () => ({ kind: "ready" }) }));

let canResign = true;
jest.mock("@/hooks/api/access", () => ({ useCan: () => canResign }));

jest.mock("@/features/hr/exit/resignation-form-sheet", () => ({
  ResignationFormSheet: ({ open }: { open: boolean }) => (open ? <div>resignation sheet</div> : null),
}));

jest.mock("@/components/ui/confirm-dialog", () => ({
  ConfirmDialog: ({ open, onConfirm, confirmLabel }: { open: boolean; onConfirm: () => void; confirmLabel: string }) =>
    open ? (
      <button type="button" onClick={onConfirm}>
        confirm {confirmLabel}
      </button>
    ) : null,
}));

let rows: Array<Record<string, unknown>> = [];
const withdrawMutate = jest.fn();
jest.mock("@/hooks/api/hr/exit", () => ({
  useMyResignations: () => ({
    data: { data: rows, pagination: { limit: 20, hasMore: false, nextCursor: null } },
    isLoading: false,
    isError: false,
    error: null,
    refetch: jest.fn(),
  }),
  useWithdrawMyResignation: () => ({ mutate: withdrawMutate, isPending: false }),
}));

import { MyResignationPage } from "./my-resignation-page";

function row(id: number, status: string) {
  return { id, status, reasonCategory: "Better salary or benefits", createdAt: "2026-10-01T00:00:00Z", lastWorkingDate: "2026-12-01" };
}

beforeEach(() => {
  canResign = true;
  rows = [];
  withdrawMutate.mockReset();
});

describe("QA-2026-10-14 — an employee resigns from /me without hr:exit:view", () => {
  it("offers to submit a resignation when none is active", () => {
    render(<MyResignationPage />);
    expect(screen.queryByText("resignation sheet")).not.toBeInTheDocument();
    fireEvent.click(screen.getAllByRole("button", { name: /Submit resignation/ })[0]);
    expect(screen.getByText("resignation sheet")).toBeInTheDocument();
  });

  it("withdraws an active resignation after confirmation and hides submit while it is active", () => {
    rows = [row(5, "PENDING_HR")];
    render(<MyResignationPage />);
    expect(screen.queryByRole("button", { name: /Submit resignation/ })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Withdraw" }));
    fireEvent.click(screen.getByRole("button", { name: "confirm Withdraw" }));
    expect(withdrawMutate).toHaveBeenCalledWith({ resignationId: 5 }, expect.any(Object));
  });

  it("offers no withdraw on a finished resignation, and no controls at all without self:resignation", () => {
    rows = [row(6, "FINAL_APPROVED")];
    render(<MyResignationPage />);
    expect(screen.queryByRole("button", { name: "Withdraw" })).not.toBeInTheDocument();

    canResign = false;
    rows = [row(7, "PENDING_HR")];
    render(<MyResignationPage />);
    expect(screen.queryAllByRole("button", { name: "Withdraw" })).toHaveLength(0);
  });
});
