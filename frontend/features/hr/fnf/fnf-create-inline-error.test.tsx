import type { ReactNode } from "react";
import { fireEvent, render, screen } from "@testing-library/react";

const toastError = jest.fn();
jest.mock("sonner", () => ({ toast: { error: (m: string) => toastError(m), success: jest.fn() } }));

jest.mock("@/components/ui/page-wrapper", () => ({
  PageWrapper: ({ title, children, actions }: { title: ReactNode; children: ReactNode; actions?: ReactNode }) => (
    <div>
      <h1>{title}</h1>
      {actions}
      {children}
    </div>
  ),
}));

jest.mock("@/features/hr/shared/employee-picker", () => ({
  EmployeePicker: ({ onChange }: { onChange: (id: string) => void }) => (
    <button type="button" onClick={() => onChange("user_1")}>
      pick employee
    </button>
  ),
}));

jest.mock("@/components/shared/hr-sheet", () => ({
  HrSheet: ({
    open,
    children,
    onSubmit,
    submitLabel,
  }: {
    open: boolean;
    children: ReactNode;
    onSubmit?: () => void;
    submitLabel?: ReactNode;
  }) =>
    open ? (
      <div>
        {children}
        <button type="button" onClick={onSubmit}>
          {submitLabel}
        </button>
      </div>
    ) : null,
}));

jest.mock("@/components/ui/confirm-sheet", () => ({ ConfirmSheet: () => null }));
jest.mock("./fnf-suggestion-panel", () => ({ FnfSuggestionPanel: () => null }));
jest.mock("@/hooks/api/access", () => ({ useCan: () => true }));
jest.mock("@/hooks/api/org-display", () => ({ useOrgDisplay: () => ({ currency: "INR", locale: "en-IN" }) }));
jest.mock("@/hooks/api/use-page-state", () => ({ usePageState: () => ({ kind: "ready" }) }));

const createMutate = jest.fn();
jest.mock("@/hooks/api/hr/fnf", () => ({
  useFnfSettlements: () => ({ data: [], isLoading: false, isError: false, error: null, refetch: jest.fn() }),
  useCreateFnfSettlement: () => ({ mutate: createMutate, isPending: false }),
  useCompleteFnfSettlement: () => ({ mutate: jest.fn(), isPending: false }),
}));

import { FnfPageClient } from "./fnf-page-client";

function openCreateDrawer() {
  render(<FnfPageClient />);
  fireEvent.click(screen.getByRole("button", { name: "Create draft" }));
}

beforeEach(() => {
  toastError.mockReset();
  createMutate.mockReset();
});

describe("the full and final draft drawer says what is missing inside the drawer", () => {
  it("renders a field-level error beside the employee picker on a blank submit, not only a toast", () => {
    openCreateDrawer();

    fireEvent.click(screen.getByRole("button", { name: "Create settlement" }));

    const message = screen.getByRole("alert");
    expect(message).toHaveTextContent("Employee is required");
    expect(createMutate).not.toHaveBeenCalled();
  });

  it("clears the error once an employee is chosen and then submits", () => {
    openCreateDrawer();

    fireEvent.click(screen.getByRole("button", { name: "Create settlement" }));
    expect(screen.getByRole("alert")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "pick employee" }));
    expect(screen.queryByRole("alert")).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "Create settlement" }));
    expect(createMutate).toHaveBeenCalled();
  });
});
