import { render, screen } from "@testing-library/react";
import { StepTeam } from "./step-team";
import type { WizardDraft } from "../use-project-create";

jest.mock("next-auth/react", () => ({
  useSession: jest.fn(() => ({ data: { user: { id: "creator-id" } } })),
}));

jest.mock("@/hooks/api/access", () => ({
  useCan: jest.fn(() => true),
}));

jest.mock("../use-wizard-members", () => ({
  ...jest.requireActual("../use-wizard-members"),
  useWizardMembers: jest.fn(),
}));

const mockUseWizardMembers = jest.requireMock("../use-wizard-members").useWizardMembers as jest.Mock;

const MEMBERS = [
  {
    userId: "u1",
    name: "Alice Smith",
    email: "alice@example.com",
    image: null,
  },
  {
    userId: "u2",
    name: "Bob Jones",
    email: "bob@example.com",
    image: null,
  },
  {
    userId: "u3",
    name: "Carol Lee",
    email: "carol@example.com",
    image: null,
  },
];

function makeDraft(memberIds: string[]): WizardDraft {
  return {
    name: "Test Project",
    key: "TP",
    description: "",
    managerId: "creator-id",
    clientId: "",
    startDate: "",
    endDate: "",
    projectType: "",
    templateId: null,
    modules: { epics: true, timeTracking: true, wiki: true },
    features: {},
    workflow: "simple",
    memberIds,
  };
}

beforeEach(() => {
  mockUseWizardMembers.mockReturnValue(MEMBERS);
});

afterEach(() => {
  jest.clearAllMocks();
});

describe("StepTeam selected-members badge", () => {
  it("shows the selected member's display name instead of '1 selected' when exactly one member is chosen", () => {
    render(<StepTeam draft={makeDraft(["u1"])} updateDraft={jest.fn()} />);

    expect(document.body.textContent).toContain("Alice Smith");
    expect(document.body.textContent).not.toContain("1 selected");
  });

  it("shows the first two selected members' names and a '+N more' suffix when more than two are selected", () => {
    render(<StepTeam draft={makeDraft(["u1", "u2", "u3"])} updateDraft={jest.fn()} />);

    expect(document.body.textContent).toContain("Alice Smith");
    expect(document.body.textContent).toContain("Bob Jones");
    expect(document.body.textContent).toContain("+1 more");
    expect(document.body.textContent).not.toMatch(/\d+ selected/);
  });

  it("renders no raw UUID in the badge when a selected member id cannot be resolved from the loaded members list", () => {
    const unknownId = "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee";
    render(<StepTeam draft={makeDraft([unknownId])} updateDraft={jest.fn()} />);

    expect(document.body.textContent).not.toContain(unknownId);
    expect(screen.getByText("Unknown member")).toBeInTheDocument();
  });
});
