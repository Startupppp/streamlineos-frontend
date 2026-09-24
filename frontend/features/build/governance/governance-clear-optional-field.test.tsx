import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { RiskFormSheet } from "./risk-form-sheet";
import { DecisionFormSheet } from "./decision-form-sheet";
import type { Risk, Decision } from "@/types/projects";

jest.mock("@/hooks/api/build/projects", () => ({
  useProject: () => ({ data: { key: "PRJ" } }),
}));

jest.mock("@/components/shared/dirty-state-context", () => ({
  useRegisterDirtyState: () => undefined,
}));

jest.mock("@/components/members/project-member-select", () => ({
  ProjectMemberSelect: ({ value, onChange }: { value?: string; onChange: (v?: string) => void }) => (
    <input aria-label="Owner" value={value ?? ""} onChange={(e) => onChange(e.target.value || undefined)} />
  ),
}));

jest.mock("@/features/build/shared/ticket-combobox", () => ({
  TicketCombobox: ({ value, onChange }: { value?: string; onChange: (v: string) => void }) => (
    <input aria-label="Linked ticket" value={value ?? ""} onChange={(e) => onChange(e.target.value)} />
  ),
}));

jest.mock("@/components/ui/date-picker", () => ({
  DatePicker: ({ value, onChange }: { value?: string; onChange: (v: string) => void }) => (
    <input data-testid="date-field" value={value ?? ""} onChange={(e) => onChange(e.target.value)} />
  ),
}));

const BASE_RISK: Risk = {
  id: 7,
  orgId: "org-1",
  projectId: 1,
  riskNumber: 3,
  title: "Vendor delay",
  description: "Vendor may slip the delivery date",
  probability: "medium",
  impact: "high",
  status: "open",
  ownerId: "user-1",
  mitigation: "Escalate weekly",
  linkedTicketId: 42,
  createdBy: null,
  deletedAt: null,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
};

const BASE_DECISION: Decision = {
  id: 9,
  orgId: "org-1",
  projectId: 1,
  decisionNumber: 2,
  title: "Adopt shared auth",
  context: "Multiple services duplicated login",
  decision: "Use the shared auth service",
  optionsConsidered: "Build local auth; use shared service",
  status: "accepted",
  ownerId: "user-1",
  decidedAt: "2026-01-05",
  revisitAt: "2026-06-01",
  linkedTicketId: 11,
  createdBy: null,
  deletedAt: null,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
};

describe("clearing an optional risk field sends null so the stored value is actually removed rather than silently retained", () => {
  it("clearing the risk description sends null, not an omitted key or an empty string", async () => {
    const onSubmitEdit = jest.fn();
    const user = userEvent.setup();
    render(
      <RiskFormSheet
        open
        onOpenChange={jest.fn()}
        mode="edit"
        defaultValues={BASE_RISK}
        onSubmitCreate={jest.fn()}
        onSubmitEdit={onSubmitEdit}
        projectId={1}
      />,
    );

    const description = await screen.findByLabelText("Description (optional)");
    await user.clear(description);
    await user.click(screen.getByRole("button", { name: "Save Changes" }));

    await waitFor(() => expect(onSubmitEdit).toHaveBeenCalledTimes(1));
    const payload = onSubmitEdit.mock.calls[0]?.[0];
    expect("description" in payload).toBe(true);
    expect(payload.description).toBeNull();
  });

  it("clearing the linked ticket sends null, never 0, for the numeric linkedTicketId field", async () => {
    const onSubmitEdit = jest.fn();
    const user = userEvent.setup();
    render(
      <RiskFormSheet
        open
        onOpenChange={jest.fn()}
        mode="edit"
        defaultValues={BASE_RISK}
        onSubmitCreate={jest.fn()}
        onSubmitEdit={onSubmitEdit}
        projectId={1}
      />,
    );

    const linkedTicket = await screen.findByLabelText("Linked ticket");
    await user.clear(linkedTicket);
    await user.click(screen.getByRole("button", { name: "Save Changes" }));

    await waitFor(() => expect(onSubmitEdit).toHaveBeenCalledTimes(1));
    const payload = onSubmitEdit.mock.calls[0]?.[0];
    expect(payload.linkedTicketId).toBeNull();
  });
});

describe("clearing an optional decision field sends null so the stored value is actually removed rather than silently retained", () => {
  it("clearing the decided-at date sends null, never an empty string or an Invalid Date", async () => {
    const onSubmitEdit = jest.fn();
    const user = userEvent.setup();
    render(
      <DecisionFormSheet
        open
        onOpenChange={jest.fn()}
        mode="edit"
        defaultValues={BASE_DECISION}
        onSubmitCreate={jest.fn()}
        onSubmitEdit={onSubmitEdit}
        projectId={1}
      />,
    );

    const dateFields = await screen.findAllByTestId("date-field");
    await user.clear(dateFields[0] as HTMLElement);
    await user.click(screen.getByRole("button", { name: "Save Changes" }));

    await waitFor(() => expect(onSubmitEdit).toHaveBeenCalledTimes(1));
    const payload = onSubmitEdit.mock.calls[0]?.[0];
    expect(payload.decidedAt).toBeNull();
    expect(payload.revisitAt).toBe(BASE_DECISION.revisitAt);
  });
});
