import { readFileSync } from "node:fs";
import { join } from "node:path";

function source(relativePath: string): string {
  return readFileSync(join(process.cwd(), relativePath), "utf8");
}

describe("Build people inputs use the Build actor directory", () => {
  it.each([
    "features/build/settings/project-member-selector.tsx",
    "features/build/whiteboard/share-dialog.tsx",
    "features/build/project-detail/project-budget-page.tsx",
  ])("keeps %s off the whole-org member directory", (relativePath) => {
    const contents = source(relativePath);

    expect(contents).toContain("useBuildMembers");
    expect(contents).not.toContain("useOrgMembers");
  });

  it("build-scopes feedbucket assignee candidates before legacy membership-id resolution", () => {
    const contents = source("features/build/feedbucket/use-widget-setup.ts");

    expect(contents).toContain("useBuildMembers");
    expect(contents).toContain("useOrgMembersByIds");
    expect(contents).not.toContain("useOrgMembers(");
    expect(contents).toContain("new Set(members.map((member) => member.id))");
    expect(contents).toContain("buildMemberIds.has(member.userId)");
  });

  it.each([
    "features/build/milestones/milestone-upsert-sheet.tsx",
    "features/build/milestones/project-milestones-page.tsx",
    "features/build/approvals/use-approvals-data.ts",
    "features/build/roadmap/use-roadmap-list-page.ts",
  ])("intersects membership-id options with Build actors in %s", (relativePath) => {
    const contents = source(relativePath);

    expect(contents).toContain("useBuildMembers");
    expect(contents).toContain("useOrgMembersByIds");
    expect(contents).not.toContain("useOrgMembers(");
    expect(contents).toMatch(/membershipByUserId|get\(member\.id\)|buildMemberIds/);
  });

  it("uses the milestone mutation permission for milestone controls", () => {
    const contents = source("features/build/milestones/project-milestones-page.tsx");

    expect(contents).toContain('useCan("build:workspace:manage")');
  });
});
