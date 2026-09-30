import * as fs from "fs";
import * as path from "path";

const HOOK_FILE = path.join(
  __dirname,
  "..",
  "project-members.ts",
);

function hookSource(): string {
  return fs.readFileSync(HOOK_FILE, "utf8").replace(/\s+/g, " ");
}

describe("useAddProjectMember — endpoint URL assertion (P0 regression lock)", () => {
  it("posts to /build/${projectId}/members (project endpoint) not /build/members (workspace endpoint)", () => {
    const src = hookSource();
    expect(src).toContain("apiClient.post");
    expect(src).toContain("`/build/${projectId}/members`");
    expect(src).not.toContain('apiClient.post<ProjectMemberRow>( "/build/members"');
    expect(src).not.toContain("apiClient.post<ProjectMemberRow>('/build/members'");
  });

  it("destructures projectId from variables before building the URL so projectId is not passed as a body field", () => {
    const src = hookSource();
    expect(src).toMatch(/\(\s*\{\s*projectId[\s,]/);
  });

  it("requires build:manage permission — exact backend key per FE-45", () => {
    const src = hookSource();
    expect(src).toContain('"build:manage"');
  });
});
