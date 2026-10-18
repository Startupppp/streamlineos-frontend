import { render, screen } from "@testing-library/react";
import { TicketSidebar } from "./ticket-sidebar";

let mockDenied = false;

jest.mock("@/hooks/api/access", () => ({
  usePermissionGate: () => ({ denied: mockDenied }),
}));
jest.mock("@/hooks/api/build/epics", () => ({ useEpics: () => ({ data: [] }) }));
jest.mock("@/hooks/api/build/modules", () => ({ useModules: () => ({ data: [] }) }));
jest.mock("@/hooks/api/build/cycles", () => ({ useCycles: () => ({ data: [] }) }));
jest.mock("@/hooks/api/build/recurring", () => ({ useSetRecurrence: () => ({ mutate: jest.fn() }) }));
jest.mock("../tickets/label-picker", () => ({ LabelPicker: () => null, TicketLabelChip: () => null }));
jest.mock("../tickets/recurrence-picker", () => ({ RecurrencePicker: () => null }));
jest.mock("./sidebar-assignee-section", () => ({ SidebarAssigneeSection: () => null }));
jest.mock("./ticket-parent-control", () => ({ TicketParentControl: () => null }));
jest.mock("./ticket-customer-picker", () => ({ TicketCustomerPicker: () => null }));
jest.mock("./ticket-date-fields", () => ({ TicketDateFields: () => null }));
jest.mock("./ticket-sidebar-metadata", () => ({ TicketSidebarMetadata: () => null }));

const VIEW_ONLY_NOTE = /view only\. you can read these fields, but your role cannot change them\./i;

function renderSidebar(canUpdate: boolean) {
  return render(
    <TicketSidebar
      ticket={{ id: 7, version: 1, status: "TODO", priority: "LOW", type: "TASK" }}
      ticketId={7}
      projectId={3}
      onAutoSave={jest.fn()}
      canUpdate={canUpdate}
      canAssign={canUpdate}
    />,
  );
}

describe("ticket sidebar for a read-only member (RBAC UX round 1, item 4)", () => {
  it("says the disabled fields are view only when the role cannot update tickets", () => {
    mockDenied = true;
    renderSidebar(false);
    expect(screen.getByText(VIEW_ONLY_NOTE)).toBeInTheDocument();
    expect(screen.getByRole("combobox", { name: "Status" })).toBeDisabled();
  });

  it("shows no note to a member who can edit", () => {
    mockDenied = false;
    renderSidebar(true);
    expect(screen.queryByText(VIEW_ONLY_NOTE)).not.toBeInTheDocument();
    expect(screen.getByRole("combobox", { name: "Status" })).toBeEnabled();
  });
});
