"use client";

import { useMemo } from "react";
import { useSession } from "next-auth/react";
import { useCan } from "@/hooks/api/access";
import { useOrgMembers } from "@/hooks/api/organization";
import { useBuildMembers } from "@/hooks/api/build/build-members";
import type { WizardSessionUser } from "./resolve-wizard-member-label";

/**
 * Member directory for the create-project wizard.
 * Loads org members when `settings:view` and build members when
 * `build:members:view`, then merges by userId (org wins on conflict).
 * A prior exclusive-org path left Review empty when org was pending/errored
 * and build was never fetched — or when build was empty for a new org.
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

  const { data: orgData } = useOrgMembers(1, limit, undefined, {
    enabled: canViewOrgMembers,
  });
  const { data: workspaceData } = useBuildMembers(
    { limit },
    { enabled: canViewBuildMembers },
  );

  return useMemo(() => {
    const byId = new Map<string, WizardMember>();
    for (const m of workspaceData?.data ?? []) {
      byId.set(m.id, {
        userId: m.id,
        name: m.name,
        email: m.email,
        image: m.image,
      });
    }
    for (const m of orgData?.data ?? []) {
      byId.set(m.userId, {
        userId: m.userId,
        name: m.name,
        email: m.email,
        image: m.image,
      });
    }
    return [...byId.values()];
  }, [orgData?.data, workspaceData?.data]);
}

export function useWizardSessionUser(): WizardSessionUser | undefined {
  const { data: session } = useSession();
  const id = session?.user?.id;
  const name = session?.user?.name;
  const email = session?.user?.email;
  return useMemo(
    () => (id ? { id, name, email } : undefined),
    [id, name, email],
  );
}
