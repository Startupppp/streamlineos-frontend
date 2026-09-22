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

describe("useDashboardAccess dead-field removal — five fields deleted in the T1 clean-up", () => {
  it("does not expose accountingEnabled — real consumers call useModuleEnabled directly", () => {
    const { result } = renderHook(() => useDashboardAccess());
    expect("accountingEnabled" in result.current).toBe(false);
  });

  it("does not expose canViewOnboardingDocsSummary — public-documents-card calls useCan directly", () => {
    const { result } = renderHook(() => useDashboardAccess());
    expect("canViewOnboardingDocsSummary" in result.current).toBe(false);
  });

  it("does not expose canViewExpenses — expenses-widget calls useCan directly", () => {
    const { result } = renderHook(() => useDashboardAccess());
    expect("canViewExpenses" in result.current).toBe(false);
  });

  it("does not expose canCreateExpenses — expenses-widget calls useCan directly", () => {
    const { result } = renderHook(() => useDashboardAccess());
    expect("canCreateExpenses" in result.current).toBe(false);
  });

  it("does not expose canApproveExpenses — expenses-widget calls useCan directly", () => {
    const { result } = renderHook(() => useDashboardAccess());
    expect("canApproveExpenses" in result.current).toBe(false);
  });

  it("positive control — surviving gating fields are still present and correctly computed", () => {
    enabledModules = ["HR", "CRM"];
    accessState.data = {
      isOrgOwner: false,
      scopes: {
        "hr:employees:view": "all",
        "hr:employees:create": "all",
        "crm:leads:view": "all",
        "sign:envelope:view": "all",
      },
    };
    const { result } = renderHook(() => useDashboardAccess());
    expect(result.current.hrEnabled).toBe(true);
    expect(result.current.crmEnabled).toBe(true);
    expect(result.current.canViewEmployees).toBe(true);
    expect(result.current.canCreateEmployees).toBe(true);
    expect(result.current.canViewCrmLeads).toBe(true);
    expect(result.current.canViewSignEnvelopes).toBe(true);
    expect(result.current.canViewPayrollSelf).toBe(false);
  });
});
