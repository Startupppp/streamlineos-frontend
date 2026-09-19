import { act, renderHook } from "@testing-library/react";
import type { ReactNode } from "react";
import { createElement } from "react";
import {
  OrgStorageScopeProvider,
  orgScopedStorageKey,
} from "@/lib/org-scoped-storage";
import {
  useBuildNavPins,
  useBuildScopeStars,
  useBuildScopeRecents,
} from "./use-build-nav-preferences";
import type { BuildScopeRef } from "./use-build-nav-preferences";

const SCOPE_ORG_A_USER_1 = "authenticated:org-a:user-1";
const SCOPE_ORG_A_USER_2 = "authenticated:org-a:user-2";
const SCOPE_ORG_B_USER_1 = "authenticated:org-b:user-1";

function wrapWith(scope: string) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return createElement(OrgStorageScopeProvider, { scope }, children);
  };
}

function makeScopeRef(overrides: Partial<BuildScopeRef> = {}): BuildScopeRef {
  return {
    key: "ws-1",
    type: "workspace",
    id: "ws-id-1",
    name: "Workspace One",
    parentPath: null,
    parentKey: null,
    projectKey: null,
    href: "/build/workspaces/ws-id-1",
    ...overrides,
  };
}

beforeEach(() => {
  window.localStorage.clear();
});

describe("BSN-03-031 — pin prune after permission change", () => {
  test("pruning writes a filtered list when a tool loses authorization", () => {
    const scope = "authenticated:org-prune:user-1";
    const { result, rerender } = renderHook(
      ({ authIds }: { authIds: string[] }) => useBuildNavPins(authIds, true),
      {
        initialProps: { authIds: ["tool-a", "tool-b"] },
        wrapper: wrapWith(scope),
      },
    );

    act(() => {
      result.current.togglePin("tool-a");
    });
    expect(result.current.isPinned("tool-a")).toBe(true);

    act(() => {
      rerender({ authIds: ["tool-b"] });
    });

    expect(result.current.isPinned("tool-a")).toBe(false);
    expect(result.current.pinnedIds).toHaveLength(0);
  });

  test("pruning does not write when all pinned ids are still authorized", () => {
    const scope = "authenticated:org-no-prune:user-1";
    const { result, rerender } = renderHook(
      ({ authIds }: { authIds: string[] }) => useBuildNavPins(authIds, true),
      {
        initialProps: { authIds: ["tool-a", "tool-b"] },
        wrapper: wrapWith(scope),
      },
    );

    act(() => {
      result.current.togglePin("tool-b");
    });
    const pinsBefore = result.current.pinnedIds.slice();

    act(() => {
      rerender({ authIds: ["tool-a", "tool-b"] });
    });

    expect(result.current.pinnedIds).toEqual(pinsBefore);
  });

  test("pruning does not run while access is still loading, even though no tool is authorized yet", () => {
    const scope = "authenticated:org-loading:user-1";
    const { result, rerender } = renderHook(
      ({ authIds, resolved }: { authIds: string[]; resolved: boolean }) =>
        useBuildNavPins(authIds, resolved),
      {
        initialProps: { authIds: ["tool-a", "tool-b"], resolved: true },
        wrapper: wrapWith(scope),
      },
    );

    act(() => {
      result.current.togglePin("tool-a");
    });
    expect(result.current.isPinned("tool-a")).toBe(true);

    act(() => {
      rerender({ authIds: [], resolved: false });
    });

    expect(result.current.isPinned("tool-a")).toBe(true);
    expect(result.current.pinnedIds).toContain("tool-a");
  });

  test("losing every Build tool prunes every pin rather than leaving them stranded in storage", () => {
    const scope = "authenticated:org-revoked-all:user-1";
    const { result, rerender } = renderHook(
      ({ authIds, resolved }: { authIds: string[]; resolved: boolean }) =>
        useBuildNavPins(authIds, resolved),
      {
        initialProps: { authIds: ["tool-a", "tool-b"], resolved: true },
        wrapper: wrapWith(scope),
      },
    );

    act(() => {
      result.current.togglePin("tool-a");
    });
    expect(result.current.isPinned("tool-a")).toBe(true);

    act(() => {
      rerender({ authIds: [], resolved: true });
    });

    expect(result.current.pinnedIds).toEqual([]);
  });

  test("pruning terminates — a second render with the same authorized set does not write again", () => {
    const scope = "authenticated:org-term:user-1";
    const writeSpy = jest.spyOn(Storage.prototype, "setItem");
    const { result, rerender } = renderHook(
      ({ authIds }: { authIds: string[] }) => useBuildNavPins(authIds, true),
      {
        initialProps: { authIds: ["tool-a", "tool-b"] },
        wrapper: wrapWith(scope),
      },
    );

    act(() => {
      result.current.togglePin("tool-a");
    });
    writeSpy.mockClear();

    act(() => {
      rerender({ authIds: ["tool-b"] });
    });
    const writesAfterPrune = writeSpy.mock.calls.length;

    act(() => {
      rerender({ authIds: ["tool-b"] });
    });
    const writesAfterSecondRender = writeSpy.mock.calls.length;

    expect(writesAfterSecondRender).toBe(writesAfterPrune);
    writeSpy.mockRestore();
  });
});

