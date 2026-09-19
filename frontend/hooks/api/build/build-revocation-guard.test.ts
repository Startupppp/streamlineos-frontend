import { renderHook, act, waitFor } from "@testing-library/react";
import { resolveBuildScopeFallback } from "@/lib/build/build-scope-fallback";
import { useReconciledBuildScopes } from "@/features/build/navigation/use-reconciled-build-scopes";
import { useBuildScopeResolve } from "@/hooks/api/build/scope-directory";
import { useBuildScopeStars } from "@/features/build/navigation/use-build-nav-preferences";
import type { BuildScopeResolvedRef } from "@/hooks/api/build/scope-directory";
import type { BuildScopeRef } from "@/features/build/navigation/use-build-nav-preferences";

jest.mock("@/hooks/api/build/scope-directory", () => ({
  useBuildScopeResolve: jest.fn(),
  BUILD_SCOPE_RESOLVE_LIMIT: 26,
}));

const mockResolve = useBuildScopeResolve as jest.MockedFunction<
  typeof useBuildScopeResolve
>;

function makeResolvedRef(
  overrides: Partial<BuildScopeResolvedRef> = {},
): BuildScopeResolvedRef {
  return {
    key: "project:1",
    type: "project",
    id: "1",
    name: "Alpha",
    parentKey: null,
    projectKey: "ALP",
    isArchived: false,
    parentPath: null,
    clientPortalEnabled: null,
    ...overrides,
  };
}

function makeStoredRef(overrides: Partial<BuildScopeRef> = {}): BuildScopeRef {
  return {
    key: "project:1",
    type: "project",
    id: "1",
    name: "Alpha",
    parentPath: null,
    parentKey: null,
    projectKey: "ALP",
    href: "/build/1",
    ...overrides,
  };
}

function setResolved(refs: BuildScopeResolvedRef[]): void {
  mockResolve.mockReturnValue({
    data: { data: refs },
    isSuccess: true,
  } as ReturnType<typeof useBuildScopeResolve>);
}

describe("BSN-04-020/021 — reconciliation removes inaccessible entries before rendering reconciled state", () => {
  beforeEach(() => mockResolve.mockReset());

  it("when one of two stored scopes is omitted by the resolver after a membership change, only the accessible entry is returned in entries", () => {
    const accessible = makeStoredRef({ key: "project:1", name: "Alpha", href: "/build/1" });
    const revoked = makeStoredRef({ key: "project:2", id: "2", name: "Revoked", href: "/build/2" });
    setResolved([makeResolvedRef({ key: "project:1" })]);

    const { result } = renderHook(() =>
      useReconciledBuildScopes([accessible, revoked], jest.fn()),
    );

    expect(result.current.entries).toHaveLength(1);
    expect(result.current.entries[0]?.key).toBe("project:1");
  });

  it("the entries field is already pruned before onPrune fires, so the sidebar never renders the revoked entry", () => {
    const accessible = makeStoredRef({ key: "project:1" });
    const revoked = makeStoredRef({ key: "project:2", id: "2", name: "Revoked", href: "/build/2" });
    const onPrune = jest.fn();
    setResolved([makeResolvedRef({ key: "project:1" })]);

    const { result } = renderHook(() =>
      useReconciledBuildScopes([accessible, revoked], onPrune),
    );

    const prunedEntries: readonly BuildScopeRef[] = result.current.entries;
    expect(prunedEntries.some((e) => e.key === "project:2")).toBe(false);
    expect(onPrune).toHaveBeenCalledWith(
      expect.arrayContaining([expect.objectContaining({ key: "project:1" })]),
    );
    expect(onPrune.mock.calls[0]?.[0]).toHaveLength(1);
  });

  it("when all scopes are revoked simultaneously the entries list is empty and onPrune receives an empty array", () => {
    const a = makeStoredRef({ key: "project:1" });
    const b = makeStoredRef({ key: "product:5", id: "5", type: "product", href: "/build/managed-products/5" });
    const onPrune = jest.fn();
    setResolved([]);

    const { result } = renderHook(() =>
      useReconciledBuildScopes([a, b], onPrune),
    );

    expect(result.current.entries).toHaveLength(0);
    expect(onPrune).toHaveBeenCalledWith([]);
  });

  it("while resolution is pending the stored entries are served unchanged so the sidebar stays populated", () => {
    const stored = [makeStoredRef({ key: "project:1" })];
    mockResolve.mockReturnValue({
      data: undefined,
      isSuccess: false,
    } as ReturnType<typeof useBuildScopeResolve>);

    const { result } = renderHook(() =>
      useReconciledBuildScopes(stored, jest.fn()),
    );

    expect(result.current.entries).toHaveLength(1);
    expect(result.current.isReconciled).toBe(false);
  });
});

