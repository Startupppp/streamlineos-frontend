import { fireEvent, render, screen, waitFor } from "@testing-library/react";

const mutate = jest.fn();
jest.mock("@/hooks/api/hr/termination", () => ({
  useRehireEmployee: () => ({ mutate, isPending: false }),
}));
// The org's business date, which can differ from the browser's.
jest.mock("@/hooks/api/org-display", () => ({ useOrgToday: () => "2026-10-18" }));
jest.mock("sonner", () => ({ toast: { success: jest.fn(), error: jest.fn() } }));

import { RehireEmployeeDialog } from "./rehire-employee-dialog";

describe("RehireEmployeeDialog", () => {
  it("rehires the named employee from the org's business date by default", async () => {
    render(
      <RehireEmployeeDialog
        open
        onOpenChange={jest.fn()}
        employeeUserId="user-9"
        employeeName="Amit Shah"
        onRehired={jest.fn()}
      />,
    );

    expect(screen.getByText("Rehire Amit Shah")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Rehire" }));

    await waitFor(() => expect(mutate).toHaveBeenCalledTimes(1));
    expect(mutate.mock.calls[0]?.[0]).toEqual({
      employeeUserId: "user-9",
      joiningDate: "2026-10-18",
    });
  });
});
