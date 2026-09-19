import { act, renderHook } from "@testing-library/react";
import type { ReactNode } from "react";
import { OrgStorageScopeProvider, orgScopedStorageKey } from "@/lib/org-scoped-storage";
import {
  useBuildScopeStars,
  useBuildScopeRecents,
  useBuildNavPins,
} from "@/features/build/navigation/use-build-nav-preferences";
import type { BuildScopeRef } from "@/features/build/navigation/use-build-nav-preferences";
import { QueryClient } from "@tanstack/react-query";
import { scopedQueryKeyHashFn, authenticatedScope } from "@/lib/query-scope";
import { platformCoreQueryKeys } from "@/lib/query-keys/platform-core";

const SCOPE_A = "authenticated:org-alpha:user-1";
const SCOPE_B = "authenticated:org-beta:user-1";
const AUTHORIZED_TOOLS = ["project-triage", "project-backlog"] as const;

const SCOPE_REF_A: BuildScopeRef = {
  key: "project:10",
  type: "project",
  id: "10",
  name: "Org Alpha Project",
  parentPath: null,
  parentKey: null,
  projectKey: "ALP",
  href: "/build/10",
};

function wrap(scope: string) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return <OrgStorageScopeProvider scope={scope}>{children}</OrgStorageScopeProvider>;
  };
}

beforeEach(() => {
  window.localStorage.clear();
});

describe("BSN-04-042 — stars do not cross org boundaries", () => {
  it("stars stored under Org A are invisible when the scope is Org B", () => {
    const keyA = orgScopedStorageKey("build-scope-stars", SCOPE_A);
    window.localStorage.setItem(keyA, JSON.stringify([SCOPE_REF_A]));

    const { result } = renderHook(() => useBuildScopeStars(), { wrapper: wrap(SCOPE_B) });
    expect(result.current.starred).toHaveLength(0);
    expect(result.current.isStarred("project:10")).toBe(false);
  });

  it("starring under Org A does NOT write to Org B's storage key", () => {
    const { result: resultA } = renderHook(() => useBuildScopeStars(), {
      wrapper: wrap(SCOPE_A),
    });
    act(() => {
      resultA.current.toggleStar(SCOPE_REF_A);
    });
    expect(resultA.current.starred).toHaveLength(1);

    const keyB = orgScopedStorageKey("build-scope-stars", SCOPE_B);
    expect(window.localStorage.getItem(keyB)).toBeNull();

    const { result: resultB } = renderHook(() => useBuildScopeStars(), {
      wrapper: wrap(SCOPE_B),
    });
    expect(resultB.current.starred).toHaveLength(0);
  });

  it("the scope selector for Org B does not surface Org A's starred href", () => {
    const keyA = orgScopedStorageKey("build-scope-stars", SCOPE_A);
    window.localStorage.setItem(keyA, JSON.stringify([SCOPE_REF_A]));

    const { result } = renderHook(() => useBuildScopeStars(), { wrapper: wrap(SCOPE_B) });
    const hrefs = result.current.starred.map((s) => s.href);
    expect(hrefs).not.toContain("/build/10");
  });

  it("isolation bites: a cross-org storage event for Org A's stars key does NOT update Org B's hook", () => {
    const keyA = orgScopedStorageKey("build-scope-stars", SCOPE_A);
    const { result } = renderHook(() => useBuildScopeStars(), { wrapper: wrap(SCOPE_B) });

    window.localStorage.setItem(keyA, JSON.stringify([SCOPE_REF_A]));
    act(() => {
      window.dispatchEvent(
        new StorageEvent("storage", {
          key: keyA,
          newValue: JSON.stringify([SCOPE_REF_A]),
        }),
      );
    });

    expect(result.current.starred).toHaveLength(0);
    expect(result.current.isStarred("project:10")).toBe(false);
  });
});

