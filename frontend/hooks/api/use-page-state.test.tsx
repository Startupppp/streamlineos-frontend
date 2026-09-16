import { renderHook } from "@testing-library/react";
import { usePageState } from "./use-page-state";

jest.mock("@/hooks/api/access", () => ({
  useAccess: jest.fn(),
}));

jest.mock("@/hooks/api/entitlements", () => ({
  useEntitlements: jest.fn(),
}));

const { useAccess } = jest.requireMock("@/hooks/api/access") as {
  useAccess: jest.Mock;
};
const { useEntitlements } = jest.requireMock("@/hooks/api/entitlements") as {
  useEntitlements: jest.Mock;
};

function mockAccess(snapshot: { data: unknown; isLoading?: boolean }): void {
  useAccess.mockReturnValue({ data: snapshot.data, isLoading: snapshot.isLoading ?? false });
}

function mockEntitlements(snapshot: { data: unknown; isError?: boolean }): void {
  useEntitlements.mockReturnValue({ data: snapshot.data, isError: snapshot.isError ?? false });
}

beforeEach(() => {
  jest.clearAllMocks();
  mockEntitlements({ data: undefined });
});

describe("usePageState", () => {
  it("reports loading rather than availability while the access snapshot is in flight", () => {
    mockAccess({ data: undefined, isLoading: true });
    const { result } = renderHook(() => usePageState({ module: "hr", isLoading: false, isError: false }));
    expect(result.current).toEqual({ kind: "loading" });
  });

  it("calls a module plan-locked only when entitlements say so, not because it is plan-gated", () => {
    mockAccess({ data: { modules: { feedbucket: false }, scopes: {}, isOrgOwner: false } });
    mockEntitlements({ data: { lockedModules: ["payroll", "inventory"] } });
    const { result } = renderHook(() =>
      usePageState({ module: "feedbucket", isLoading: false, isError: false }),
    );
    expect(result.current).toEqual({ kind: "module-disabled", moduleKey: "feedbucket" });
  });

  it("does not hide a surface when the billing read fails", () => {
    mockAccess({ data: { modules: { payroll: false }, scopes: {}, isOrgOwner: false } });
    mockEntitlements({ data: undefined, isError: true });
    const { result } = renderHook(() =>
      usePageState({ module: "payroll", isLoading: false, isError: false }),
    );
    expect(result.current).toEqual({ kind: "module-disabled", moduleKey: "payroll" });
  });
});
