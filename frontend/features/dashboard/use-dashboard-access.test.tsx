import { renderHook } from "@testing-library/react";
import { useDashboardAccess } from "./use-dashboard-access";

const accessState: {
  data: {
    isOrgOwner: boolean;
    scopes: Record<string, "all">;
  };
  isLoading: boolean;
  refetch: jest.Mock;
} = {
  data: { isOrgOwner: false, scopes: {} },
  isLoading: false,
  refetch: jest.fn(),
};

let enabledModules = ["PROJECTS"];

jest.mock("@/hooks/api/access", () => ({
  useAccess: () => accessState,
}));

jest.mock("@/hooks/api/access/org-modules", () => ({
  useEnabledModules: () => enabledModules,
}));

describe("useDashboardAccess module visibility", () => {
  beforeEach(() => {
    accessState.data = { isOrgOwner: false, scopes: {} };
    enabledModules = ["PROJECTS"];
  });

  it("hides Build dashboard surfaces from an unassigned member", () => {
    const { result } = renderHook(() => useDashboardAccess());
    expect(result.current.projectsEnabled).toBe(false);
  });

  it("shows Build dashboard surfaces to a Build module member", () => {
    accessState.data = {
      isOrgOwner: false,
      scopes: { "build:tickets:view": "all" },
    };
    const { result } = renderHook(() => useDashboardAccess());
    expect(result.current.projectsEnabled).toBe(true);
  });

  it("shows every enabled module surface to an organization admin", () => {
    enabledModules = ["PROJECTS", "CRM"];
    accessState.data = {
      isOrgOwner: false,
      scopes: { "build:view": "all", "crm:leads:view": "all" },
    };
    const { result } = renderHook(() => useDashboardAccess());
    expect(result.current.projectsEnabled).toBe(true);
    expect(result.current.crmEnabled).toBe(true);
  });

  it("keeps Build hidden when the organization disabled it", () => {
    enabledModules = [];
    accessState.data = {
      isOrgOwner: true,
      scopes: {},
    };
    const { result } = renderHook(() => useDashboardAccess());
    expect(result.current.projectsEnabled).toBe(false);
  });
});