describe("BSN-04-026 — recovery notice reveals no restricted scope name or metadata", () => {
  it("fallback label for inaccessible project with an accessible product parent contains no project ID or product ID", () => {
    const fallback = resolveBuildScopeFallback({
      scope: {
        type: "project",
        projectId: 99,
        managedProductId: 5,
        pmWorkspaceId: null,
      },
      isInaccessible: true,
      hasAnyBuildAccess: true,
      accessibleParent: { type: "product", id: "5" },
    });

    expect(fallback.kind).toBe("recover");
    if (fallback.kind === "recover") {
      expect(fallback.label).not.toContain("99");
      expect(fallback.label).not.toContain("5");
      expect(fallback.label).not.toContain("project:99");
    }
  });

  it("fallback label when falling back to All of Build exposes no scope identity", () => {
    const fallback = resolveBuildScopeFallback({
      scope: {
        type: "project",
        projectId: 42,
        managedProductId: null,
        pmWorkspaceId: null,
      },
      isInaccessible: true,
      hasAnyBuildAccess: true,
      accessibleParent: null,
    });

    expect(fallback.kind).toBe("recover");
    if (fallback.kind === "recover") {
      expect(fallback.label).toBe("Go to All of Build");
      expect(fallback.label).not.toContain("42");
    }
  });

  it("fallback href for accessible product parent does not embed the inaccessible project ID", () => {
    const fallback = resolveBuildScopeFallback({
      scope: {
        type: "project",
        projectId: 99,
        managedProductId: 5,
        pmWorkspaceId: null,
      },
      isInaccessible: true,
      hasAnyBuildAccess: true,
      accessibleParent: { type: "product", id: "5" },
    });

    expect(fallback.kind).toBe("recover");
    if (fallback.kind === "recover") {
      expect(fallback.href).not.toContain("99");
      expect(fallback.href).toContain("managed-products/5");
    }
  });
});

describe("BSN-04-027 — stale recents, stars, and deep links cannot bypass authorization", () => {
  it("an inaccessible project with any Build access results in recover not stay, so the user is redirected instead of served stale content", () => {
    const fallback = resolveBuildScopeFallback({
      scope: { type: "project", projectId: 10, managedProductId: null, pmWorkspaceId: null },
      isInaccessible: true,
      hasAnyBuildAccess: true,
      accessibleParent: null,
    });
    expect(fallback.kind).not.toBe("stay");
    expect(fallback.kind).toBe("recover");
  });

  it("an inaccessible product with any Build access results in recover rather than exposing the product", () => {
    const fallback = resolveBuildScopeFallback({
      scope: { type: "product", projectId: null, managedProductId: 8, pmWorkspaceId: null },
      isInaccessible: true,
      hasAnyBuildAccess: true,
      accessibleParent: null,
    });
    expect(fallback.kind).not.toBe("stay");
  });

  it("an inaccessible scope with no remaining Build access results in no-access rather than a parent redirect", () => {
    const fallback = resolveBuildScopeFallback({
      scope: { type: "project", projectId: 10, managedProductId: null, pmWorkspaceId: null },
      isInaccessible: true,
      hasAnyBuildAccess: false,
      accessibleParent: { type: "workspace", id: "ws-1" },
    });
    expect(fallback.kind).toBe("no-access");
  });
});

describe("BSN-04-035 — cross-tab storage event updates hook state", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("a storage event from another tab causes useBuildScopeStars to reflect the updated list without requiring a page reload", async () => {
    const storageKey = "unscoped::build-scope-stars";
    const scopeRef: BuildScopeRef = {
      key: "project:55",
      type: "project",
      id: "55",
      name: "Payments",
      parentPath: null,
      parentKey: null,
      projectKey: "PAY",
      href: "/build/55",
    };
    localStorage.setItem(storageKey, JSON.stringify([scopeRef]));

    const { result } = renderHook(() => useBuildScopeStars());
    await waitFor(() => expect(result.current.starred).toHaveLength(1));

    localStorage.setItem(storageKey, JSON.stringify([]));
    act(() => {
      window.dispatchEvent(
        new StorageEvent("storage", { key: storageKey, newValue: JSON.stringify([]) }),
      );
    });

    await waitFor(() => expect(result.current.starred).toHaveLength(0));
  });

  it("a storage event with a null key (storage cleared) resets the stars list to empty", async () => {
    const storageKey = "unscoped::build-scope-stars";
    const scopeRef: BuildScopeRef = {
      key: "workspace:w1",
      type: "workspace",
      id: "w1",
      name: "Platform",
      parentPath: null,
      parentKey: null,
      projectKey: null,
      href: "/build/workspaces/w1",
    };
    localStorage.setItem(storageKey, JSON.stringify([scopeRef]));

    const { result } = renderHook(() => useBuildScopeStars());
    await waitFor(() => expect(result.current.starred).toHaveLength(1));

    localStorage.clear();
    act(() => {
      window.dispatchEvent(new StorageEvent("storage", { key: null }));
    });

    await waitFor(() => expect(result.current.starred).toHaveLength(0));
  });
});
