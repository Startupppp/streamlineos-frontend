import { fireEvent, render, screen } from "@testing-library/react";
import type { ComponentProps, ReactNode } from "react";
import type { AutomationRule } from "@/hooks/api/automations";
import { AutomationBuilderSheet } from "@/components/automations/automation-builder-sheet";
import { SupportAutomationsSettings } from "./support-automations-settings";

const mockRule: AutomationRule = {
  id: 8, name: "Support rule", description: null, triggerEvent: "ticket.created",
  conditions: [], actions: [], isEnabled: true, runCount: 0, lastRunAt: null,
  createdAt: "2026-09-10T00:00:00.000Z", updatedAt: "2026-09-10T00:00:00.000Z",
};
const mockMutation = { mutate: jest.fn(), isPending: false };

jest.mock("@/hooks/api/access/org-modules", () => ({ useEnabledModules: () => ["HELPDESK"] }));
jest.mock("@/hooks/api/support-automations", () => ({
  useSupportAutomations: () => ({ data: { data: [mockRule] }, isLoading: false, isError: false }),
  useToggleSupportAutomation: () => mockMutation,
  useDeleteSupportAutomation: () => mockMutation,
  useCreateSupportAutomation: () => mockMutation,
  useUpdateSupportAutomation: () => mockMutation,
  useTestSupportAutomation: () => mockMutation,
}));
jest.mock("@/components/ui/page-wrapper", () => ({
  PageWrapper: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));
jest.mock("@/components/ui/animated-icon-button", () => ({
  AnimatedIconButton: ({ children, onClick }: { children: ReactNode; onClick: () => void }) => <button onClick={onClick}>{children}</button>,
}));
jest.mock("@/components/automations/automation-settings-cards", () => ({
  AutomationCardItem: ({ rule, onEdit }: { rule: AutomationRule; onEdit: (rule: AutomationRule) => void }) => {
    function handleEdit() { onEdit(rule); }
    return <button onClick={handleEdit}>Edit rule</button>;
  },
  ModuleDisabledCard: () => <div>Module disabled</div>,
}));
jest.mock("@/components/automations/automation-builder-sheet", () => ({
  AutomationBuilderSheet: jest.fn(() => <div>Automation editor</div>),
}));
jest.mock("./support-automation-runs-dialog", () => ({ SupportAutomationRunsDialog: () => null }));
jest.mock("@/components/illustrations", () => ({ EmptyActivityIllustration: () => null }));
jest.mock("@animateicons/react/lucide", () => ({ PlusIcon: () => null }));

describe("Support automation editor ownership", () => {
  beforeEach(() => jest.clearAllMocks());

  it.each(["New Rule", "Edit rule"])("only offers Support triggers when opening %s", (button) => {
    render(<SupportAutomationsSettings />);
    fireEvent.click(screen.getByRole("button", { name: button }));
    expect(screen.getByText("Automation editor")).toBeInTheDocument();
    const call = jest.mocked(AutomationBuilderSheet).mock.calls[0];
    const props: ComponentProps<typeof AutomationBuilderSheet> = call[0];
    expect(props.triggerOptions?.length).toBeGreaterThan(0);
    expect(props.triggerOptions?.every((trigger) => trigger.module === "support")).toBe(true);
    expect(props.triggerOptions?.every((trigger) => trigger.value.startsWith("ticket."))).toBe(true);
    expect(props.create).toBe(mockMutation);
    expect(props.update).toBe(mockMutation);
    expect(props.test).toBe(mockMutation);
  });
});
