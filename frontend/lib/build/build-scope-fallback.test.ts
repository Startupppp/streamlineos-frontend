import { resolveBuildScopeFallback } from "./build-scope-fallback";
import { ORGANIZATION_BUILD_SCOPE, resolveBuildScope } from "./build-scope";

const projectScope = resolveBuildScope("/build/42");
const productScope = resolveBuildScope("/build/managed-products/7");
const workspaceScope = resolveBuildScope("/build/workspaces/ws-1");

describe("resolveBuildScopeFallback", () => {
  it("leaves an accessible scope alone", () => {
    expect(
      resolveBuildScopeFallback({
        scope: projectScope,
        isInaccessible: false,
        hasAnyBuildAccess: true,
        accessibleParent: null,
      }),
    ).toEqual({ kind: "stay" });
  });

  it("offers the parent product when a linked project is lost", () => {
    expect(
      resolveBuildScopeFallback({
        scope: projectScope,
        isInaccessible: true,
        hasAnyBuildAccess: true,
        accessibleParent: { type: "product", id: "7" },
      }),
    ).toEqual({
      kind: "recover",
      href: "/build/managed-products/7",
      label: "Go to the parent product",
    });
  });

  it("falls back to All of Build when a workspace is lost, because a workspace has no parent scope to offer", () => {
    expect(
      resolveBuildScopeFallback({
        scope: workspaceScope,
        isInaccessible: true,
        hasAnyBuildAccess: true,
        accessibleParent: null,
      }),
    ).toEqual({
      kind: "recover",
      href: "/build/command-center",
      label: "Go to All of Build",
    });
  });

  it("offers no recovery when a workspace is lost and no Build access remains", () => {
    expect(
      resolveBuildScopeFallback({
        scope: workspaceScope,
        isInaccessible: true,
        hasAnyBuildAccess: false,
        accessibleParent: null,
      }),
    ).toEqual({ kind: "no-access" });
  });

  it("offers the parent workspace when a standalone project is lost", () => {
    expect(
      resolveBuildScopeFallback({
        scope: projectScope,
        isInaccessible: true,
        hasAnyBuildAccess: true,
        accessibleParent: { type: "workspace", id: "ws-1" },
      }),
    ).toEqual({
      kind: "recover",
      href: "/build/workspaces/ws-1",
      label: "Go to the parent workspace",
    });
  });

  it("falls back to All of Build when no parent is accessible", () => {
    expect(
      resolveBuildScopeFallback({
        scope: productScope,
        isInaccessible: true,
        hasAnyBuildAccess: true,
        accessibleParent: null,
      }),
    ).toEqual({
      kind: "recover",
      href: "/build/command-center",
      label: "Go to All of Build",
    });
  });

  it("never invents a parent above the organization root", () => {
    expect(
      resolveBuildScopeFallback({
        scope: ORGANIZATION_BUILD_SCOPE,
        isInaccessible: true,
        hasAnyBuildAccess: false,
        accessibleParent: null,
      }),
    ).toEqual({ kind: "no-access" });
  });

  it("shows the empty state rather than a recovery link when the actor has zero Build access", () => {
    for (const scope of [projectScope, productScope, workspaceScope]) {
      expect(
        resolveBuildScopeFallback({
          scope,
          isInaccessible: true,
          hasAnyBuildAccess: false,
          accessibleParent: { type: "workspace", id: "ws-1" },
        }),
      ).toEqual({ kind: "no-access" });
    }
  });

  it("keeps an inaccessible organization scope in place while any Build access remains", () => {
    expect(
      resolveBuildScopeFallback({
        scope: ORGANIZATION_BUILD_SCOPE,
        isInaccessible: true,
        hasAnyBuildAccess: true,
        accessibleParent: null,
      }),
    ).toEqual({ kind: "stay" });
  });
});
