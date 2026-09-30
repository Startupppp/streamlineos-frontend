jest.mock("@/hooks/api/access", () => ({
  useCan: () => false,
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
  InlineModule: () => null,
}));

jest.mock("./card-inline-date-fields", () => ({
  InlineDueDate: () => null,
  InlineStartDate: () => null,
}));

jest.mock("@/features/build/ticket-details/sidebar-select-fields", () => ({
  SidebarSelectFields: () => null,
}));

jest.mock("@/features/build/triage/triage-row", () => ({
  TriageRow: () => null,
}));

jest.mock("@/features/build/cycles/cycle-card", () => ({
  CycleCard: () => null,
}));

jest.mock("@/features/build/modules/module-card", () => ({
  ModuleCard: () => null,
}));

jest.mock("@/features/build/epics/epic-card", () => ({
  EpicCard: () => null,
}));

import { render, screen } from "@testing-library/react";
import { ExecutionCoreGallery } from "./execution-core-gallery";

describe("ExecutionCoreGallery — stub tickets reach KanbanTicketCard as a structurally checked KanbanTicket", () => {
  it("renders the kanban board scroll region", () => {
    render(<ExecutionCoreGallery />);
    expect(screen.getByRole("region", { name: "Kanban board" })).toBeInTheDocument();
  });

  it("renders each stub ticket title on the board — ticket data flows through without a type assertion", () => {
    render(<ExecutionCoreGallery />);
    expect(
      screen.getByText("Sync assignee avatar in real-time"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Debounce search on ticket board"),
    ).toBeInTheDocument();
  });
});