describe("BSN-04-042 — recents do not cross org boundaries", () => {
  it("recents recorded under Org A are invisible when the scope is Org B", () => {
    const keyA = orgScopedStorageKey("build-scope-recents", SCOPE_A);
    window.localStorage.setItem(keyA, JSON.stringify([SCOPE_REF_A]));

    const { result } = renderHook(() => useBuildScopeRecents(), { wrapper: wrap(SCOPE_B) });
    expect(result.current.recents).toHaveLength(0);
  });

  it("recording a scope under Org A does NOT appear in Org B's recents or expose the href", () => {
    const { result: resultA } = renderHook(() => useBuildScopeRecents(), {
      wrapper: wrap(SCOPE_A),
    });
    act(() => {
      resultA.current.recordScope(SCOPE_REF_A);
    });
    expect(resultA.current.recents).toHaveLength(1);

    const { result: resultB } = renderHook(() => useBuildScopeRecents(), {
      wrapper: wrap(SCOPE_B),
    });
    expect(resultB.current.recents).toHaveLength(0);
    expect(resultB.current.recents.map((r) => r.href)).not.toContain("/build/10");
  });

  it("isolation bites: a cross-org storage event for Org A's recents does NOT update Org B's hook", () => {
    const keyA = orgScopedStorageKey("build-scope-recents", SCOPE_A);
    const { result } = renderHook(() => useBuildScopeRecents(), { wrapper: wrap(SCOPE_B) });

    window.localStorage.setItem(keyA, JSON.stringify([SCOPE_REF_A]));
    act(() => {
      window.dispatchEvent(
        new StorageEvent("storage", {
          key: keyA,
          newValue: JSON.stringify([SCOPE_REF_A]),
        }),
      );
    });

    expect(result.current.recents).toHaveLength(0);
  });
});

describe("BSN-04-042 — pins do not cross org boundaries", () => {
  it("pins written under Org A are not active under Org B", () => {
    const keyA = orgScopedStorageKey("build-nav-pins", SCOPE_A);
    window.localStorage.setItem(keyA, JSON.stringify(["project-triage"]));

    const { result } = renderHook(
      () => useBuildNavPins(AUTHORIZED_TOOLS, false),
      { wrapper: wrap(SCOPE_B) },
    );
    expect(result.current.isPinned("project-triage")).toBe(false);
    expect(result.current.pinnedIds).toHaveLength(0);
  });

  it("pinning under Org A does NOT write to Org B's pins storage key", () => {
    const { result: resultA } = renderHook(
      () => useBuildNavPins(AUTHORIZED_TOOLS, false),
      { wrapper: wrap(SCOPE_A) },
    );
    act(() => {
      resultA.current.togglePin("project-triage");
    });
    expect(resultA.current.isPinned("project-triage")).toBe(true);

    const keyB = orgScopedStorageKey("build-nav-pins", SCOPE_B);
    expect(window.localStorage.getItem(keyB)).toBeNull();

    const { result: resultB } = renderHook(
      () => useBuildNavPins(AUTHORIZED_TOOLS, false),
      { wrapper: wrap(SCOPE_B) },
    );
    expect(resultB.current.pinnedIds).toHaveLength(0);
  });
});

describe("BSN-04-042 — Query cache does not cross org boundaries", () => {
  it("workspace data written under Org A's hash is invisible under Org B's hash", () => {
    const scopeA = authenticatedScope("org-alpha", "user-1");
    const scopeB = authenticatedScope("org-beta", "user-1");
    const key = ["streamlineos", "build", "workspaces", { limit: 10 }];
    const DATA = { data: [{ id: "ws-alpha", name: "Alpha WS" }] };

    const clientA = new QueryClient({
      defaultOptions: { queries: { queryKeyHashFn: scopedQueryKeyHashFn(scopeA) } },
    });
    const clientB = new QueryClient({
      defaultOptions: { queries: { queryKeyHashFn: scopedQueryKeyHashFn(scopeB) } },
    });
    clientA.setQueryData(key, DATA);

    expect(clientB.getQueryData(key)).toBeUndefined();

    clientA.clear();
    clientB.clear();
  });

  it("switching org scope produces different hashes so Pulse and inbox-count data cannot leak", () => {
    const scopeA = authenticatedScope("org-alpha", "user-1");
    const scopeB = authenticatedScope("org-beta", "user-1");
    const agentPulseKey = ["streamlineos", "build", "agent-pulse"];
    const inboxCountKey = ["streamlineos", "approvals", "inbox-count"];

    const hashA = scopedQueryKeyHashFn(scopeA);
    const hashB = scopedQueryKeyHashFn(scopeB);

    expect(hashA(agentPulseKey)).not.toBe(hashB(agentPulseKey));
    expect(hashA(inboxCountKey)).not.toBe(hashB(inboxCountKey));
  });

  it("isolation bites: a plain QueryClient without scope lets Org B read Org A's scoped data", () => {
    const scopeA = authenticatedScope("org-alpha", "user-1");
    const key = ["streamlineos", "build", "managed-products"];
    const DATA = { data: [{ id: "mp-1", name: "Alpha Product" }] };

    const orgAClient = new QueryClient({
      defaultOptions: { queries: { queryKeyHashFn: scopedQueryKeyHashFn(scopeA) } },
    });
    orgAClient.setQueryData(key, DATA);

    const scopeB = authenticatedScope("org-beta", "user-1");
    const orgBClient = new QueryClient({
      defaultOptions: { queries: { queryKeyHashFn: scopedQueryKeyHashFn(scopeB) } },
    });
    expect(orgBClient.getQueryData(key)).toBeUndefined();

    const plainClient = new QueryClient();
    plainClient.setQueryData(key, DATA);
    expect(plainClient.getQueryData(key)).toEqual(DATA);

    orgAClient.clear();
    orgBClient.clear();
    plainClient.clear();
  });
});

