import { render, screen } from "@testing-library/react";
import { StepTeam } from "./step-team";
import type { WizardDraft } from "../use-project-create";

jest.mock("next-auth/react", () => ({
  useSession: jest.fn(() => ({ data: { user: { id: "creator-id" } } })),
}));

jest.mock("@/hooks/api/access", () => ({
  useCan: jest.fn(() => true),
}));

jest.mock("@/hooks/api/organization", () => ({
  useOrgMembers: jest.fn(),
}));

const mockUseOrgMembers = jest.requireMock("@/hooks/api/organization").useOrgMembers as jest.Mock;

const MEMBERS = [
  {
    membershipId: 1,
    userId: "u1",
    role: "MEMBER",
    joinedAt: "2024-01-01",
    name: "Alice Smith",
    email: "alice@example.com",
    image: null,
    totpEnabled: false,
  },
  {
    membershipId: 2,
    userId: "u2",
    role: "MEMBER",
    joinedAt: "2024-01-01",
    name: "Bob Jones",
    email: "bob@example.com",
    image: null,
    totpEnabled: false,
  },
  {
    membershipId: 3,
    userId: "u3",
    role: "MEMBER",
    joinedAt: "2024-01-01",
    name: "Carol Lee",
    email: "carol@example.com",
    image: null,
    totpEnabled: false,
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
    modules: { sprints: true, epics: true, timeTracking: true, wiki: true },
    features: {},
    workflow: "simple",
    memberIds,
  };
}

beforeEach(() => {
  mockUseOrgMembers.mockReturnValue({
    data: { data: MEMBERS, hasMore: false, nextCursor: null },
  });
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
