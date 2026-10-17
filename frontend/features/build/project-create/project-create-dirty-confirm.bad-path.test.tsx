import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import {
  DirtyStateProvider,
} from "@/components/shared/dirty-state-context";
import { ProjectCreateWizard } from "./project-create-wizard";

let mockStep = 1;
let mockDraftName = "";
const mockReset = jest.fn();

jest.mock("next/navigation", () => ({ useRouter: () => ({ push: jest.fn() }) }));
jest.mock("sonner", () => ({ toast: { success: jest.fn(), error: jest.fn(), warning: jest.fn() } }));
jest.mock("@/hooks/api/build/projects", () => ({
  useCreateProject: () => ({ mutateAsync: jest.fn() }),
  useAddProjectMember: () => ({ mutateAsync: jest.fn() }),
}));
jest.mock("@/hooks/api/build/templates", () => ({
  useApplyProjectTemplate: () => ({ mutateAsync: jest.fn() }),
}));
jest.mock("./use-project-create", () => ({
  useProjectCreate: () => ({
    step: mockStep,
    direction: 1,
    draft: {
      name: mockDraftName,
      key: "",
      description: "",
      managerId: "",
      clientId: "",
      startDate: "",
      endDate: "",
      projectType: "",
      templateId: null,
      modules: { epics: true, timeTracking: true, wiki: true },
      features: {},
      workflow: "simple",
      memberIds: [],
    },
    updateDraft: jest.fn(),
    goNext: jest.fn(),
    goBack: jest.fn(),
    reset: mockReset,
  }),
  TOTAL_STEPS: 7,
  STEP_LABELS: ["Basics", "Project Type", "Template", "Features", "Workflow", "Team", "Review & Create"],
}));
jest.mock("./steps/step-basics", () => ({ StepBasics: () => <div data-testid="step-basics" /> }));
jest.mock("./steps/step-type", () => ({ StepType: () => <div data-testid="step-type" /> }));
jest.mock("./steps/step-template", () => ({ StepTemplate: () => <div data-testid="step-template" /> }));
jest.mock("./steps/step-toggles", () => ({ StepToggles: () => <div data-testid="step-toggles" /> }));
jest.mock("./steps/step-workflow", () => ({ StepWorkflow: () => <div data-testid="step-workflow" /> }));
jest.mock("./steps/step-team", () => ({ StepTeam: () => <div data-testid="step-team" /> }));
jest.mock("./steps/step-review", () => ({ StepReview: () => <div data-testid="step-review" /> }));

describe("New Project dirty ConfirmDialog (D5 re-verify)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockStep = 7;
    mockDraftName = "Dirty project";
  });

  it.each(["Close", "Escape"] as const)(
    "%s opens Discard ConfirmDialog while dirty",
    async (action) => {
      const close = jest.fn();
      render(
        <DirtyStateProvider>
          <ProjectCreateWizard open onOpenChange={close} />
        </DirtyStateProvider>,
      );
      await act(async () => {
        await new Promise((r) => setTimeout(r, 0));
      });
      if (action === "Escape") {
        fireEvent.keyDown(screen.getByRole("dialog"), { key: "Escape" });
      } else {
        fireEvent.click(screen.getByRole("button", { name: "Close" }));
      }
      await waitFor(() =>
        expect(screen.getByRole("alertdialog", { name: /discard/i })).toBeVisible(),
      );
      expect(close).not.toHaveBeenCalled();
      fireEvent.click(screen.getByRole("button", { name: "Discard" }));
      await waitFor(() => expect(close).toHaveBeenCalledWith(false));
    },
  );
});
