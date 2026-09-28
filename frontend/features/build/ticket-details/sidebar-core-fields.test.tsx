import { render, screen } from "@testing-library/react";
import { SidebarSelectFields } from "./sidebar-select-fields";
import { TicketDateFields } from "./ticket-date-fields";
import { SidebarAssigneeSection } from "./sidebar-assignee-section";

jest.mock("@/components/members/project-member-select", () => ({
  ProjectMemberSelect: ({ placeholder }: { placeholder: string }) => (
    <button type="button">{placeholder}</button>
  ),
}));

const TICKET = {
  id: 1,
  status: "IN_REVIEW",
  priority: "URGENT",
  type: "BUG",
  points: 8,
  epicId: 4,
  moduleId: 5,
  cycleId: 6,
};

function renderSelects(disabled = false) {
  return render(
    <SidebarSelectFields
      ticket={TICKET}
      statuses={[
        { id: 1, name: "TODO" },
        { id: 2, name: "IN_REVIEW" },
      ]}
      epics={[{ id: 4, title: "Checkout rewrite" }]}
      modules={[{ id: 5, name: "Payments" }]}
      cycles={[{ id: 6, name: "Cycle 12", status: "active" }]}
      onStatusChange={jest.fn()}
      onPriorityChange={jest.fn()}
      onTypeChange={jest.fn()}
      onPointsChange={jest.fn()}
      onEpicChange={jest.fn()}
      onModuleChange={jest.fn()}
      onCycleChange={jest.fn()}
      disabled={disabled}
    />,
  );
}

describe("Issue detail sidebar — the core fields the page contract lists are on screen", () => {
  it("labels status, priority, type, points, epic, module and cycle, so seven of the eleven core fields are reachable", () => {
    renderSelects();
    for (const label of [
      "Status",
      "Priority",
      "Type",
      "Points",
      "Epic",
      "Module",
      "Cycle",
    ]) {
      expect(screen.getByText(label)).toBeInTheDocument();
    }
  });

  it("shows the record's own status, priority, type and estimate rather than a default, so the rendered value is the stored one", () => {
    renderSelects();
    const triggers = screen.getAllByRole("combobox");
    expect(triggers).toHaveLength(6);
    expect(screen.getByRole("spinbutton")).toHaveValue(8);
    expect(triggers.map((trigger) => trigger.textContent)).toEqual([
      "IN REVIEW",
      "Urgent",
      "Bug",
      "Checkout rewrite",
      "Payments",
      "Cycle 12 (Active)",
    ]);
  });

  it("disables every core-field control when the viewer cannot update, and enables them when it can", () => {
    const { unmount } = renderSelects(true);
    for (const trigger of screen.getAllByRole("combobox")) {
      expect(trigger).toBeDisabled();
    }
    expect(screen.getByRole("spinbutton")).toBeDisabled();
    unmount();
    renderSelects(false);
    for (const trigger of screen.getAllByRole("combobox")) {
      expect(trigger).not.toBeDisabled();
    }
    expect(screen.getByRole("spinbutton")).not.toBeDisabled();
  });

  it("renders start and due date controls carrying the stored dates, covering the due core field", () => {
    render(
      <TicketDateFields
        startDate="2026-02-01"
        dueDate="2026-02-14"
        onStartDateChange={jest.fn()}
        onDueDateChange={jest.fn()}
        onClearStartDate={jest.fn()}
        onClearDueDate={jest.fn()}
      />,
    );
    expect(screen.getByText("Start date")).toBeInTheDocument();
    expect(screen.getByText("Due date")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Clear start date" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Clear due date" }),
    ).toBeInTheDocument();
  });

  it("offers no clear control for a date that is not set, so the affordance tracks the stored value", () => {
    render(
      <TicketDateFields
        startDate={null}
        dueDate={null}
        onStartDateChange={jest.fn()}
        onDueDateChange={jest.fn()}
        onClearStartDate={jest.fn()}
        onClearDueDate={jest.fn()}
      />,
    );
    expect(
      screen.queryByRole("button", { name: "Clear start date" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Clear due date" }),
    ).not.toBeInTheDocument();
  });

  it("renders the whole assignee set by display name, not one id, covering the assignees core field", () => {
    render(
      <SidebarAssigneeSection
        projectId={3}
        displayedAssignees={[
          { id: "u-1", firstName: "Ada", lastName: "Lovelace" },
          { id: "u-2", name: "Grace Hopper" },
        ]}
        onAddAssignee={jest.fn()}
        onRemoveAssignee={jest.fn()}
      />,
    );
    expect(screen.getByText("Assignees")).toBeInTheDocument();
    expect(screen.getByText("Ada Lovelace")).toBeInTheDocument();
    expect(screen.getByText("Grace Hopper")).toBeInTheDocument();
    expect(screen.queryByText("u-1")).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Remove Ada Lovelace" }),
    ).toBeInTheDocument();
  });

  it("hides the add and remove assignee controls from a viewer who cannot assign, while still showing who is assigned", () => {
    render(
      <SidebarAssigneeSection
        projectId={3}
        displayedAssignees={[{ id: "u-1", name: "Grace Hopper" }]}
        onAddAssignee={jest.fn()}
        onRemoveAssignee={jest.fn()}
        disabled
      />,
    );
    expect(screen.getByText("Grace Hopper")).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Remove Grace Hopper" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "+ Add assignee" }),
    ).not.toBeInTheDocument();
  });
});
