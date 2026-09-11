import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ApprovalTabFilter } from "./approval-tab-filter";

describe("approval status tablist", () => {
  it("exposes the three statuses as tabs with the active one selected", () => {
    render(<ApprovalTabFilter value="SUBMITTED" onChange={jest.fn()} />);

    expect(screen.getByRole("tablist", { name: "Approval status" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Pending" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    expect(screen.getByRole("tab", { name: "Approved" })).toHaveAttribute(
      "aria-selected",
      "false",
    );
  });

  it("takes one tab stop for the group, not one per status", () => {
    render(<ApprovalTabFilter value="APPROVED" onChange={jest.fn()} />);

    expect(screen.getByRole("tab", { name: "Approved" })).toHaveAttribute(
      "tabindex",
      "0",
    );
    expect(screen.getByRole("tab", { name: "Pending" })).toHaveAttribute(
      "tabindex",
      "-1",
    );
    expect(screen.getByRole("tab", { name: "Rejected" })).toHaveAttribute(
      "tabindex",
      "-1",
    );
  });

  it("moves through the statuses with the arrow keys, wrapping at the ends", async () => {
    const user = userEvent.setup();
    const onChange = jest.fn();
    render(<ApprovalTabFilter value="SUBMITTED" onChange={onChange} />);

    screen.getByRole("tab", { name: "Pending" }).focus();
    await user.keyboard("{ArrowRight}");
    expect(onChange).toHaveBeenLastCalledWith("APPROVED");

    await user.keyboard("{ArrowLeft}");
    expect(onChange).toHaveBeenLastCalledWith("REJECTED");

    await user.keyboard("{End}");
    expect(onChange).toHaveBeenLastCalledWith("REJECTED");

    await user.keyboard("{Home}");
    expect(onChange).toHaveBeenLastCalledWith("SUBMITTED");
  });

  it("points each tab at the panel it controls", () => {
    render(<ApprovalTabFilter value="REJECTED" onChange={jest.fn()} />);

    for (const name of ["Pending", "Approved", "Rejected"]) {
      expect(screen.getByRole("tab", { name })).toHaveAttribute(
        "aria-controls",
        "approvals-tabpanel",
      );
    }
  });

  it("selects a status on click", async () => {
    const user = userEvent.setup();
    const onChange = jest.fn();
    render(<ApprovalTabFilter value="SUBMITTED" onChange={onChange} />);

    await user.click(screen.getByRole("tab", { name: "Rejected" }));
    expect(onChange).toHaveBeenCalledWith("REJECTED");
  });
});
