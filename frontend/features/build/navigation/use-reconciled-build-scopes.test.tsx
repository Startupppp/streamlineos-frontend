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
});