describe("BSN-04-042 — direct route access cannot use another org's permissions", () => {
  it("org B's scoped QueryClient cannot read org A's cached access data, so direct route access for org B routes cannot be satisfied by org A's permissions", () => {
    const orgAScope = authenticatedScope("org-alpha", "user-1");
    const orgBScope = authenticatedScope("org-beta", "user-1");
    const accessKey = platformCoreQueryKeys.access.me();
    const orgAAccessData = {
      isOrgOwner: false,
      scopes: { "build:view": "all" },
      modules: { build: true },
      canManageOrganizationMembership: false,
    };

    const clientA = new QueryClient({
      defaultOptions: { queries: { queryKeyHashFn: scopedQueryKeyHashFn(orgAScope) } },
    });
    const clientB = new QueryClient({
      defaultOptions: { queries: { queryKeyHashFn: scopedQueryKeyHashFn(orgBScope) } },
    });

    clientA.setQueryData(accessKey, orgAAccessData);

    expect(clientB.getQueryData(accessKey)).toBeUndefined();

    clientA.clear();
    clientB.clear();
  });

  it("isolation bites: a plain QueryClient without a scope hash CAN read the access data, which is the failure mode the scoped hash prevents for direct route access", () => {
    const orgAScope = authenticatedScope("org-alpha", "user-1");
    const accessKey = platformCoreQueryKeys.access.me();
    const orgAAccessData = {
      isOrgOwner: false,
      scopes: { "build:view": "all" },
      modules: {},
      canManageOrganizationMembership: false,
    };

    const plainClient = new QueryClient();
    const scopedClientA = new QueryClient({
      defaultOptions: { queries: { queryKeyHashFn: scopedQueryKeyHashFn(orgAScope) } },
    });

    plainClient.setQueryData(accessKey, orgAAccessData);
    expect(plainClient.getQueryData(accessKey)).toEqual(orgAAccessData);

    scopedClientA.setQueryData(accessKey, orgAAccessData);
    const orgBScope = authenticatedScope("org-beta", "user-1");
    const scopedClientB = new QueryClient({
      defaultOptions: { queries: { queryKeyHashFn: scopedQueryKeyHashFn(orgBScope) } },
    });
    expect(scopedClientB.getQueryData(accessKey)).toBeUndefined();

    plainClient.clear();
    scopedClientA.clear();
    scopedClientB.clear();
  });

  it("access keys for two orgs produce distinct hashes so the route access check in org B returns undefined, not org A's granted permissions", () => {
    const hashA = scopedQueryKeyHashFn(authenticatedScope("org-alpha", "user-1"));
    const hashB = scopedQueryKeyHashFn(authenticatedScope("org-beta", "user-1"));
    const accessKey = platformCoreQueryKeys.access.me();
    expect(hashA(accessKey)).not.toBe(hashB(accessKey));
  });
});
