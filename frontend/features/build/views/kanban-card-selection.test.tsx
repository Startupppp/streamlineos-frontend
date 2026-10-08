import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

jest.mock("@/hooks/api/access", () => ({
  useCan: () => true,
}));

jest.mock("./ticket-quick-actions", () => ({
  TicketQuickActions: ({ open }: { open?: boolean }) =>
    open ? <div data-testid="card-menu-open" /> : null,
}));

jest.mock("./card-field-priority", () => ({ InlinePriority: () => null }));
jest.mock("./card-field-assignee", () => ({ InlineAssignee: () => null }));
jest.mock("./card-field-estimate", () => ({ InlineEstimate: () => null }));

jest.mock("./card-inline-type-cycle", () => ({
  InlineType: () => null,
  InlineCycle: () => null,
}));

jest.mock("./card-inline-extra-fields", () => ({
  InlineLabels: () => null,
  InlineModule: ({ currentModuleId }: { currentModuleId?: number | null }) => (
    <span>module-editor-{currentModuleId ?? "none"}</span>
  ),
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
  it("uses the shared compact card frame so every Kanban board has the same visual hierarchy", () => {
    renderCard();

    const title = screen.getByRole("button", { name: /Fix the broken import/i });
    const card = title.closest("[data-testid='kanban-ticket-card']");
    const footer = screen.getByTestId("kanban-ticket-card-footer");

    expect(card).toHaveClass("overflow-hidden", "bg-gradient-to-br");
    expect(footer).toHaveClass("border-t", "pt-2");
  });

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
  it("read-only cards expose no module editor or action menu even when permissions permit editing", () => {
    renderCard({ readOnly: true });
    expect(screen.queryByText("module-editor-none")).not.toBeInTheDocument();
    expect(screen.getByText("Unassigned")).toBeInTheDocument();
    const card = screen.getByText(ticket.title).closest("div");
    if (card === null) throw new Error("the kanban card rendered nothing");
    expect(fireEvent.contextMenu(card)).toBe(true);
    expect(screen.queryByTestId("card-menu-open")).not.toBeInTheDocument();
  });

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

describe("KanbanTicketCard — module editing", () => {
  it("wires the current module into the inline editor", () => {
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
    expect(screen.getByText("module-editor-3")).toBeInTheDocument();
  });

  it("keeps the inline editor available when the card has no module", () => {
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
    expect(screen.getByText("module-editor-none")).toBeInTheDocument();
  });
});
