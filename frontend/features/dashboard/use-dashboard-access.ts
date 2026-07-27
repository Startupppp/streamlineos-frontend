"use client";

import { useMemo } from "react";
import { useAccess } from "@/hooks/api/access";
import { useEnabledModules } from "@/hooks/api/access/org-modules";
import type { PermissionKey } from "@/lib/rbac/permissions";

export interface DashboardAccess {
  accessLoading: boolean;
  hrEnabled: boolean;
  crmEnabled: boolean;
  projectsEnabled: boolean;
  canViewEmployees: boolean;
  canCreateEmployees: boolean;
  canViewAttendance: boolean;
  canViewLeaves: boolean;
  canApproveLeaves: boolean;
  canViewExecutive: boolean;
  canViewCrmLeads: boolean;
  canViewCrmReports: boolean;
  canViewTickets: boolean;
}

export function useDashboardAccess(): DashboardAccess {
  const { data, isLoading } = useAccess();
  const enabledModules = useEnabledModules();

  return useMemo(() => {
    const moduleOn = (name: string) =>
      enabledModules.length === 0 || enabledModules.includes(name);
    const owner = data?.isOrgOwner ?? false;
    const permissions = data?.permissions ?? [];
    const can = (key: PermissionKey) => owner || permissions.includes(key);

    return {
      accessLoading: isLoading,
      hrEnabled: moduleOn("HR"),
      crmEnabled: moduleOn("CRM"),
      projectsEnabled: moduleOn("PROJECTS"),
      canViewEmployees: can("hr:employees:view"),
      canCreateEmployees: can("hr:employees:create"),
      canViewAttendance: can("hr:attendance:view"),
      canViewLeaves: can("hr:leaves:view"),
      canApproveLeaves: can("hr:leaves:approve"),
      canViewExecutive: can("hr:analytics:read"),
      canViewCrmLeads: can("crm:leads:view"),
      canViewCrmReports: can("crm:reports:view"),
      canViewTickets: can("build:tickets:view"),
    };
  }, [data, isLoading, enabledModules]);
}
