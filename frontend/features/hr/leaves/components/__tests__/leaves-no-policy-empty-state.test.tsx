import * as React from "react";
import { fireEvent, render, screen } from "@testing-library/react";

/**
 * V-051. The unconfigured-policy state is a dead end unless it carries a route
 * into setup — and the route must not be offered to someone who cannot take it.
 */
let canManage = true;
jest.mock("@/hooks/api/access", () => ({
  useCan: () => canManage,
  useAccess: () => ({ data: { isOrgOwner: false, scopes: {} }, isLoading: false }),
  useModuleEnabled: () => true,
}));

const seedMutate = jest.fn();
jest.mock("@/hooks/api/hr", () => ({
  useSeedLeaveTypes: () => ({
    mutate: seedMutate,
    isPending: false,
  }),
}));

const toastSuccess = jest.fn();
const toastError = jest.fn();
jest.mock("sonner", () => ({
  toast: {
    success: (m: string) => toastSuccess(m),
    error: (m: string) => toastError(m),
  },
}));

import { LeavesNoPolicyEmptyState } from "@/features/hr/leaves/components/leaves-no-policy-empty-state";

describe("LeavesNoPolicyEmptyState", () => {
  beforeEach(() => {
    canManage = true;
    seedMutate.mockReset();
    toastSuccess.mockReset();
  });

  it("offers both routes into setup to someone who may manage leave", () => {
    render(<LeavesNoPolicyEmptyState />);

    expect(screen.getByText("Policies not configured")).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /Configure leave policies/i }),
    ).toHaveAttribute("href", "/hr/leave-policies");
    expect(
      screen.getByRole("button", { name: /India SMB template/i }),
    ).toBeInTheDocument();
  });

  it("seeds the standard leave types from the template action", () => {
    seedMutate.mockImplementation(
      (_vars: undefined, opts: { onSuccess: (r: { seeded: number }) => void }) =>
        opts.onSuccess({ seeded: 5 }),
    );
    render(<LeavesNoPolicyEmptyState />);

    fireEvent.click(screen.getByRole("button", { name: /India SMB template/i }));

    expect(seedMutate).toHaveBeenCalledTimes(1);
    expect(toastSuccess).toHaveBeenCalledWith(expect.stringContaining("5"));
  });

  it("explains the state without offering a control a member cannot use", () => {
    canManage = false;
    render(<LeavesNoPolicyEmptyState />);

    expect(screen.getByText("Policies not configured")).toBeInTheDocument();
    expect(
      screen.queryByRole("link", { name: /Configure leave policies/i }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /India SMB template/i }),
    ).not.toBeInTheDocument();
    expect(screen.getByText(/An HR admin can configure/i)).toBeInTheDocument();
  });
});
