import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

let mockCanManage = true;

jest.mock("@/hooks/api/access", () => ({
  useCan: () => mockCanManage,
}));

const mockAiPolicy = { model: "gpt-4o", maxTokensPerRun: 4000, temperature: 0.7 };
const mockToolPerms = { allowedTools: ["ticket.summarize", "ticket.suggest-subtasks"] };
const mockQuota = { tokensUsedThisPeriod: 1500, quotaLimit: 1000000, resetAt: "2026-11-01T00:00:00.000Z" };
let mockHumanConfirmation: { requireConfirmation: boolean; actionTypes: string[] };

let mockUpdateAiPolicyMutate: jest.Mock;
let mockUpdateToolPermsMutate: jest.Mock;
let mockUpdateHumanConfMutate: jest.Mock;

jest.mock("@/hooks/api/build/automations", () => ({
  ACTION_TYPES: [
    { value: "set_status", label: "Set Status" },
    { value: "set_assignee", label: "Assign To" },
    { value: "request_approval", label: "Request Approval" },
  ],
}));

jest.mock("@/hooks/api/build/automation-settings", () => ({
  useAutomationAiPolicy: () => ({ data: mockAiPolicy, isLoading: false }),
  useUpdateAutomationAiPolicy: () => ({ mutate: mockUpdateAiPolicyMutate, isPending: false }),
  useAutomationToolPermissions: () => ({ data: mockToolPerms, isLoading: false }),
  useUpdateAutomationToolPermissions: () => ({ mutate: mockUpdateToolPermsMutate, isPending: false }),
  useAutomationTokenQuota: () => ({ data: mockQuota, isLoading: false }),
  useAutomationHumanConfirmation: () => ({ data: mockHumanConfirmation, isLoading: false }),
  useUpdateAutomationHumanConfirmation: () => ({ mutate: mockUpdateHumanConfMutate, isPending: false }),
}));

jest.mock("sonner", () => ({ toast: { success: jest.fn(), error: jest.fn() } }));
jest.mock("@/lib/get-error-message", () => ({ getErrorMessage: (e: unknown) => String(e) }));

import { AutomationSettingsTab } from "./automation-settings-tab";

beforeEach(() => {
  mockUpdateAiPolicyMutate = jest.fn();
  mockUpdateToolPermsMutate = jest.fn();
  mockUpdateHumanConfMutate = jest.fn();
  mockHumanConfirmation = { requireConfirmation: false, actionTypes: [] };
  mockCanManage = true;
});

function renderTab() {
  return render(
    <AutomationSettingsTab projectId={1} automationId={10} />,
  );
}

describe("AutomationSettingsTab", () => {
  it("renders AI policy fields populated from the hook", async () => {
    renderTab();
    await waitFor(() => {
      expect(screen.getByDisplayValue("gpt-4o")).toBeInTheDocument();
      expect(screen.getByDisplayValue("4000")).toBeInTheDocument();
      expect(screen.getByDisplayValue("0.7")).toBeInTheDocument();
    });
  });

  it("renders tool permission checkboxes and checks stored tools", async () => {
    renderTab();
    await waitFor(() => {
      expect(screen.getByLabelText(/Summarize/i)).toBeChecked();
      expect(screen.getByLabelText(/Suggest Subtasks/i)).toBeChecked();
      expect(screen.getByLabelText(/Improve Description/i)).not.toBeChecked();
    });
  });

  it("renders token quota with used and limit values", async () => {
    renderTab();
    await waitFor(() => {
      expect(screen.getByText("1,500")).toBeInTheDocument();
      expect(screen.getByText("1,000,000")).toBeInTheDocument();
    });
  });

  it("calls updateAiPolicy mutate when Save AI Policy is clicked", async () => {
    const user = userEvent.setup();
    renderTab();
    const btn = await screen.findByRole("button", { name: /save ai policy/i });
    await user.click(btn);
    expect(mockUpdateAiPolicyMutate).toHaveBeenCalled();
  });

  it("calls updateToolPerms mutate when Save Tool Permissions is clicked", async () => {
    const user = userEvent.setup();
    renderTab();
    const btn = await screen.findByRole("button", { name: /save tool permissions/i });
    await user.click(btn);
    expect(mockUpdateToolPermsMutate).toHaveBeenCalled();
  });

  it("shows action type checkboxes after enabling confirmation toggle", async () => {
    const user = userEvent.setup();
    renderTab();
    expect(screen.queryByText(/require confirmation for:/i)).not.toBeInTheDocument();
    const toggle = screen.getByLabelText(/approval queue instead/i);
    await user.click(toggle);
    expect(screen.getByText(/require confirmation for:/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/set status/i)).toBeInTheDocument();
  });

  it("loads the stored confirmation settings instead of starting unchecked", async () => {
    mockHumanConfirmation = { requireConfirmation: true, actionTypes: ["set_status"] };
    renderTab();
    await waitFor(() => {
      expect(screen.getByLabelText(/approval queue instead/i)).toBeChecked();
      expect(screen.getByLabelText(/set status/i)).toBeChecked();
      expect(screen.getByLabelText(/assign to/i)).not.toBeChecked();
    });
  });

  it("saves the stored confirmation settings back unchanged when nothing is edited", async () => {
    mockHumanConfirmation = { requireConfirmation: true, actionTypes: ["set_status"] };
    const user = userEvent.setup();
    renderTab();
    await screen.findByLabelText(/set status/i);
    await user.click(screen.getByRole("button", { name: /save confirmation settings/i }));
    expect(mockUpdateHumanConfMutate).toHaveBeenCalledWith(
      { requireConfirmation: true, actionTypes: ["set_status"] },
      expect.any(Object),
    );
  });

  it("hides save buttons from viewers without build:manage", async () => {
    mockCanManage = false;
    renderTab();
    await screen.findByDisplayValue("gpt-4o");
    expect(screen.queryByRole("button", { name: /save/i })).not.toBeInTheDocument();
    expect(screen.getByLabelText(/Summarize/i)).toBeDisabled();
  });

  it("calls updateHumanConf mutate when Save Confirmation Settings is clicked", async () => {
    const user = userEvent.setup();
    renderTab();
    const btn = screen.getByRole("button", { name: /save confirmation settings/i });
    await user.click(btn);
    expect(mockUpdateHumanConfMutate).toHaveBeenCalledWith(
      { requireConfirmation: false, actionTypes: [] },
      expect.any(Object),
    );
  });
});
