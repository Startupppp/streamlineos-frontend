import type { ReactNode } from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { ApiError } from "@/lib/api-envelope";
import { getErrorMessage } from "@/lib/get-error-message";

jest.mock("sonner", () => ({ toast: { error: jest.fn(), success: jest.fn() } }));

jest.mock("@/components/ui/page-wrapper", () => ({
  PageWrapper: ({ title, children }: { title: ReactNode; children: ReactNode }) => (
    <div>
      <h1>{title}</h1>
      {children}
    </div>
  ),
}));

jest.mock("@/features/hr/shared/employee-picker", () => ({ EmployeePicker: () => null }));
jest.mock("@/components/shared/hr-sheet", () => ({ HrSheet: () => null }));
jest.mock("@/components/ui/confirm-sheet", () => ({ ConfirmSheet: () => null }));

jest.mock("@/hooks/api/access", () => ({ useCan: () => true }));
jest.mock("@/hooks/api/org-display", () => ({ useOrgDisplay: () => ({ currency: "INR", locale: "en-IN" }) }));

const mockUsePageState = jest.fn();
jest.mock("@/hooks/api/use-page-state", () => ({
  usePageState: (...args: unknown[]) => mockUsePageState(...args),
}));

const mockUseFnfSettlements = jest.fn();
jest.mock("@/hooks/api/hr/fnf", () => ({
  useFnfSettlements: () => mockUseFnfSettlements(),
  useCreateFnfSettlement: () => ({ mutate: jest.fn(), isPending: false }),
  useCompleteFnfSettlement: () => ({ mutate: jest.fn(), isPending: false }),
}));

import { FnfPageClient } from "./fnf-page-client";

const EMPTY_COPY = "No full and final drafts on record";

describe("FnfPageClient — a failed settlements read shows an error, not an empty list", () => {
  it("renders the real shared ErrorState with a retry that refetches, under the page title", () => {
    const refetch = jest.fn();
    const error = new ApiError("Internal server error", 500);
    mockUseFnfSettlements.mockReturnValue({ data: undefined, isLoading: false, isError: true, error, refetch });
    mockUsePageState.mockReturnValue({ kind: "error", error });

    render(<FnfPageClient />);

    expect(mockUsePageState).toHaveBeenCalledWith({ permission: "hr:payroll:view", isLoading: false, isError: true, error });

    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Full and final draft");
    expect(screen.getByRole("alert")).toBeInTheDocument();
    expect(screen.getByText(getErrorMessage(error))).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /retry|try again/i }));
    expect(refetch).toHaveBeenCalled();
  });

  it("does not claim the tenant has no drafts on record when the read failed, naming the copy the page actually renders", () => {
    const error = new ApiError("Internal server error", 500);
    mockUseFnfSettlements.mockReturnValue({ data: undefined, isLoading: false, isError: true, error, refetch: jest.fn() });
    mockUsePageState.mockReturnValue({ kind: "error", error });

    render(<FnfPageClient />);

    expect(screen.queryByText(EMPTY_COPY)).toBeNull();
  });

  it("still shows the honest empty state when the read genuinely returns no drafts, which is the copy the error case above negates", () => {
    mockUseFnfSettlements.mockReturnValue({ data: [], isLoading: false, isError: false, error: null, refetch: jest.fn() });
    mockUsePageState.mockReturnValue({ kind: "ready" });

    render(<FnfPageClient />);

    expect(screen.getByText(EMPTY_COPY)).toBeInTheDocument();
    expect(screen.queryByRole("alert")).toBeNull();
  });
});
