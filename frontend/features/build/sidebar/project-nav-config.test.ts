import { buildProjectNavGroups, settingsNavItem } from "./project-nav-config";
import { stripPmWorkspacePrefix } from "@/lib/build/pm-workspace-path";

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
    expect(buildProjectNavGroups("/build/42", noProjectNavAccess)).toEqual([]);
  });
});

describe("workspace URL active-state normalization", () => {
  it("stripPmWorkspacePrefix converts a workspace settings URL to the old-format href used by project nav items", () => {
    const wsPathname =
      "/build/workspaces/bd7504c5-884e-40df-9dce-cc7299f50025/2/settings";
    const normalized = stripPmWorkspacePrefix(wsPathname);
    const item = settingsNavItem("/build/2", true);
    expect(normalized).toBe(item?.href);
  });

  it("stripPmWorkspacePrefix converts the workspace board URL to the old-format project root", () => {
    const wsPathname =
      "/build/workspaces/bd7504c5-884e-40df-9dce-cc7299f50025/2";
    const normalized = stripPmWorkspacePrefix(wsPathname);
    expect(normalized).toBe("/build/2");
  });
});
