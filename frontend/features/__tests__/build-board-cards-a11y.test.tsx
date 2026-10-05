import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expectNoAxeViolations } from "@/test-utils/axe";

jest.mock("@animateicons/react/lucide", () => ({
  EllipsisIcon: ({ size: _s, ...rest }: { size?: number; [k: string]: unknown }) => (
    <svg aria-hidden="true" {...rest} />
  ),
}));

jest.mock("@/hooks/api/access", () => ({
  useCan: () => true,
}));

jest.mock("@/hooks/common/use-animated-icon", () => ({
  useAnimatedIcon: () => ({ iconRef: { current: null }, hoverHandlers: {} }),
}));

jest.mock("@/features/build/views/ticket-quick-actions", () => ({
  TicketQuickActions: ({ open, className }: { open?: boolean; className?: string }) => (
    <>
      <button type="button" aria-label="Ticket actions" className={className}>
        x
      </button>
      {open ? (
        <div role="menu" aria-label="Ticket actions">
          <button type="button" role="menuitem">
            Archive
          </button>
        </div>
      ) : null}
    </>
  ),
}));

jest.mock("@/features/build/views/card-field-priority", () => ({ InlinePriority: () => <span>P2</span> }));
jest.mock("@/features/build/views/card-field-assignee", () => ({ InlineAssignee: () => <span>AB</span> }));
jest.mock("@/features/build/views/card-field-estimate", () => ({ InlineEstimate: () => <span>3</span> }));

jest.mock("@/features/build/views/card-inline-extra-fields", () => ({
  InlineType: () => <span>Task</span>,
  InlineLabels: () => <span>label</span>,
  InlineCycle: () => <span>Cycle 1</span>,
  InlineModule: () => <span>Module</span>,
}));

jest.mock("@/features/build/views/card-inline-date-fields", () => ({
  InlineDueDate: () => <span>Sep 3</span>,
  InlineStartDate: () => <span>Sep 1</span>,
}));

import { KanbanTicketCard } from "@/features/build/views/kanban-ticket-card";
import { ModuleNamesProvider } from "@/features/build/views/module-names-context";

const ticket = {
  id: 7,
  title: "Widen the stock grain",
  status: "TODO",
  type: "TASK",
  ticketNumber: 12,
  points: 3,
  version: 4,
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
    expect(screen.getByRole("button", { name: "Ticket actions" })).toHaveFocus();
  });

  it("keeps ticket actions visible at narrow viewports where hover is unavailable", () => {
    renderCard();
    expect(screen.getByRole("button", { name: "Ticket actions" })).toHaveClass(
      "opacity-100",
      "sm:opacity-0",
    );
  });

  it("names the card's own action for what it opens, a menu, and not for one command inside it", () => {
    renderCard();
    expect(screen.getByRole("button", { name: "Ticket actions" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Delete ticket" })).not.toBeInTheDocument();
  });

  it("opens that menu on a right click without adding a focus stop before the title", async () => {
    const { baseElement } = renderCard();
    const card = baseElement.querySelector(".group");
    expect(card).not.toBeNull();
    if (card === null) return;

    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
    fireEvent.contextMenu(card);

    expect(screen.getByRole("menu")).toBeInTheDocument();
    await userEvent.tab();
    expect(screen.getByRole("button", { name: ticket.title })).toHaveFocus();
  });

  it("has no axe violations with that menu open either", async () => {
    const { baseElement } = renderCard();
    const card = baseElement.querySelector(".group");
    if (card === null) throw new Error("the card rendered nothing");
    fireEvent.contextMenu(card);
    await expectNoAxeViolations(baseElement);
  });

  it("leaves the module chip non-interactive, so the card's only controls stay the title and its menu", () => {
    const { baseElement } = render(
      <ModuleNamesProvider modules={[{ id: 3, name: "Payments" }]}>
        <KanbanTicketCard
          ticket={{ ...ticket, moduleId: 3 }}
          projectKey="ENG"
          onSelect={jest.fn()}
          isDragging={false}
        />
      </ModuleNamesProvider>,
    );
    expect(screen.getByText("Payments")).toBeInTheDocument();
    expect(screen.getAllByRole("button")).toHaveLength(2);
    expect(baseElement.querySelectorAll("a")).toHaveLength(0);
  });

  it("BITE PROOF — the card itself must not claim to be a button while it holds one", () => {
    const { baseElement } = renderCard();
    const card = baseElement.querySelector(".group");
    expect(card).not.toBeNull();
    expect(card?.getAttribute("role")).toBeNull();
  });
});
