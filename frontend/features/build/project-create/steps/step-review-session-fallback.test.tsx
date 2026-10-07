import { render } from "@testing-library/react";
import { StepReview } from "./step-review";
import type { WizardDraft } from "../use-project-create";

const LEAD_ID = "e05cd989-3dbb-41f0-a6aa-eb36c33c9c8a";

jest.mock("next-auth/react", () => ({
  useSession: jest.fn(() => ({
    data: {
      user: {
        id: LEAD_ID,
        name: "sosec237732",
        email: "sosec237732@maxxspace.com",
      },
    },
  })),
}));

jest.mock("@/hooks/api/access", () => ({
  useCan: jest.fn((key: string) => key === "build:members:view"),
}));

jest.mock("@/hooks/api/organization", () => ({
  useOrgMembers: jest.fn(() => ({ data: { data: [] } })),
}));

jest.mock("@/hooks/api/build/build-members", () => ({
  useBuildMembers: jest.fn(() => ({
    data: {
      data: [
        {
          id: LEAD_ID,
          name: "sosec237732",
          firstName: "sosec237732",
          lastName: null,
          email: "sosec237732@maxxspace.com",
          image: null,
          role: "member",
          addedAt: "2026-10-07T00:00:00.000Z",
          teams: [],
        },
      ],
    },
  })),
}));

jest.mock("@/hooks/api/build/templates", () => ({
  useProjectTemplates: jest.fn(() => ({ data: undefined })),
}));

jest.mock("@/hooks/api/crm/clients", () => ({
  useSimpleClientsList: jest.fn(() => ({ data: [] })),
}));

function makeDraft(overrides: Partial<WizardDraft> = {}): WizardDraft {
  return {
    name: "Smoke Project 2",
    key: "SP2",
    description: "",
    managerId: LEAD_ID,
    clientId: "",
    startDate: "",
    endDate: "",
    projectType: "",
    templateId: null,
    modules: { epics: true, timeTracking: true, wiki: true },
    features: {},
    workflow: "simple",
    memberIds: [LEAD_ID],
    ...overrides,
  };
}

describe("StepReview — member directory + session fallback", () => {
  it("shows the lead name from build members when org members are empty (build:members:view path)", () => {
    render(<StepReview draft={makeDraft()} />);

    expect(document.body.textContent).toContain("sosec237732");
    expect(document.body.textContent).not.toContain("Unknown member");
  });

  it("shows No manager when managerId is unset rather than Unknown member", () => {
    render(<StepReview draft={makeDraft({ managerId: "", memberIds: [] })} />);

    expect(document.body.textContent).toContain("No manager");
    expect(document.body.textContent).toContain("No members added");
    expect(document.body.textContent).not.toContain("Unknown member");
  });

  it("falls back to the session display name when both directories miss the default lead id", () => {
    const { useBuildMembers } = jest.requireMock("@/hooks/api/build/build-members");
    (useBuildMembers as jest.Mock).mockReturnValueOnce({ data: { data: [] } });

    render(<StepReview draft={makeDraft()} />);

    expect(document.body.textContent).toContain("sosec237732");
    expect(document.body.textContent).not.toContain("Unknown member");
  });
});
