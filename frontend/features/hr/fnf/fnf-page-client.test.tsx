import type { ReactNode } from "react";
import { fireEvent, render, screen } from "@testing-library/react";

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

jest.mock("@/components/shared/page-state", () => ({
  PageState: ({ resolution, loading, children, onRetry }: { resolution: { kind: string; error?: unknown }; loading: ReactNode; children: ReactNode; onRetry?: () => void }) => {
    if (resolution.kind === "loading") return <>{loading}</>;
    if (resolution.kind === "error")
      return (
        <div role="alert">
          Couldn&apos;t load final settlements <button type="button" onClick={onRetry}>Retry</button>
        </div>
      );
    return <>{children}</>;
  },
}));

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

describe("FnfPageClient — a failed settlements read shows an error, not an empty list", () => {
  it("renders the shared error state with a retry that refetches, under the Final settlement title", () => {
    const refetch = jest.fn();
    const error = new Error("upstream down");
    mockUseFnfSettlements.mockReturnValue({ data: undefined, isLoading: false, isError: true, error, refetch });
    mockUsePageState.mockReturnValue({ kind: "error", error });

    render(<FnfPageClient />);

    expect(mockUsePageState).toHaveBeenCalledWith({ permission: "hr:payroll:view", isLoading: false, isError: true, error });

    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Final settlement");
    expect(screen.getByText("Couldn't load final settlements")).toBeInTheDocument();
    expect(screen.queryByText("No final settlements on record")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /retry|try again/i }));
    expect(refetch).toHaveBeenCalled();
  });
});
