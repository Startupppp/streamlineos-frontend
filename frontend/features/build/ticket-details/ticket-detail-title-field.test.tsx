import { render, screen } from "@testing-library/react";
import type { Ticket } from "@/types/projects";
import { TicketDetailMainSection } from "./ticket-detail-main-section";

jest.mock("./ticket-subtasks", () => ({ TicketSubtasks: () => null }));
jest.mock("./ticket-relations", () => ({ TicketRelations: () => null }));
jest.mock("./activity-feed", () => ({ ActivityFeed: () => null }));
jest.mock("@/features/build/tickets/ticket-activity-log", () => ({
  TicketActivityLog: () => null,
}));
jest.mock("./ticket-checklists", () => ({ TicketChecklists: () => null }));
jest.mock("./ticket-custom-fields", () => ({ TicketCustomFields: () => null }));
jest.mock("./ticket-qa-evidence", () => ({ TicketQaEvidence: () => null }));
jest.mock("@/features/build/ai/ticket-detail-ai", () => ({
  TicketDetailAiDescription: () => null,
  TicketDetailAiActivityActions: () => null,
  useTicketDetailAi: () => ({}),
}));

const TICKET = {
  id: 1,
  ticketNumber: 7,
  title: "Checkout drops the coupon",
  status: "TODO",
  priority: "HIGH",
  type: "BUG",
  version: 2,
} as unknown as Ticket;

function renderSection(canUpdate: boolean) {
  return render(
    <TicketDetailMainSection
      ticket={TICKET}
      ticketId={1}
      projectId={3}
      projectKey="TEST"
      localTitle={TICKET.title}
      subtasks={[]}
      members={[]}
      onApplyDescription={jest.fn()}
      onTitleChange={jest.fn()}
      onDescriptionChange={jest.fn()}
      canUpdate={canUpdate}
    />,
  );
}

describe("Issue detail title — the core title field is on screen and follows the update gate", () => {
  it("renders the stored title in an editable control for a viewer who may update", () => {
    renderSection(true);
    const title = screen.getByPlaceholderText("Ticket title");
    expect(title).toHaveValue("Checkout drops the coupon");
    expect(title).not.toHaveAttribute("readonly");
  });

  it("still renders the title, read-only, for a viewer who may not update, so denial is not emptiness", () => {
    renderSection(false);
    const title = screen.getByPlaceholderText("Ticket title");
    expect(title).toHaveValue("Checkout drops the coupon");
    expect(title).toHaveAttribute("readonly");
  });
});
