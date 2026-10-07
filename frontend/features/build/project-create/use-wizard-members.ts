"use client";

import { useMemo } from "react";
import { useCan } from "@/hooks/api/access";
import { useOrgMembers } from "@/hooks/api/organization";
import { useBuildMembers } from "@/hooks/api/build/build-members";

/**
 * Member directory for the create-project wizard.
 * Prefer org members when `settings:view` is granted; otherwise fall back to
 * `build:members:view` (same pattern as MemberPicker / project-member-selector).
 * Also fall back when the org members query errors (e.g. response contract noise)
 * so Review/Team do not render "Unknown member" for selected ids the user can see.
 */
export type WizardMember = {
  userId: string;
  name: string | null;
  email: string;
  image: string | null;
};

export function useWizardMembers(limit = 100): WizardMember[] {
  const canViewOrgMembers = useCan("settings:view");
  const canViewBuildMembers = useCan("build:members:view");

  const { data: orgData, isError: orgError } = useOrgMembers(1, limit, undefined, {
    enabled: canViewOrgMembers,
  });
  const useOrg = canViewOrgMembers && !orgError;
  const useWorkspace = canViewBuildMembers && !useOrg;

  const { data: workspaceData } = useBuildMembers(
    { limit },
    { enabled: useWorkspace },
  );

  return useMemo(() => {
    if (useOrg) {
      return (orgData?.data ?? []).map((m) => ({
        userId: m.userId,
        name: m.name,
        email: m.email,
        image: m.image,
      }));
    }
    return (workspaceData?.data ?? []).map((m) => ({
      userId: m.id,
      name: m.name,
      email: m.email,
      image: m.image,
    }));
  }, [useOrg, orgData?.data, workspaceData?.data]);
}
