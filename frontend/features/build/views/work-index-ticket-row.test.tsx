import { fireEvent, render, screen } from "@testing-library/react";
import { WorkIndexTicketRow } from "./work-index-ticket-row";
import type { Ticket } from "./list-view-shared";
import { DEFAULT_DISPLAY_OPTIONS } from "./display-options-model";

let mockCanUpdate = false;
let mockCanAssign = false;
jest.mock("@/hooks/api/access", () => ({ useCan: (permission: string) => permission === "build:tickets:update" ? mockCanUpdate : mockCanAssign }));
jest.mock("@/hooks/api/build/custom-states", () => ({ useCustomStates: () => ({ data: [] }) }));
jest.mock("./card-field-status", () => ({ InlineStatus: ({ projectId, version, currentStatus, compact }: { projectId: number; version: number; currentStatus: string; compact: boolean }) => <button type="button" data-project={projectId} data-version={version} data-compact={compact}>Change status: {currentStatus}</button> }));
jest.mock("./card-field-priority", () => ({ InlinePriority: () => <button type="button">Change priority</button> }));
jest.mock("./card-field-assignee", () => ({ InlineAssignee: () => <button type="button">Change assignee</button> }));
jest.mock("./card-inline-extra-fields", () => ({ InlineLabels: () => <button type="button">Edit labels</button>, InlineModule: () => <button type="button">Change module</button> }));
jest.mock("./card-inline-type-cycle", () => ({ InlineType: () => <button type="button">Change type</button> }));
jest.mock("./card-inline-date-fields", () => ({ InlineDueDate: () => <button type="button">Set due date</button> }));

const ticket: Ticket = {
  id: 7, version: 2, title: "Review the payment workflow", status: "CODE_REVIEW",
  type: "TASK", priority: "HIGH", ticketNumber: 12, dueDate: "2026-10-12",
  project: { id: 4, key: "PAY", name: "Payments" },
  assignee: { id: "member-1", firstName: "Asha", lastName: "Patel" },
};

describe("work index row", () => {
  beforeEach(() => { mockCanUpdate = false; mockCanAssign = false; });
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

  it("reuses inline editors with the ticket's project and concurrency version when permitted", () => {
    mockCanUpdate = true; mockCanAssign = true;
    render(<WorkIndexTicketRow ticket={ticket} onClick={jest.fn()} />);
    expect(screen.getByRole("button", { name: "Change status: CODE_REVIEW" })).toHaveAttribute("data-project", "4");
    expect(screen.getByRole("button", { name: "Change status: CODE_REVIEW" })).toHaveAttribute("data-version", "2");
    expect(screen.getByRole("button", { name: "Change status: CODE_REVIEW" })).toHaveAttribute("data-compact", "true");
    for (const name of ["Change priority", "Change assignee", "Edit labels", "Change type", "Set due date"]) expect(screen.getByRole("button", { name })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Change module" })).not.toBeInTheDocument();
    expect(screen.getByText("Payments")).toBeInTheDocument();
  });

  it("shows the existing module editor only when its current value is supplied", () => {
    mockCanUpdate = true;
    render(<WorkIndexTicketRow ticket={{ ...ticket, moduleId: 3 }} onClick={jest.fn()} />);
    expect(screen.getByRole("button", { name: "Change module" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Change assignee" })).not.toBeInTheDocument();
  });
});
