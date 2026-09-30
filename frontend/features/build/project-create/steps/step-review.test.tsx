import { render, screen } from "@testing-library/react";
import { StepReview } from "./step-review";
import type { WizardDraft } from "../use-project-create";

jest.mock("@/hooks/api/build/templates", () => ({
  useProjectTemplates: jest.fn(() => ({ data: [] })),
}));

jest.mock("@/hooks/api/organization", () => ({
  useOrgMembers: jest.fn(),
}));

jest.mock("@/hooks/api/crm/clients", () => ({
  useSimpleClientsList: jest.fn(),
}));

const mockUseOrgMembers = jest.requireMock("@/hooks/api/organization").useOrgMembers as jest.Mock;
const mockUseSimpleClientsList = jest.requireMock("@/hooks/api/crm/clients").useSimpleClientsList as jest.Mock;

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
    managerId: "",
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
  mockUseOrgMembers.mockReturnValue({
    data: { data: MEMBERS, hasMore: false, nextCursor: null },
  });
  mockUseSimpleClientsList.mockReturnValue({ data: [] });
});

afterEach(() => {
  jest.clearAllMocks();
});

describe("StepReview features row — BUG-004", () => {
  it("shows enabled feature labels in the Features row so the Review step reflects choices from the Features step", () => {
    const draft: WizardDraft = {
      ...makeDraft([]),
      features: { backlog: true, kanban: true, bugs: false, qa: true },
      modules: { epics: false, timeTracking: false, wiki: false },
    };
    render(<StepReview draft={draft} />);

    expect(document.body.textContent).toContain("Backlog");
    expect(document.body.textContent).toContain("Kanban Board");
    expect(document.body.textContent).toContain("QA / Testing");
    expect(document.body.textContent).not.toContain("Bug Tracker");
  });

  it("shows None in the Features row when all features are disabled", () => {
    const draft: WizardDraft = {
      ...makeDraft([]),
      features: { backlog: false, kanban: false },
      modules: { epics: false, timeTracking: false, wiki: false },
    };
    render(<StepReview draft={draft} />);

    expect(screen.getByText("None")).toBeInTheDocument();
  });
});

describe("StepReview manager row — BUG-004", () => {
  it("shows the assigned manager's name in the Manager row", () => {
    const draft: WizardDraft = { ...makeDraft([]), managerId: "u1" };
    render(<StepReview draft={draft} />);

    expect(document.body.textContent).toContain("Alice Smith");
  });

  it("shows Not assigned in the Manager row when no manager is set", () => {
    render(<StepReview draft={makeDraft([])} />);

    expect(document.body.textContent).toContain("Not assigned");
  });
});

describe("StepReview client row — BUG-004", () => {
  it("shows the client name when a client is selected", () => {
    mockUseSimpleClientsList.mockReturnValue({
      data: [{ id: 5, name: "Acme Corp" }],
    });
    const draft: WizardDraft = { ...makeDraft([]), clientId: "5" };
    render(<StepReview draft={draft} />);

    expect(document.body.textContent).toContain("Acme Corp");
  });

  it("omits the Client row entirely when no client is selected", () => {
    const draft: WizardDraft = { ...makeDraft([]), clientId: "" };
    render(<StepReview draft={draft} />);

    expect(document.body.textContent).not.toContain("Client");
  });
});

describe("StepReview team row", () => {
  it("shows the selected member's display name in the team row instead of '1 member(s) added' when one member is chosen", () => {
    render(<StepReview draft={makeDraft(["u1"])} />);

    expect(document.body.textContent).toContain("Alice Smith");
    expect(document.body.textContent).not.toContain("member(s) added");
    expect(document.body.textContent).not.toMatch(/1 member/);
  });

  it("shows the first two names and a '+N more' suffix in the team row when more than two members are selected", () => {
    render(<StepReview draft={makeDraft(["u1", "u2", "u3"])} />);

    expect(document.body.textContent).toContain("Alice Smith");
    expect(document.body.textContent).toContain("Bob Jones");
    expect(document.body.textContent).toContain("+1 more");
    expect(document.body.textContent).not.toMatch(/\d+ members? added/);
  });

  it("renders no raw UUID and shows a human-readable fallback in the team row when a selected id has no matching member record", () => {
    const unknownId = "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee";
    render(<StepReview draft={makeDraft([unknownId])} />);

    expect(document.body.textContent).not.toContain(unknownId);
    expect(screen.getByText("Unknown member")).toBeInTheDocument();
  });
});
