import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import {
  DirtyStateProvider,
  useHasUnsavedWork,
} from "@/components/shared/dirty-state-context";
import { ProjectCreateWizard } from "./project-create-wizard";
import { toast } from "sonner";

let mockStep = 1;
let mockDraftName = "";
const mockReset = jest.fn();
const mockGoBack = jest.fn();
const mockCreateProject = jest.fn();
const mockPush = jest.fn();

jest.mock("next/navigation", () => ({ useRouter: () => ({ push: mockPush }) }));
jest.mock("sonner", () => ({ toast: { success: jest.fn(), error: jest.fn(), warning: jest.fn() } }));
jest.mock("@/hooks/api/build/projects", () => ({
  useCreateProject: () => ({ mutateAsync: mockCreateProject }),
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
    goBack: mockGoBack,
    reset: mockReset,
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
  const hasUnsavedWork = useHasUnsavedWork();
  return <span data-testid="probe">{hasUnsavedWork ? "dirty" : "clean"}</span>;
}

function renderHarness(open: boolean, onOpenChange = jest.fn()) {
  return render(
    <DirtyStateProvider>
      <HasUnsavedWorkProbe />
      <ProjectCreateWizard open={open} onOpenChange={onOpenChange} />
    </DirtyStateProvider>,
  );
}

function deferredProject() {
  let resolve: (value: { id: number }) => void = () => undefined;
  let reject: (reason: Error) => void = () => undefined;
  const promise = new Promise<{ id: number }>((accept, refuse) => { resolve = accept; reject = refuse; });
  return { promise, resolve, reject };
}

function dismiss(action: string) {
  if (action === "Escape") fireEvent.keyDown(screen.getByRole("dialog"), { key: "Escape" });
  else if (action === "outside") fireEvent.pointerDown(document.body, { button: 0, pointerType: "mouse" });
  else fireEvent.click(screen.getByRole("button", { name: action }));
}

describe("project create wizard dirty guard (BSN-04-010, BSN-04-013)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockStep = 1;
    mockDraftName = "";
  });

  test.each(["Close", "Escape", "outside", "← Back"])("pending canonical provisioning retains the draft during %s", async action => {
    mockStep = 7;
    mockDraftName = "Pending project";
    const pending = deferredProject();
    mockCreateProject.mockReturnValueOnce(pending.promise);
    const close = jest.fn();
    renderHarness(true, close);
    fireEvent.click(screen.getByRole("button", { name: "Create Project" }));
    await waitFor(() => expect(mockCreateProject).toHaveBeenCalledTimes(1));
    try {
      if (action === "outside") await act(async () => { await new Promise<void>(resolve => setTimeout(resolve, 0)); });
      dismiss(action);
      expect(close).not.toHaveBeenCalled();
      expect(mockReset).not.toHaveBeenCalled();
      expect(mockGoBack).not.toHaveBeenCalled();
      expect(screen.getByRole("button", { name: "← Back" })).toBeDisabled();
      expect(screen.getByTestId("probe")).toHaveTextContent("dirty");
    } finally {
      await act(async () => { pending.reject(new Error("Create unavailable")); });
    }
  });

  test("failed canonical create preserves input for retry and closes only after a successful acknowledgement", async () => {
    mockStep = 7;
    mockDraftName = "Retry retained project";
    const first = deferredProject();
    const retry = deferredProject();
    mockCreateProject.mockReturnValueOnce(first.promise).mockReturnValueOnce(retry.promise);
    const close = jest.fn();
    renderHarness(true, close);
    fireEvent.click(screen.getByRole("button", { name: "Create Project" }));
    await act(async () => { first.reject(new Error("Create unavailable")); });
    expect(toast.error).toHaveBeenCalled();
    expect(close).not.toHaveBeenCalled();
    expect(mockReset).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "← Back" })).toBeEnabled();
    expect(screen.getByTestId("probe")).toHaveTextContent("dirty");
    fireEvent.click(screen.getByRole("button", { name: "Create Project" }));
    expect(mockCreateProject).toHaveBeenNthCalledWith(2, expect.objectContaining({ name: "Retry retained project", workflow: "simple", modules: { epics: true, timeTracking: true, wiki: true } }));
    expect(mockCreateProject.mock.calls[1]).toEqual(mockCreateProject.mock.calls[0]);
    await act(async () => { retry.resolve({ id: 54 }); });
    await waitFor(() => expect(close).toHaveBeenCalledTimes(1));
    expect(close).toHaveBeenCalledWith(false);
    expect(mockReset).toHaveBeenCalledTimes(1);
    expect(mockPush).toHaveBeenCalledWith("/build/54");
  });

  test.each(["Close", "Escape", "outside"])("idle Sheet %s remains a usable cancellation path", async action => {
    mockStep = 7;
    mockDraftName = "Idle draft";
    const close = jest.fn();
    renderHarness(true, close);
    await act(async () => { await new Promise<void>(resolve => setTimeout(resolve, 0)); });
    dismiss(action);
    await waitFor(() => expect(close).toHaveBeenCalledWith(false));
    expect(mockReset).toHaveBeenCalledTimes(1);
    expect(mockCreateProject).not.toHaveBeenCalled();
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
