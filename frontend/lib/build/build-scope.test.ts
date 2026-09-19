import {
  buildScopeKey,
  buildScopeOverviewHref,
  isBuildPath,
  resolveBuildScope,
} from "./build-scope";

describe("resolveBuildScope", () => {
  it("answers the organization scope for the Build root and its flat pages", () => {
    expect(resolveBuildScope("/build").type).toBe("organization");
    expect(resolveBuildScope("/build/command-center").type).toBe("organization");
    expect(resolveBuildScope("/build/portfolios").type).toBe("organization");
  });

  it("answers the organization scope for a path Build does not own", () => {
    expect(resolveBuildScope("/crm/contacts").type).toBe("organization");
    expect(isBuildPath("/crm/contacts")).toBe(false);
  });

  it("reads the project id from a numeric first segment, not from managed-products", () => {
    const project = resolveBuildScope("/build/42/backlog");
    expect(project.type).toBe("project");
    expect(project.projectId).toBe(42);
    expect(project.basePath).toBe("/build/42");

    const product = resolveBuildScope("/build/managed-products/7");
    expect(product.type).toBe("product");
    expect(product.managedProductId).toBe(7);
    expect(product.projectId).toBeNull();
  });

  it("keeps a PM workspace path in the workspace scope", () => {
    const workspace = resolveBuildScope("/build/workspaces/ws-1/all-work");
    expect(workspace.type).toBe("workspace");
    expect(workspace.pmWorkspaceId).toBe("ws-1");
    expect(workspace.basePath).toBe("/build/workspaces/ws-1");
  });

  it("does not mistake a workspace slug for a project id", () => {
    expect(resolveBuildScope("/build/workspaces/ws-1").projectId).toBeNull();
  });
});

describe("buildScopeOverviewHref", () => {
  it("sends the organization scope to its command centre and every other scope to its base", () => {
    expect(buildScopeOverviewHref(resolveBuildScope("/build/teams"))).toBe(
      "/build/command-center",
    );
    expect(buildScopeOverviewHref(resolveBuildScope("/build/42/qa"))).toBe(
      "/build/42",
    );
    expect(
      buildScopeOverviewHref(resolveBuildScope("/build/managed-products/7")),
    ).toBe("/build/managed-products/7");
  });
});

describe("buildScopeKey", () => {
  it("separates a project from a managed product carrying the same numeric id", () => {
    expect(buildScopeKey(resolveBuildScope("/build/7"))).not.toBe(
      buildScopeKey(resolveBuildScope("/build/managed-products/7")),
    );
  });
});
