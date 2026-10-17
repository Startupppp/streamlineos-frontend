import { render, screen } from "@testing-library/react";
import { useForm } from "react-hook-form";
import { AutomationSheet } from "./automation-sheet";
import type { FormValues } from "./automation-schema";

jest.mock("@/hooks/api/build/custom-states", () => ({
  useCustomStates: () => ({ data: [{ id: 1, name: "Ready for customer acceptance" }] }),
}));

jest.mock("@/hooks/api/build/projects", () => ({
  useProjectMembers: () => ({
    data: {
      data: [
        {
          id: "member-1",
          name: "Alexandria Montgomery-Smith",
          email: "alexandria@example.test",
        },
      ],
    },
  }),
  useProjectLabels: () => ({ data: [{ id: 1, name: "Customer escalation follow-up" }] }),
}));

function AutomationSheetHarness() {
  const form = useForm<FormValues>({
    defaultValues: {
      name: "Readable automation",
      triggerEvent: "ticket.created",
      conditions: [
        { field: "status", operator: "not_equals", value: "Ready for customer acceptance" },
        { field: "label", operator: "is_not_empty" },
      ],
      actions: [{ type: "set_assignee", value: "member-1" }],
      isActive: true,
    },
  });

  return (
    <AutomationSheet
      open
      onOpenChange={() => {}}
      editingAutomation={null}
      form={form}
      conditionFields={[{ id: "condition-1" }, { id: "condition-2" }]}
      actionFields={[{ id: "action-1" }]}
      onAppendCondition={() => {}}
      onRemoveCondition={() => {}}
      onAppendAction={() => {}}
      onRemoveAction={() => {}}
      onSubmit={() => {}}
      onClose={() => {}}
      projectId={1}
      createIsPending={false}
      updateIsPending={false}
    />
  );
}

function getSelectTrigger(text: string): HTMLElement {
  const value = screen
    .getAllByText(text)
    .find((element) => element.getAttribute("data-slot") === "select-value");
  const trigger = value?.closest('[data-slot="select-trigger"]');
  if (!(trigger instanceof HTMLElement)) throw new Error(`No select trigger for ${text}`);
  return trigger;
}

describe("AutomationSheet responsive rule layout", () => {
  it("lets condition controls wrap and reserves readable widths for the operator and value", () => {
    render(<AutomationSheetHarness />);

    const statusField = getSelectTrigger("status");
    const operator = getSelectTrigger("is not empty");
    const statusValue = screen.getByRole("combobox", { name: "Select status…" });
    const row = statusField.parentElement;

    expect(row).toHaveClass("flex-wrap");
    expect(operator).toHaveClass("min-w-36");
    expect(operator).not.toHaveClass("w-28");
    expect(statusValue.parentElement).toHaveClass("min-w-48");
    expect(statusValue).toHaveClass("w-full");
    expect(statusValue).not.toHaveClass("w-28");
  });

  it("lets action controls wrap without collapsing long member names", () => {
    render(<AutomationSheetHarness />);

    const actionType = getSelectTrigger("Assign To");
    const member = screen.getByRole("combobox", { name: "Select member…" });
    const row = actionType.parentElement;

    expect(row).toHaveClass("flex-wrap");
    expect(member.parentElement).toHaveClass("min-w-64");
  });
});
