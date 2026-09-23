"use client";

import { useMemo } from "react";
import { useAccess } from "@/hooks/api/access";
import { useEnabledModules } from "@/hooks/api/access/org-modules";
import { homeSectionPermission } from "@/lib/home/home-sections";
import { matchesOrgModule } from "@/lib/org-module-keys";
import type { PermissionKey } from "@/lib/rbac/permissions";

export interface DashboardAccess {
  accessLoading: boolean;
  accessResolved: boolean;
  refetchAccess: () => void;
  hrEnabled: boolean;
  crmEnabled: boolean;
  projectsEnabled: boolean;
  payrollEnabled: boolean;
  signEnabled: boolean;
  canViewEmployees: boolean;
  canCreateEmployees: boolean;
  canViewAttendance: boolean;
  canSelfAttendance: boolean;
  canViewLeaves: boolean;
  canApproveLeaves: boolean;
  canViewExecutive: boolean;
  canViewCrmLeads: boolean;
  canViewCrmReports: boolean;
  canViewTickets: boolean;
  canViewPayrollSelf: boolean;
  canViewSignEnvelopes: boolean;
}

export function useDashboardAccess(): DashboardAccess {
  const { data, isLoading, refetch } = useAccess();
  const enabledModules = useEnabledModules();

  return useMemo(() => {
    const moduleOn = (name: string) => matchesOrgModule(enabledModules, name);
    const owner = data?.isOrgOwner ?? false;
    const scopes = data?.scopes ?? {};
    const can = (key: PermissionKey) => owner || key in scopes;
    const canUseBuild =
      owner ||
      Object.keys(scopes).some(
        (key) =>
          key.startsWith("build:") || key.startsWith("integrations:git:"),
      );
    const canSection = (id: string) => {
      const key = homeSectionPermission(id);
      return key === null ? true : can(key);
    };

    return {
      accessLoading: isLoading,
      accessResolved: data !== undefined,
      refetchAccess: () => void refetch(),
      hrEnabled: moduleOn("HR"),
      crmEnabled: moduleOn("CRM"),
      projectsEnabled: moduleOn("PROJECTS") && canUseBuild,
      payrollEnabled: moduleOn("PAYROLL"),
      signEnabled: moduleOn("SIGN"),
      canViewEmployees: can("hr:employees:view"),
      canCreateEmployees: can("hr:employees:create"),
      canViewAttendance: canSection("team-attendance"),
      canSelfAttendance: can("self:attendance"),
      canViewLeaves: canSection("leaves-today"),
      canApproveLeaves: canSection("pending-approvals"),
      canViewExecutive: canSection("executive"),
      canViewCrmLeads: canSection("today-activities"),
      canViewCrmReports: can("crm:reports:view"),
      canViewTickets: canSection("recent-activity"),
      canViewPayrollSelf: can("self:payroll"),
      canViewSignEnvelopes: can("sign:envelope:view"),
    };
  }, [data, isLoading, refetch, enabledModules]);
}