describe("BSN-02-024 — scope isolation by org AND actor", () => {
  test("orgScopedStorageKey embeds both the org segment and the actor segment", () => {
    const key = orgScopedStorageKey("build-nav-pins", SCOPE_ORG_A_USER_1);
    expect(key).toContain("org-a");
    expect(key).toContain("user-1");
    expect(key).toContain("build-nav-pins");
  });

  test("pins written by actor-1 in org-A are invisible to actor-2 in org-A", () => {
    const { result: resultUser1 } = renderHook(
      () => useBuildNavPins(["tool-a"], true),
      { wrapper: wrapWith(SCOPE_ORG_A_USER_1) },
    );

    act(() => {
      resultUser1.current.togglePin("tool-a");
    });
    expect(resultUser1.current.isPinned("tool-a")).toBe(true);

    const { result: resultUser2 } = renderHook(
      () => useBuildNavPins(["tool-a"], true),
      { wrapper: wrapWith(SCOPE_ORG_A_USER_2) },
    );
    expect(resultUser2.current.isPinned("tool-a")).toBe(false);
  });

  test("pins written by actor-1 in org-A cannot clobber actor-1's pins in org-B", () => {
    const { result: resultOrgA } = renderHook(
      () => useBuildNavPins(["tool-a", "tool-b"], true),
      { wrapper: wrapWith(SCOPE_ORG_A_USER_1) },
    );
    const { result: resultOrgB } = renderHook(
      () => useBuildNavPins(["tool-a", "tool-b"], true),
      { wrapper: wrapWith(SCOPE_ORG_B_USER_1) },
    );

    act(() => {
      resultOrgA.current.togglePin("tool-a");
    });
    act(() => {
      resultOrgB.current.togglePin("tool-b");
    });

    expect(resultOrgA.current.isPinned("tool-a")).toBe(true);
    expect(resultOrgA.current.isPinned("tool-b")).toBe(false);
    expect(resultOrgB.current.isPinned("tool-b")).toBe(true);
    expect(resultOrgB.current.isPinned("tool-a")).toBe(false);
  });

  test("a cross-tab storage event reconciles pin state without duplicating", () => {
    const scope = "authenticated:org-xt:user-xt";
    const storageKey = `${scope}::build-nav-pins`;

    const { result } = renderHook(() => useBuildNavPins(["tool-a", "tool-b"], true), {
      wrapper: wrapWith(scope),
    });

    window.localStorage.setItem(storageKey, JSON.stringify(["tool-a"]));
    act(() => {
      window.dispatchEvent(
        new StorageEvent("storage", {
          key: storageKey,
          storageArea: window.localStorage,
        }),
      );
    });

    expect(result.current.pinnedIds).toEqual(["tool-a"]);
    expect(result.current.isPinned("tool-a")).toBe(true);
    expect(result.current.isPinned("tool-b")).toBe(false);
  });

  test("a cross-tab storage event for a different scope key is ignored", () => {
    const scope = "authenticated:org-ignore:user-ignore";
    const otherKey = "authenticated:org-other:user-other::build-nav-pins";

    const { result } = renderHook(() => useBuildNavPins(["tool-a"], true), {
      wrapper: wrapWith(scope),
    });

    act(() => {
      result.current.togglePin("tool-a");
    });

    window.localStorage.setItem(otherKey, JSON.stringify([]));
    act(() => {
      window.dispatchEvent(
        new StorageEvent("storage", {
          key: otherKey,
          storageArea: window.localStorage,
        }),
      );
    });

    expect(result.current.isPinned("tool-a")).toBe(true);
  });

  test("stars and recents are also isolated by org and actor", () => {
    const ref = makeScopeRef();

    const { result: starsA } = renderHook(() => useBuildScopeStars(), {
      wrapper: wrapWith(SCOPE_ORG_A_USER_1),
    });
    const { result: recentsA } = renderHook(() => useBuildScopeRecents(), {
      wrapper: wrapWith(SCOPE_ORG_A_USER_1),
    });

    act(() => {
      starsA.current.toggleStar(ref);
      recentsA.current.recordScope(ref);
    });

    const { result: starsUser2 } = renderHook(() => useBuildScopeStars(), {
      wrapper: wrapWith(SCOPE_ORG_A_USER_2),
    });
    const { result: recentsUser2 } = renderHook(() => useBuildScopeRecents(), {
      wrapper: wrapWith(SCOPE_ORG_A_USER_2),
    });

    expect(starsUser2.current.isStarred(ref.key)).toBe(false);
    expect(recentsUser2.current.recents).toHaveLength(0);
  });
});
