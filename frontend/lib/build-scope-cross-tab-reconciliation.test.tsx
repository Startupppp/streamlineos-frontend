import { act, renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { OrgStorageScopeProvider, orgScopedStorageKey } from "@/lib/org-scoped-storage";
import {
  useBuildScopeRecents,
  useBuildNavPins,
} from "@/features/build/navigation/use-build-nav-preferences";
import type { BuildScopeRef } from "@/features/build/navigation/use-build-nav-preferences";
import { QueryClient } from "@tanstack/react-query";
import { scopedQueryKeyHashFn, authenticatedScope } from "@/lib/query-scope";

const SCOPE = "authenticated:org-alpha:user-1";
const OTHER_ORG_SCOPE = "authenticated:org-beta:user-1";
const AUTHORIZED_TOOLS = ["project-triage", "project-backlog"] as const;

const SCOPE_REF: BuildScopeRef = {
  key: "project:10",
  type: "project",
  id: "10",
  name: "Core Platform",
  parentPath: null,
  parentKey: null,
  projectKey: "CORE",
  href: "/build/10",
};

const SCOPE_REF_ALT: BuildScopeRef = {
  key: "project:20",
  type: "project",
  id: "20",
  name: "Payments",
  parentPath: null,
  parentKey: null,
  projectKey: "PAY",
  href: "/build/20",
};

function wrap(scope: string) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return <OrgStorageScopeProvider scope={scope}>{children}</OrgStorageScopeProvider>;
  };
}

beforeEach(() => {
  window.localStorage.clear();
});

describe("BSN-04-035 — cross-tab storage event updates recents", () => {
  it("a storage event written by another tab causes useBuildScopeRecents to reflect the new entry without a reload", async () => {
    const storageKey = orgScopedStorageKey("build-scope-recents", SCOPE);
    const { result } = renderHook(() => useBuildScopeRecents(), { wrapper: wrap(SCOPE) });
    expect(result.current.recents).toHaveLength(0);

    window.localStorage.setItem(storageKey, JSON.stringify([SCOPE_REF]));
    act(() => {
      window.dispatchEvent(
        new StorageEvent("storage", {
          key: storageKey,
          newValue: JSON.stringify([SCOPE_REF]),
        }),
      );
    });

    await waitFor(() => expect(result.current.recents).toHaveLength(1));
    expect(result.current.recents[0]?.key).toBe("project:10");
  });

  it("a null-key storage event after localStorage.clear() resets recents to empty", async () => {
    const storageKey = orgScopedStorageKey("build-scope-recents", SCOPE);
    window.localStorage.setItem(storageKey, JSON.stringify([SCOPE_REF]));

    const { result } = renderHook(() => useBuildScopeRecents(), { wrapper: wrap(SCOPE) });
    await waitFor(() => expect(result.current.recents).toHaveLength(1));

    window.localStorage.clear();
    act(() => {
      window.dispatchEvent(new StorageEvent("storage", { key: null }));
    });

    await waitFor(() => expect(result.current.recents).toHaveLength(0));
  });

  it("isolation bites: an other-org storage event does not cause the hook to re-read even when myKey has changed", () => {
    const myKey = orgScopedStorageKey("build-scope-recents", SCOPE);
    const otherKey = orgScopedStorageKey("build-scope-recents", OTHER_ORG_SCOPE);

    window.localStorage.setItem(myKey, JSON.stringify([SCOPE_REF]));
    const { result } = renderHook(() => useBuildScopeRecents(), { wrapper: wrap(SCOPE) });
    expect(result.current.recents[0]?.key).toBe("project:10");

    window.localStorage.setItem(myKey, JSON.stringify([SCOPE_REF_ALT]));

    act(() => {
      window.dispatchEvent(
        new StorageEvent("storage", {
          key: otherKey,
          newValue: JSON.stringify([]),
        }),
      );
    });

    expect(result.current.recents[0]?.key).toBe("project:10");
  });
});

