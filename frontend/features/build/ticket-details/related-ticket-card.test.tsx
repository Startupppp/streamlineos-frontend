import { render, screen } from "@testing-library/react";
import { RelatedTicketCard } from "./related-ticket-card";

jest.mock("../views/card-field-assignee", () => ({
  InlineAssignee: () => <button type="button">Change assignee</button>,
}));
jest.mock("../views/card-field-priority", () => ({
  InlinePriority: () => <button type="button">Change priority</button>,
}));
jest.mock("../views/card-field-status", () => ({
  InlineStatus: () => <button type="button">Change status</button>,
}));

const TICKET = {
  id: 5,
  title: "Employee invitation email is not delivered after onboarding",
  status: "IN_PROGRESS",
  version: 4,
  priority: "HIGH",
  ticketNumber: 5,
  assigneeId: "member-1",
  projectId: 1,
  project: { key: "STRE" },
  assignee: { id: "member-1", name: "Ada Lovelace" },
};

describe("RelatedTicketCard", () => {
  it("keeps the relationship navigable while surfacing a structured ticket card", () => {
    render(
      <RelatedTicketCard
        ticket={TICKET}
        projectId={1}
        projectKey="STRE"
        projectStatuses={[]}
        canUpdate={false}
      />,
    );

    expect(screen.getByRole("link", { name: TICKET.title })).toHaveAttribute(
      "href",
      "/build/1/tickets/STRE-5",
    );
    expect(screen.getByText("STRE-5")).toBeInTheDocument();
    expect(screen.getByLabelText("Assigned to Ada Lovelace")).toBeInTheDocument();
  });

  it("retains only the existing update controls for members who can update", () => {
    render(
      <RelatedTicketCard
        ticket={TICKET}
        projectId={1}
        projectKey="STRE"
        projectStatuses={[]}
        canUpdate
        endAction={<button type="button">Remove relation</button>}
      />,
    );

    expect(screen.getByRole("button", { name: "Change status" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Change priority" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Change assignee" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Remove relation" })).toBeInTheDocument();
  });
});
