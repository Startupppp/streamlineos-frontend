import { buildProjectNavGroups } from "./project-nav-config";

const noProjectNavAccess = {
  canProjectData: false,
  canTickets: false,
  canSprints: false,
  canSettings: false,
  canQA: false,
  canBugs: false,
  canIncidents: false,
  canChangerequests: false,
  canClientVisibility: false,
  canApprovals: false,
  canAI: false,
  canForms: false,
  canRisks: false,
  canDecisions: false,
  canMeetings: false,
  canWorkflow: false,
  canChat: false,
  canFeedback: false,
};

describe("buildProjectNavGroups", () => {
  it("does not expose project tools without project-data access", () => {
    expect(buildProjectNavGroups("/projects/42", noProjectNavAccess)).toEqual([]);
  });
});
