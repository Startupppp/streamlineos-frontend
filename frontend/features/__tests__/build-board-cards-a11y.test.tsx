import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expectNoAxeViolations } from "@/test-utils/axe";

jest.mock("@animateicons/react/lucide", () => ({
  Trash2Icon: ({ size: _s, ...rest }: { size?: number; [k: string]: unknown }) => (
    <svg aria-hidden="true" {...rest} />
  ),
  EllipsisIcon: ({ size: _s, ...rest }: { size?: number; [k: string]: unknown }) => (
    <svg aria-hidden="true" {...rest} />
  ),
}));

jest.mock("@/hooks/common/use-animated-icon", () => ({
  useAnimatedIcon: () => ({ iconRef: { current: null }, hoverHandlers: {} }),
}));

jest.mock("@/features/build/views/ticket-quick-actions", () => ({
  TicketQuickActions: () => (
    <button type="button" aria-label="Delete ticket">
      x
    </button>
  ),
}));

jest.mock("@/features/build/views/card-inline-fields", () => ({
  InlinePriority: () => <span>P2</span>,
  InlineAssignee: () => <span>AB</span>,
  InlineEstimate: () => <span>3</span>,
}));

jest.mock("@/features/build/views/card-inline-extra-fields", () => ({
  InlineType: () => <span>Task</span>,
  InlineLabels: () => <span>label</span>,
  InlineCycle: () => <span>Cycle 1</span>,
}));

jest.mock("@/features/build/views/card-inline-date-fields", () => ({
  InlineDueDate: () => <span>Sep 3</span>,
  InlineStartDate: () => <span>Sep 1</span>,
}));

import { KanbanTicketCard } from "@/features/build/views/kanban-ticket-card";

const ticket = {
  id: 7,
  title: "Widen the stock grain",
  status: "TODO",
  type: "TASK",
  ticketNumber: 12,
  points: 3,
};

/**
 * The kanban board is the surface the browser journey never reached, so it has
 * never been checked at all. These are the two claims that matter: a card is
 * operable without a mouse, and making it so did not nest one interactive
 * control inside another.
 */
describe("a kanban ticket card", () => {
  function renderCard(onSelect = jest.fn()) {
    return {
      onSelect,
      ...render(
        <KanbanTicketCard
          ticket={ticket}
          projectId={1}
          projectKey="ENG"
          onSelect={onSelect}
          isDragging={false}
        />,
      ),
    };
  }

  it("has no axe violations, and in particular nests no interactive controls", async () => {
    const { baseElement } = renderCard();
    await expectNoAxeViolations(baseElement);
  });

  it("opens the ticket from the keyboard", async () => {
    const { onSelect } = renderCard();
    const title = screen.getByRole("button", { name: ticket.title });
    title.focus();
    await userEvent.keyboard("{Enter}");
    expect(onSelect).toHaveBeenCalledWith(ticket.id);
  });

  it("puts the card's own action after the title in the tab order, not inside it", async () => {
    renderCard();
    await userEvent.tab();
    expect(screen.getByRole("button", { name: ticket.title })).toHaveFocus();
    await userEvent.tab();
    expect(screen.getByRole("button", { name: "Delete ticket" })).toHaveFocus();
  });

  it("BITE PROOF — the card itself must not claim to be a button while it holds one", () => {
    const { baseElement } = renderCard();
    const card = baseElement.querySelector(".group");
    expect(card).not.toBeNull();
    expect(card?.getAttribute("role")).toBeNull();
  });
});
