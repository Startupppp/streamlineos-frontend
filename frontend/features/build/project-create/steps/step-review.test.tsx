import { render, screen } from "@testing-library/react";
import { StepReview } from "./step-review";
import type { WizardDraft } from "../use-project-create";

jest.mock("next-auth/react", () => ({
  useSession: jest.fn(() => ({ data: null })),
}));

jest.mock("@/hooks/api/build/templates", () => ({
  useProjectTemplates: jest.fn(() => ({ data: [] })),
}));

jest.mock("../use-wizard-members", () => ({
  ...jest.requireActual("../use-wizard-members"),
  useWizardMembers: jest.fn(),
}));

jest.mock("@/hooks/api/crm/clients", () => ({
  useSimpleClientsList: jest.fn(),
}));

const mockUseWizardMembers = jest.requireMock("../use-wizard-members").useWizardMembers as jest.Mock;
const mockUseSimpleClientsList = jest.requireMock("@/hooks/api/crm/clients").useSimpleClientsList as jest.Mock;

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
  mockUseWizardMembers.mockReturnValue(MEMBERS);
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

    expect(document.body.textContent).toContain("No manager");
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

describe("StepReview key conflict banner — BUG-04", () => {
  it("shows the conflict warning banner when keyConflictMessage is provided", () => {
    const msg = 'A project with key "QAB" already exists in this organization.';
    render(<StepReview draft={makeDraft([])} keyConflictMessage={msg} />);

    expect(screen.getByText("Project key already taken")).toBeInTheDocument();
    expect(document.body.textContent).toContain(msg);
  });

  it("shows the Fix Key button when keyConflictMessage and onGoToBasics are provided", () => {
    const msg = 'A project with key "QAB" already exists in this organization.';
    const handleGoToBasics = jest.fn();
    render(
      <StepReview
        draft={makeDraft([])}
        keyConflictMessage={msg}
        onGoToBasics={handleGoToBasics}
      />,
    );

    const fixKeyBtn = screen.getByRole("button", { name: "Fix Key" });
    expect(fixKeyBtn).toBeInTheDocument();
  });

  it("calls onGoToBasics when the Fix Key button is clicked", async () => {
    const msg = 'A project with key "QAB" already exists in this organization.';
    const handleGoToBasics = jest.fn();
    const { user } = { user: { click: (el: Element) => el.dispatchEvent(new MouseEvent("click", { bubbles: true })) } };
    render(
      <StepReview
        draft={makeDraft([])}
        keyConflictMessage={msg}
        onGoToBasics={handleGoToBasics}
      />,
    );

    const fixKeyBtn = screen.getByRole("button", { name: "Fix Key" });
    user.click(fixKeyBtn);
    expect(handleGoToBasics).toHaveBeenCalledTimes(1);
  });

  it("shows the ready-to-create banner when keyConflictMessage is absent", () => {
    render(<StepReview draft={makeDraft([])} />);

    expect(screen.getByText("Ready to create")).toBeInTheDocument();
    expect(document.body.textContent).not.toContain("Project key already taken");
  });
});

describe("StepReview description overflow — BUG-16", () => {
  it("renders a long description without truncating its text content", () => {
    const longDesc = "A".repeat(2000);
    const draft: WizardDraft = { ...makeDraft([]), description: longDesc };
    render(<StepReview draft={draft} />);

    expect(document.body.textContent).toContain(longDesc);
  });

  it("applies break-words class to the description value paragraph", () => {
    const longDesc = "B".repeat(500);
    const draft: WizardDraft = { ...makeDraft([]), description: longDesc };
    const { container } = render(<StepReview draft={draft} />);

    const descParagraph = Array.from(container.querySelectorAll("p")).find(
      (p) => p.textContent === longDesc,
    );
    expect(descParagraph).toBeDefined();
    expect(descParagraph?.className).toMatch(/break-words/);
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

  it("shows the creator display name from the wizard member directory (not Unknown member) when manager and team ids resolve", () => {
    mockUseWizardMembers.mockReturnValue([
      {
        userId: "creator-1",
        name: "sosec237732",
        email: "sosec237732@maxxspace.com",
        image: null,
      },
    ]);
    const draft: WizardDraft = {
      ...makeDraft(["creator-1"]),
      managerId: "creator-1",
    };
    render(<StepReview draft={draft} />);

    expect(document.body.textContent).toContain("sosec237732");
    expect(document.body.textContent).not.toContain("Unknown member");
  });
});
