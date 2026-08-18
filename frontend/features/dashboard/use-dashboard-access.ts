"use client";

import { useMemo } from "react";
import { useAccess } from "@/hooks/api/access";
import { useEnabledModules } from "@/hooks/api/access/org-modules";
import { matchesOrgModule } from "@/lib/module-vocabulary";
import type { PermissionKey } from "@/lib/rbac/permissions";

export interface DashboardAccess {
  accessLoading: boolean;
  hrEnabled: boolean;
  crmEnabled: boolean;
  projectsEnabled: boolean;
  payrollEnabled: boolean;
  signEnabled: boolean;
  accountingEnabled: boolean;
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
  canViewPayrollAdmin: boolean;
  canViewOnboardingDocsSummary: boolean;
  canViewExpenses: boolean;
  canCreateExpenses: boolean;
  canApproveExpenses: boolean;
  canViewInterviews: boolean;
  canViewSignEnvelopes: boolean;
}

export function useDashboardAccess(): DashboardAccess {
  const { data, isLoading } = useAccess();
  const enabledModules = useEnabledModules();

  return useMemo(() => {
    const moduleOn = (name: string) =>
      matchesOrgModule(enabledModules, name);
    const owner = data?.isOrgOwner ?? false;
    const permissions = data?.permissions ?? [];
    const can = (key: PermissionKey) => owner || permissions.includes(key);

    return {
      accessLoading: isLoading,
      hrEnabled: moduleOn("HR"),
      crmEnabled: moduleOn("CRM"),
      projectsEnabled: moduleOn("PROJECTS"),
      payrollEnabled: moduleOn("PAYROLL"),
      signEnabled: moduleOn("SIGN"),
      accountingEnabled: moduleOn("accounting"),
      canViewEmployees: can("hr:employees:view"),
      canCreateEmployees: can("hr:employees:create"),
      canViewAttendance: can("hr:attendance:view"),
      canSelfAttendance: can("self:attendance"),
      canViewLeaves: can("hr:leaves:view"),
      canApproveLeaves: can("hr:leaves:approve"),
      canViewExecutive: can("hr:analytics:read"),
      canViewCrmLeads: can("crm:leads:view"),
      canViewCrmReports: can("crm:reports:view"),
      canViewTickets: can("build:tickets:view"),
      canViewPayrollSelf: can("self:payroll"),
      canViewPayrollAdmin: can("payroll:runs:view"),
      canViewOnboardingDocsSummary: can("hr:onboarding:manage"),
      canViewExpenses: can("hr:expenses:view"),
      canCreateExpenses: can("hr:expenses:create"),
      canApproveExpenses: can("hr:expenses:approve"),
      canViewInterviews: can("hr:interviews:view"),
      canViewSignEnvelopes: can("sign:envelope:view"),
    };
  }, [data, isLoading, enabledModules]);
}
