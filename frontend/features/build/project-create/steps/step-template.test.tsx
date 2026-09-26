import { fireEvent, render, screen } from "@testing-library/react";
import { StepTemplate } from "./step-template";
import type { WizardDraft } from "../use-project-create";

let mockPageStateResolution: { kind: string; error?: unknown } = { kind: "ready" };
let mockTemplatesResult: {
  data: { pages: { data: { id: number; name: string; description?: string | null; tickets?: unknown[] }[] }[] } | undefined;
  isLoading: boolean;
  isError?: boolean;
  error?: Error;
  refetch?: () => void;
} = {
  data: { pages: [{ data: [] }] },
  isLoading: false,
  refetch: jest.fn(),
};

jest.mock("@/hooks/api/build/templates", () => ({
  useProjectTemplates: () => mockTemplatesResult,
}));

jest.mock("@/hooks/api/use-page-state", () => ({
  usePageState: () => mockPageStateResolution,
}));

const BLANK_DRAFT: WizardDraft = {
  name: "Test",
  key: "TST",
  description: "",
  managerId: "u1",
  clientId: "",
  startDate: "",
  endDate: "",
  projectType: "",
  templateId: null,
  modules: { sprints: true, epics: true, timeTracking: true, wiki: true },
  features: {},
  workflow: "simple",
  memberIds: [],
};

beforeEach(() => {
  jest.clearAllMocks();
  mockPageStateResolution = { kind: "ready" };
  mockTemplatesResult = {
    data: { pages: [{ data: [] }] },
    isLoading: false,
    refetch: jest.fn(),
  };
});

it("does not show the empty-templates message while access is loading, preventing a false no-templates state", () => {
  mockPageStateResolution = { kind: "loading" };

  render(<StepTemplate draft={BLANK_DRAFT} updateDraft={jest.fn()} />);

  expect(screen.queryByText(/No templates exist yet/)).not.toBeInTheDocument();
  expect(screen.queryByText("Blank Project")).not.toBeInTheDocument();
});

it("does not show the template list when the viewer is denied build:view, preventing a silent empty appearance", () => {
  mockPageStateResolution = { kind: "denied", permission: "build:view" };

  render(<StepTemplate draft={BLANK_DRAFT} updateDraft={jest.fn()} />);

  expect(screen.queryByText("Blank Project")).not.toBeInTheDocument();
  expect(screen.queryByText(/No templates exist yet/)).not.toBeInTheDocument();
});

it("shows a retry button instead of a false empty list when the templates fetch fails", () => {
  const refetch = jest.fn();
  mockPageStateResolution = { kind: "error", error: new Error("Fetch failed") };
  mockTemplatesResult = {
    data: undefined,
    isLoading: false,
    isError: true,
    error: new Error("Fetch failed"),
    refetch,
  };

  render(<StepTemplate draft={BLANK_DRAFT} updateDraft={jest.fn()} />);

  expect(screen.queryByText("Blank Project")).not.toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Try again" })).toBeInTheDocument();

  fireEvent.click(screen.getByRole("button", { name: "Try again" }));
  expect(refetch).toHaveBeenCalledTimes(1);
});

it("always shows Blank Project as a selectable option in the ready state", () => {
  render(<StepTemplate draft={BLANK_DRAFT} updateDraft={jest.fn()} />);

  expect(screen.getByRole("button", { name: "Blank Project" })).toBeInTheDocument();
});

it("shows the no-templates notice when access is granted but no templates exist", () => {
  render(<StepTemplate draft={BLANK_DRAFT} updateDraft={jest.fn()} />);

  expect(screen.getByText(/No templates exist yet/)).toBeInTheDocument();
});

it("renders template names when templates are loaded", () => {
  mockTemplatesResult = {
    data: {
      pages: [
        {
          data: [
            { id: 10, name: "Scrum Starter", description: "Sprint-based workflow", tickets: [] },
            { id: 11, name: "Kanban Flow", description: null, tickets: [] },
          ],
        },
      ],
    },
    isLoading: false,
    refetch: jest.fn(),
  };

  render(<StepTemplate draft={BLANK_DRAFT} updateDraft={jest.fn()} />);

  expect(screen.getByRole("button", { name: "Scrum Starter" })).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Kanban Flow" })).toBeInTheDocument();
  expect(screen.queryByText(/No templates exist yet/)).not.toBeInTheDocument();
});

it("calls updateDraft with the template id when a template is selected", () => {
  const updateDraft = jest.fn();
  mockTemplatesResult = {
    data: {
      pages: [
        {
          data: [
            { id: 10, name: "Scrum Starter", description: null, tickets: [] },
          ],
        },
      ],
    },
    isLoading: false,
    refetch: jest.fn(),
  };

  render(<StepTemplate draft={BLANK_DRAFT} updateDraft={updateDraft} />);

  fireEvent.click(screen.getByRole("button", { name: "Scrum Starter" }));

  expect(updateDraft).toHaveBeenCalledWith({ templateId: 10 });
});

it("calls updateDraft with null when Blank Project is selected", () => {
  const updateDraft = jest.fn();
  mockTemplatesResult = {
    data: {
      pages: [
        {
          data: [
            { id: 10, name: "Scrum Starter", description: null, tickets: [] },
          ],
        },
      ],
    },
    isLoading: false,
    refetch: jest.fn(),
  };
  const draftWithTemplate = { ...BLANK_DRAFT, templateId: 10 };

  render(<StepTemplate draft={draftWithTemplate} updateDraft={updateDraft} />);

  fireEvent.click(screen.getByRole("button", { name: "Blank Project" }));

  expect(updateDraft).toHaveBeenCalledWith({ templateId: null });
});
