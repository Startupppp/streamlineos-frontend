import { resolveBuildScopeFallback } from "./build-scope-fallback";
import type { BuildScope } from "./build-scope";

const PROJECT_SCOPE: BuildScope = {
  type: "project",
  managedProductId: null,
  projectId: 42,
  basePath: "/build/42",
};

const ORGANIZATION_SCOPE: BuildScope = {
  type: "organization",
  managedProductId: null,
  projectId: null,
  basePath: "/build",
};

describe("resolveBuildScopeFallback", () => {
  it("stays when the scope is still accessible, regardless of every other input", () => {
    expect(
      resolveBuildScopeFallback({
        scope: PROJECT_SCOPE,
        isInaccessible: false,
        hasAnyBuildAccess: false,
        accessibleParent: null,
        organizationHref: null,
      }),
    ).toEqual({ kind: "stay" });
  });

  it("stays for an inaccessible organization scope when the caller still has any build access", () => {
    expect(
      resolveBuildScopeFallback({
        scope: ORGANIZATION_SCOPE,
        isInaccessible: true,
        hasAnyBuildAccess: true,
        accessibleParent: null,
        organizationHref: null,
      }),
    ).toEqual({ kind: "stay" });
  });

  it("gives up with no-access for an inaccessible organization scope when the caller has no build access at all", () => {
    expect(
      resolveBuildScopeFallback({
        scope: ORGANIZATION_SCOPE,
        isInaccessible: true,
        hasAnyBuildAccess: false,
        accessibleParent: null,
        organizationHref: null,
      }),
    ).toEqual({ kind: "no-access" });
  });

  it("gives up with no-access for an inaccessible non-organization scope when the caller has no build access at all", () => {
    expect(
      resolveBuildScopeFallback({
        scope: PROJECT_SCOPE,
        isInaccessible: true,
        hasAnyBuildAccess: false,
        accessibleParent: null,
        organizationHref: "/build/command-center",
      }),
    ).toEqual({ kind: "no-access" });
  });

  it("recovers to the accessible parent product ahead of the organization destination", () => {
    expect(
      resolveBuildScopeFallback({
        scope: PROJECT_SCOPE,
        isInaccessible: true,
        hasAnyBuildAccess: true,
        accessibleParent: { type: "product", id: "7" },
        organizationHref: "/build/command-center",
      }),
    ).toEqual({
      kind: "recover",
      href: "/build/managed-products/7",
      label: "Go to the parent product",
    });
  });

  it("BSN-04-014: promotes the first authorized organization destination when command-center itself is authorized", () => {
    expect(
      resolveBuildScopeFallback({
        scope: PROJECT_SCOPE,
        isInaccessible: true,
        hasAnyBuildAccess: true,
        accessibleParent: null,
        organizationHref: "/build/command-center",
      }),
    ).toEqual({
      kind: "recover",
      href: "/build/command-center",
      label: "Go to All of Build",
    });
  });

  it("BSN-04-014: promotes a non-command-center organization destination instead of the hardcoded command-center route when build:view is not held", () => {
    expect(
      resolveBuildScopeFallback({
        scope: PROJECT_SCOPE,
        isInaccessible: true,
        hasAnyBuildAccess: true,
        accessibleParent: null,
        organizationHref: "/build/approvals",
      }),
    ).toEqual({
      kind: "recover",
      href: "/build/approvals",
      label: "Go to All of Build",
    });
  });

  it("BSN-04-014: degrades to no-access instead of offering a dead command-center link when the organization model has no authorized destination", () => {
    expect(
      resolveBuildScopeFallback({
        scope: PROJECT_SCOPE,
        isInaccessible: true,
        hasAnyBuildAccess: true,
        accessibleParent: null,
        organizationHref: null,
      }),
    ).toEqual({ kind: "no-access" });
  });
});
