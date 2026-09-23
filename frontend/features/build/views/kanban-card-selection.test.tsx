import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

jest.mock("@/hooks/api/access", () => ({
  useCan: () => true,
}));

jest.mock("./ticket-quick-actions", () => ({
  TicketQuickActions: () => null,
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

  it("renders no checkbox for a caller that wires no selection", () => {
    renderCard();

    expect(screen.queryByRole("checkbox")).not.toBeInTheDocument();
  });
});
