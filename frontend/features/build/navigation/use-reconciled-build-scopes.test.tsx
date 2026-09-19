import { renderHook } from "@testing-library/react";
import { useReconciledBuildScopes } from "./use-reconciled-build-scopes";
import { useBuildScopeResolve } from "@/hooks/api/build/scope-directory";
import type { BuildScopeResolvedRef } from "@/hooks/api/build/scope-directory";
import type { BuildScopeRef } from "./use-build-nav-preferences";

jest.mock("@/hooks/api/build/scope-directory", () => ({
  useBuildScopeResolve: jest.fn(),
}));

const mockResolve = useBuildScopeResolve as jest.MockedFunction<
  typeof useBuildScopeResolve
>;

function storedRef(overrides: Partial<BuildScopeRef> = {}): BuildScopeRef {
  return {
    key: "project:7",
    type: "project",
    id: "7",
    name: "Billing",
    parentPath: "Acme / Platform",
    parentKey: "product:3",
    projectKey: "BIL",
    href: "/build/7",
    ...overrides,
  };
}

function resolvedRef(
  overrides: Partial<BuildScopeResolvedRef> = {},
): BuildScopeResolvedRef {
  return {
    key: "project:7",
    type: "project",
    id: "7",
    name: "Billing",
    parentKey: "product:3",
    projectKey: "BIL",
    isArchived: false,
    parentPath: "Acme / Platform",
    clientPortalEnabled: null,
    ...overrides,
  };
}

function setResolved(refs: BuildScopeResolvedRef[]): void {
  mockResolve.mockReturnValue({
    data: { data: refs },
    isSuccess: true,
  } as ReturnType<typeof useBuildScopeResolve>);
}

describe("BSN-04-020/021 — reconciliation excludes revoked scopes before the caller renders them", () => {
  beforeEach(() => {
    mockResolve.mockReset();
  });

  it("when access changes and one of two stored scopes is revoked, only the accessible scope appears in entries", () => {
    const accessible = storedRef();
    const revoked = storedRef({
      key: "project:8",
      id: "8",
      name: "Revoked",
      href: "/build/8",
    });
    setResolved([resolvedRef()]);
    const { result } = renderHook(() =>
      useReconciledBuildScopes([accessible, revoked], jest.fn()),
    );
    expect(result.current.entries).toHaveLength(1);
    expect(result.current.entries[0]?.key).toBe("project:7");
  });

  it("entries is pruned before onPrune fires so no caller can render the revoked scope in reconciled state", () => {
    const accessible = storedRef();
    const revoked = storedRef({
      key: "project:8",
      id: "8",
      name: "Revoked",
      href: "/build/8",
    });
    const onPrune = jest.fn();
    setResolved([resolvedRef()]);
    const { result } = renderHook(() =>
      useReconciledBuildScopes([accessible, revoked], onPrune),
    );
    expect(result.current.entries.some((e) => e.key === "project:8")).toBe(false);
    expect(onPrune).toHaveBeenCalledWith(
      expect.not.arrayContaining([
        expect.objectContaining({ key: "project:8" }),
      ]),
    );
  });
});

describe("BSN-04-027 — stored preferences cannot resurrect an inaccessible scope after reconciliation", () => {
  beforeEach(() => {
    mockResolve.mockReset();
  });

  it("when the resolve response omits all stored keys, entries is empty and onPrune receives an empty list so storage is cleared", () => {
    const stale = storedRef();
    const onPrune = jest.fn();
    setResolved([]);
    const { result } = renderHook(() =>
      useReconciledBuildScopes([stale], onPrune),
    );
    expect(result.current.entries).toHaveLength(0);
    expect(onPrune).toHaveBeenCalledWith([]);
  });

  it("while resolve is pending stored entries are returned unchanged so the guard cannot cause a false empty state during loading", () => {
    const stored = storedRef();
    mockResolve.mockReturnValue({
      data: undefined,
      isSuccess: false,
    } as ReturnType<typeof useBuildScopeResolve>);
    const onPrune = jest.fn();
    const { result } = renderHook(() =>
      useReconciledBuildScopes([stored], onPrune),
    );
    expect(result.current.entries).toHaveLength(1);
    expect(onPrune).not.toHaveBeenCalled();
  });
});

