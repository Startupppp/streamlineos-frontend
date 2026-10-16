import { fireEvent, render, screen } from "@testing-library/react";

const mutate = jest.fn();
jest.mock("@/hooks/api/hr/termination", () => ({
  useArchiveEmployee: () => ({ mutate, isPending: false }),
}));
jest.mock("sonner", () => ({ toast: { success: jest.fn(), error: jest.fn() } }));

import { ArchiveEmployeeAction } from "./archive-employee-action";

describe("ArchiveEmployeeAction (NEW-7)", () => {
  it("archives only after the destructive confirm", () => {
    render(<ArchiveEmployeeAction employeeUserId="emp-1" employeeName="Amit Shah" onArchived={jest.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: "Archive employee" }));
    expect(mutate).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Archive employee" }));
    expect(mutate).toHaveBeenCalledWith({ employeeUserId: "emp-1" }, expect.anything());
  });
});
