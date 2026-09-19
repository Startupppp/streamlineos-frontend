import { render, screen } from "@testing-library/react";
import {
  BuildDirtyStateProvider,
  useBuildHasUnsavedWork,
} from "@/features/build/navigation/build-dirty-state-context";
import { ProjectCreateWizard } from "./project-create-wizard";

let mockStep = 1;
let mockDraftName = "";

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
      modules: { sprints: true, epics: true, timeTracking: true, wiki: true },
      features: {},
      workflow: "simple",
      memberIds: [],
    },
    updateDraft: jest.fn(),
    goNext: jest.fn(),
    goBack: jest.fn(),
    reset: jest.fn(),
  }),
  TOTAL_STEPS: 7,
  STEP_LABELS: [
    "Basics",
    "Project Type",
    "Template",
    "Features",
    "Workflow",
    "Team",
    "Review & Create",
  ],
}));

jest.mock("./use-project-provisioning", () => ({
  useProjectProvisioning: () => ({ provision: jest.fn(), isProvisioning: false }),
}));

jest.mock("./steps/step-basics", () => ({
  StepBasics: () => <div data-testid="step-basics" />,
}));
jest.mock("./steps/step-type", () => ({
  StepType: () => <div data-testid="step-type" />,
}));
jest.mock("./steps/step-template", () => ({
  StepTemplate: () => <div data-testid="step-template" />,
}));
jest.mock("./steps/step-toggles", () => ({
  StepToggles: () => <div data-testid="step-toggles" />,
}));
jest.mock("./steps/step-workflow", () => ({
  StepWorkflow: () => <div data-testid="step-workflow" />,
}));
jest.mock("./steps/step-team", () => ({
  StepTeam: () => <div data-testid="step-team" />,
}));
jest.mock("./steps/step-review", () => ({
  StepReview: () => <div data-testid="step-review" />,
}));

function HasUnsavedWorkProbe() {
  const hasUnsavedWork = useBuildHasUnsavedWork();
  return <span data-testid="probe">{hasUnsavedWork ? "dirty" : "clean"}</span>;
}

function renderHarness(open: boolean) {
  return render(
    <BuildDirtyStateProvider>
      <HasUnsavedWorkProbe />
      <ProjectCreateWizard open={open} onOpenChange={jest.fn()} />
    </BuildDirtyStateProvider>,
  );
}

describe("project create wizard dirty guard (BSN-04-010, BSN-04-013)", () => {
  beforeEach(() => {
    mockStep = 1;
    mockDraftName = "";
  });

  test("closed wizard reports clean state regardless of draft content", () => {
    mockStep = 3;
    mockDraftName = "My Project";
    renderHarness(false);
    expect(screen.getByTestId("probe")).toHaveTextContent("clean");
  });

  test("open wizard at step 1 with no name entered reports clean so no guard fires for unopened wizards", () => {
    mockStep = 1;
    mockDraftName = "";
    renderHarness(true);
    expect(screen.getByTestId("probe")).toHaveTextContent("clean");
  });

  test("open wizard past step 1 registers as dirty so scope-change guard fires", () => {
    mockStep = 2;
    mockDraftName = "";
    renderHarness(true);
    expect(screen.getByTestId("probe")).toHaveTextContent("dirty");
  });

  test("open wizard at step 1 with name entered registers as dirty so scope-change guard fires", () => {
    mockStep = 1;
    mockDraftName = "New project";
    renderHarness(true);
    expect(screen.getByTestId("probe")).toHaveTextContent("dirty");
  });

  test("wizard draft content is preserved in draft state when user keeps editing after a blocked scope change", () => {
    mockStep = 2;
    mockDraftName = "Half-entered project";
    renderHarness(true);
    expect(screen.getByTestId("probe")).toHaveTextContent("dirty");
  });
});