describe("BSN-02-027 — starred off-page scope survives reconcile by id; revoked scope is pruned", () => {
  beforeEach(() => {
    mockResolve.mockReset();
  });

  it("a starred scope not on browse page one is found by the resolve-by-id call and kept in entries", () => {
    const offPage = storedRef({
      key: "project:999",
      id: "999",
      name: "Off-page",
      href: "/build/999",
    });
    setResolved([
      resolvedRef({ key: "project:999", id: "999", name: "Off-page" }),
    ]);
    const onPrune = jest.fn();
    const { result } = renderHook(() =>
      useReconciledBuildScopes([offPage], onPrune),
    );
    expect(result.current.entries).toHaveLength(1);
    expect(result.current.entries[0]?.key).toBe("project:999");
    expect(onPrune).not.toHaveBeenCalled();
  });

  it("when the resolve-by-id call does not return a stored key that scope is absent from entries even if it was starred", () => {
    const revokedStar = storedRef({
      key: "project:999",
      id: "999",
      name: "Revoked Star",
      href: "/build/999",
    });
    setResolved([]);
    const { result } = renderHook(() =>
      useReconciledBuildScopes([revokedStar], jest.fn()),
    );
    expect(result.current.entries).toHaveLength(0);
  });
});

describe("useReconciledBuildScopes — BSN-02-022 rename and move write-back", () => {
  beforeEach(() => {
    mockResolve.mockReset();
  });

  it("writes back a renamed scope even though the stored entry count is unchanged", () => {
    const onPrune = jest.fn();
    setResolved([resolvedRef({ name: "Billing and payments" })]);

    renderHook(() => useReconciledBuildScopes([storedRef()], onPrune));

    expect(onPrune).toHaveBeenCalledTimes(1);
    expect(onPrune.mock.calls[0]?.[0]?.[0]?.name).toBe("Billing and payments");
  });

  it("refreshes a moved scope's parent path from the server instead of trusting storage", () => {
    const onPrune = jest.fn();
    setResolved([
      resolvedRef({ parentKey: "workspace:ws-9", parentPath: "Acme / Growth" }),
    ]);

    renderHook(() => useReconciledBuildScopes([storedRef()], onPrune));

    expect(onPrune).toHaveBeenCalledTimes(1);
    expect(onPrune.mock.calls[0]?.[0]?.[0]?.parentPath).toBe("Acme / Growth");
  });

  it("does not write back when nothing changed, so reconciliation terminates", () => {
    const onPrune = jest.fn();
    setResolved([resolvedRef()]);

    const { rerender } = renderHook(() =>
      useReconciledBuildScopes([storedRef()], onPrune),
    );
    rerender();

    expect(onPrune).not.toHaveBeenCalled();
  });

  it("drops a scope the resolve response omits because access was revoked", () => {
    const onPrune = jest.fn();
    setResolved([]);

    const { result } = renderHook(() =>
      useReconciledBuildScopes([storedRef()], onPrune),
    );

    expect(result.current.entries).toEqual([]);
    expect(onPrune).toHaveBeenCalledWith([]);
  });

  it("keeps stored entries untouched until the resolve succeeds", () => {
    const onPrune = jest.fn();
    mockResolve.mockReturnValue({
      data: undefined,
      isSuccess: false,
    } as ReturnType<typeof useBuildScopeResolve>);

    const { result } = renderHook(() =>
      useReconciledBuildScopes([storedRef()], onPrune),
    );

    expect(result.current.entries).toHaveLength(1);
    expect(onPrune).not.toHaveBeenCalled();
  });

  it("keeps a starred scope that resolves by id even when it is outside the browse page", () => {
    const offPage = storedRef({
      key: "project:999",
      id: "999",
      name: "Off-page project",
      href: "/build/999",
    });
    setResolved([
      resolvedRef({
        key: "project:999",
        id: "999",
        name: "Off-page project",
      }),
    ]);

    const { result } = renderHook(() =>
      useReconciledBuildScopes([offPage], jest.fn()),
    );

    expect(result.current.entries).toEqual([offPage]);
  });
});