describe("BSN-04-035 — cross-tab storage event updates pins", () => {
  it("a storage event written by another tab causes useBuildNavPins to reflect the new pin", async () => {
    const storageKey = orgScopedStorageKey("build-nav-pins", SCOPE);
    const { result } = renderHook(
      () => useBuildNavPins(AUTHORIZED_TOOLS, false),
      { wrapper: wrap(SCOPE) },
    );
    expect(result.current.pinnedIds).toHaveLength(0);

    window.localStorage.setItem(storageKey, JSON.stringify(["project-triage"]));
    act(() => {
      window.dispatchEvent(
        new StorageEvent("storage", {
          key: storageKey,
          newValue: JSON.stringify(["project-triage"]),
        }),
      );
    });

    await waitFor(() => expect(result.current.isPinned("project-triage")).toBe(true));
    expect(result.current.isPinned("project-backlog")).toBe(false);
  });

  it("a null-key storage event resets pins to empty", async () => {
    const storageKey = orgScopedStorageKey("build-nav-pins", SCOPE);
    window.localStorage.setItem(storageKey, JSON.stringify(["project-triage"]));

    const { result } = renderHook(
      () => useBuildNavPins(AUTHORIZED_TOOLS, false),
      { wrapper: wrap(SCOPE) },
    );
    await waitFor(() => expect(result.current.pinnedIds).toHaveLength(1));

    window.localStorage.clear();
    act(() => {
      window.dispatchEvent(new StorageEvent("storage", { key: null }));
    });

    await waitFor(() => expect(result.current.pinnedIds).toHaveLength(0));
    expect(result.current.isPinned("project-triage")).toBe(false);
  });

  it("isolation bites: an other-org pins event does not re-read the current org's pins key", () => {
    const myKey = orgScopedStorageKey("build-nav-pins", SCOPE);
    const otherKey = orgScopedStorageKey("build-nav-pins", OTHER_ORG_SCOPE);

    window.localStorage.setItem(myKey, JSON.stringify(["project-triage"]));
    const { result } = renderHook(
      () => useBuildNavPins(AUTHORIZED_TOOLS, false),
      { wrapper: wrap(SCOPE) },
    );
    expect(result.current.isPinned("project-triage")).toBe(true);

    window.localStorage.setItem(myKey, JSON.stringify([]));

    act(() => {
      window.dispatchEvent(
        new StorageEvent("storage", {
          key: otherKey,
          newValue: JSON.stringify(["project-backlog"]),
        }),
      );
    });

    expect(result.current.isPinned("project-triage")).toBe(true);
    expect(result.current.isPinned("project-backlog")).toBe(false);
  });
});

describe("BSN-04-035 — TanStack Query state is NOT synchronized across tabs", () => {
  it("two QueryClient instances with the same org scope do not share post-creation writes", () => {
    const scope = authenticatedScope("org-alpha", "user-1");
    const hashFn = scopedQueryKeyHashFn(scope);
    const key = ["streamlineos", "build", "workspaces", { limit: 10 }];
    const DATA = { data: [{ id: "ws-1" }] };

    const clientA = new QueryClient({
      defaultOptions: { queries: { queryKeyHashFn: hashFn } },
    });
    const clientB = new QueryClient({
      defaultOptions: { queries: { queryKeyHashFn: hashFn } },
    });
    clientA.setQueryData(key, DATA);

    expect(clientB.getQueryData(key)).toBeUndefined();

    clientA.clear();
    clientB.clear();
  });

  it("isolation bites: a plain QueryClient exposes data that a scoped Org B client keeps invisible", () => {
    const orgAScope = authenticatedScope("org-alpha", "user-1");
    const orgBScope = authenticatedScope("org-beta", "user-1");
    const key = ["streamlineos", "build", "workspaces"];
    const DATA = { data: [{ id: "ws-alpha" }] };

    const plainClient = new QueryClient();
    plainClient.setQueryData(key, DATA);
    expect(plainClient.getQueryData(key)).toEqual(DATA);

    const orgBClient = new QueryClient({
      defaultOptions: {
        queries: { queryKeyHashFn: scopedQueryKeyHashFn(orgBScope) },
      },
    });
    expect(orgBClient.getQueryData(key)).toBeUndefined();

    const orgAClient = new QueryClient({
      defaultOptions: {
        queries: { queryKeyHashFn: scopedQueryKeyHashFn(orgAScope) },
      },
    });
    orgAClient.setQueryData(key, DATA);
    expect(orgBClient.getQueryData(key)).toBeUndefined();

    plainClient.clear();
    orgAClient.clear();
    orgBClient.clear();
  });
});
