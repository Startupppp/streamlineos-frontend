import { fireEvent, render, screen } from "@testing-library/react";
import { WorkIndexTicketRow } from "./work-index-ticket-row";
import type { Ticket } from "./list-view-shared";
import { DEFAULT_DISPLAY_OPTIONS } from "./display-options-model";

const ticket: Ticket = {
  id: 7, version: 2, title: "Review the payment workflow", status: "CODE_REVIEW",
  type: "TASK", priority: "HIGH", ticketNumber: 12, dueDate: "2026-10-12",
  project: { id: 4, key: "PAY", name: "Payments" },
  assignee: { id: "member-1", firstName: "Asha", lastName: "Patel" },
};

describe("work index row", () => {
  it("keeps identity, project, priority, due date and assignee while encoding verbose status as an accessible icon", () => {
    render(<WorkIndexTicketRow ticket={ticket} onClick={jest.fn()} />);
    expect(screen.getByText("PAY-12")).toBeInTheDocument();
    expect(screen.getByText("Payments")).toBeInTheDocument();
    expect(screen.getByLabelText("Priority: HIGH")).toBeInTheDocument();
    expect(screen.getByLabelText(/^Due /)).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "Assignee: Asha Patel" })).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "Status: CODE REVIEW" })).toBeInTheDocument();
    expect(screen.queryByText("CODE REVIEW")).not.toBeInTheDocument();
  });

  it("opens the ticket and exposes no inline mutation buttons", () => {
    const onClick = jest.fn();
    render(<WorkIndexTicketRow ticket={ticket} onClick={onClick} />);
    expect(screen.getAllByRole("button")).toHaveLength(1);
    fireEvent.click(screen.getByRole("button", { name: `Open ${ticket.title}` }));
    expect(onClick).toHaveBeenCalledWith(7);
  });

  it("honors display preferences without hiding status or title", () => {
    render(<WorkIndexTicketRow ticket={ticket} onClick={jest.fn()} displayOptions={{ ...DEFAULT_DISPLAY_OPTIONS, showId: false, showPriority: false, showDueDate: false, showAssignee: false }} />);
    expect(screen.queryByText("PAY-12")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Priority: HIGH")).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/^Due /)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/^Assignee:/)).not.toBeInTheDocument();
    expect(screen.getByRole("img", { name: "Status: CODE REVIEW" })).toBeInTheDocument();
    expect(screen.getByText(ticket.title)).toBeInTheDocument();
  });
});
