import { render, screen, fireEvent } from "@testing-library/react";

let dryRunMutate: jest.Mock;
let dryRunIsPending = false;

jest.mock("@/hooks/api/build/custom-states", () => ({
  useCustomStates: () => ({
    data: [
      { id: "s1", name: "TODO" },
      { id: "s2", name: "IN_PROGRESS" },
    ],
  }),
}));

jest.mock("@/hooks/api/build/automations", () => ({
  useAutomationDryRun: () => ({
    mutate: dryRunMutate,
    isPending: dryRunIsPending,
  }),
  ACTION_TYPES: [
    { value: "set_status", label: "Set Status" },
    { value: "set_assignee", label: "Assign To" },
  ],
  TRIGGER_EVENTS: [
    { value: "ticket.created", label: "Ticket Created" },
    { value: "ticket.updated", label: "Ticket Updated" },
  ],
}));

jest.mock("./automation-value-input", () => ({
  PRIORITY_OPTIONS: [
    { value: "LOW", label: "Low" },
    { value: "HIGH", label: "High" },
  ],
  TICKET_TYPE_OPTIONS: [
    { value: "TASK", label: "Task" },
    { value: "BUG", label: "Bug" },
  ],
}));

import { AutomationDryRunPanel } from "./automation-dry-run-panel";

function renderPanel() {
  return render(
    <AutomationDryRunPanel
      projectId={10}
      automationId={42}
      triggerEvent="ticket.created"
    />,
  );
}

beforeEach(() => {
  dryRunMutate = jest.fn();
  dryRunIsPending = false;
});

describe("AutomationDryRunPanel", () => {
  it("renders the trigger label and test button", () => {
    renderPanel();
    expect(screen.getByText(/Ticket Created/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Run dry-run test" })).toBeInTheDocument();
  });

  it("calls dryRun.mutate with triggerEvent and an empty ticket when no fields are selected", () => {
    renderPanel();
    fireEvent.click(screen.getByRole("button", { name: "Run dry-run test" }));
    expect(dryRunMutate).toHaveBeenCalledWith(
      expect.objectContaining({
        triggerEvent: "ticket.created",
        ticket: {},
      }),
      expect.any(Object),
    );
  });

  it("does not include orgId or projectId in the ticket payload — BE-32/BE-92", () => {
    renderPanel();
    fireEvent.click(screen.getByRole("button", { name: "Run dry-run test" }));
    const [payload] = dryRunMutate.mock.calls[0] as [{ ticket: Record<string, unknown> }, unknown];
    expect(payload.ticket).not.toHaveProperty("orgId");
    expect(payload.ticket).not.toHaveProperty("projectId");
  });

  it("disables the button while a run is in flight", () => {
    dryRunIsPending = true;
    renderPanel();
    expect(screen.getByRole("button", { name: "Run dry-run test" })).toBeDisabled();
  });
});
