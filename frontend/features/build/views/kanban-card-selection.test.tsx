import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

jest.mock("@/hooks/api/access", () => ({
  useCan: () => true,
}));

jest.mock("./ticket-quick-actions", () => ({
  TicketQuickActions: ({ open }: { open?: boolean }) =>
    open ? <div data-testid="card-menu-open" /> : null,
}));

jest.mock("./card-inline-fields", () => ({
  InlinePriority: () => null,
  InlineAssignee: () => null,
  InlineEstimate: () => null,
}));

jest.mock("./card-inline-extra-fields", () => ({
  InlineType: () => null,
  InlineLabels: () => null,
  InlineCycle: () => null,
}));

jest.mock("./card-inline-date-fields", () => ({
  InlineDueDate: () => null,
  InlineStartDate: () => null,
}));

import { KanbanTicketCard } from "./kanban-ticket-card";
import { ModuleNamesProvider } from "./module-names-context";
import type { KanbanTicket } from "../shared/types";

const ticket = {
  id: 7,
  title: "Fix the broken import",
  ticketNumber: 12,
  status: "TODO",
} as unknown as KanbanTicket;

function renderCard(overrides: Record<string, unknown> = {}) {
  const onSelect = jest.fn();
  const onSelectedChange = jest.fn();
  render(
    <KanbanTicketCard
      ticket={ticket}
      projectId={1}
      projectKey="P1"
      isDragging={false}
      onSelect={onSelect}
      {...overrides}
    />,
  );
  return { onSelect, onSelectedChange };
}

describe("KanbanTicketCard — selection does not cost navigation", () => {
  it("opens the ticket when the title is clicked while selection is active", async () => {
    const onSelectedChange = jest.fn();
    const onSelect = jest.fn();
    render(
      <KanbanTicketCard
        ticket={ticket}
        projectId={1}
        projectKey="P1"
        isDragging={false}
        onSelect={onSelect}
        isSelected={false}
        onSelectedChange={onSelectedChange}
      />,
    );

    await userEvent.click(screen.getByRole("button", { name: /Fix the broken import/i }));

    expect(onSelect).toHaveBeenCalledWith(7);
    expect(onSelectedChange).not.toHaveBeenCalled();
  });

  it("opens the ticket when the title is clicked and no selection is wired", async () => {
    const { onSelect } = renderCard();

    await userEvent.click(screen.getByRole("button", { name: /Fix the broken import/i }));

    expect(onSelect).toHaveBeenCalledWith(7);
  });

  it("does not bubble title activation into the draggable row", async () => {
    const onSelect = jest.fn();
    function handleOuterClick() {
      onSelect(ticket.id);
    }
    render(
      <div onClick={handleOuterClick}>
        <KanbanTicketCard
          ticket={ticket}
          projectId={1}
          projectKey="P1"
          isDragging={false}
          onSelect={onSelect}
        />
      </div>,
    );

    await userEvent.click(screen.getByRole("button", { name: /Fix the broken import/i }));

    expect(onSelect).toHaveBeenCalledTimes(1);
  });

  it("checking the card checkbox selects it without opening the ticket", async () => {
    const onSelectedChange = jest.fn();
    const onSelect = jest.fn();
    render(
      <KanbanTicketCard
        ticket={ticket}
        projectId={1}
        projectKey="P1"
        isDragging={false}
        onSelect={onSelect}
        isSelected={false}
        onSelectedChange={onSelectedChange}
      />,
    );

    await userEvent.click(screen.getByRole("checkbox", { name: /Select Fix the broken import/i }));

    expect(onSelectedChange).toHaveBeenCalledWith(7, true);
    expect(onSelect).not.toHaveBeenCalled();
  });

  it("unchecking a selected card deselects it", async () => {
    const onSelectedChange = jest.fn();
    render(
      <KanbanTicketCard
        ticket={ticket}
        projectId={1}
        projectKey="P1"
        isDragging={false}
        onSelect={jest.fn()}
        isSelected
        onSelectedChange={onSelectedChange}
      />,
    );

    await userEvent.click(screen.getByRole("checkbox", { name: /Select Fix the broken import/i }));

    expect(onSelectedChange).toHaveBeenCalledWith(7, false);
  });

  it("renders a labelled checkbox when selection is wired", () => {
    renderCard({ isSelected: false, onSelectedChange: jest.fn() });

    expect(
      screen.getByRole("checkbox", { name: /Select Fix the broken import/i }),
    ).toBeInTheDocument();
  });

  it("exposes selected state for durable visual styling", () => {
    renderCard({
      isSelected: true,
      onSelectedChange: jest.fn(),
    });

    expect(screen.getByRole("checkbox")).toBeChecked();
    expect(screen.getByRole("checkbox").closest("[data-selected='true']")).not.toBeNull();
  });

  it("renders no checkbox for a caller that wires no selection", () => {
    renderCard();

    expect(screen.queryByRole("checkbox")).not.toBeInTheDocument();
  });
});

describe("KanbanTicketCard — right click opens the card's own action menu", () => {
  it("keeps the menu closed until the card is right clicked", () => {
    renderCard();
    expect(screen.queryByTestId("card-menu-open")).toBeNull();
  });

  it("opens the menu on contextmenu and suppresses the browser menu", () => {
    renderCard();
    const card = screen.getByText(ticket.title).closest("div");
    if (card === null) throw new Error("the kanban card rendered nothing");
    const notPrevented = fireEvent.contextMenu(card);
    expect(notPrevented).toBe(false);
    expect(screen.getByTestId("card-menu-open")).toBeInTheDocument();
  });
});

describe("KanbanTicketCard — the module renders by name", () => {
  it("shows the module name when the board knows it", () => {
    render(
      <ModuleNamesProvider modules={[{ id: 3, name: "Payments" }]}>
        <KanbanTicketCard
          ticket={{ ...ticket, moduleId: 3 }}
          projectId={1}
          projectKey="P1"
          isDragging={false}
          onSelect={jest.fn()}
        />
      </ModuleNamesProvider>,
    );
    expect(screen.getByText("Payments")).toBeInTheDocument();
  });

  it("shows no module chip when the card has no module, so the chip tracks the field", () => {
    render(
      <ModuleNamesProvider modules={[{ id: 3, name: "Payments" }]}>
        <KanbanTicketCard
          ticket={ticket}
          projectId={1}
          projectKey="P1"
          isDragging={false}
          onSelect={jest.fn()}
        />
      </ModuleNamesProvider>,
    );
    expect(screen.queryByText("Payments")).not.toBeInTheDocument();
  });
});
