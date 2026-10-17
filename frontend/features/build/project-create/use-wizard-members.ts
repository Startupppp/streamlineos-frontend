"use client";

import { useMemo } from "react";
import { useSession } from "next-auth/react";
import { useBuildMembers } from "@/hooks/api/build/build-members";
import type { WizardSessionUser } from "./resolve-wizard-member-label";

export type WizardMember = {
  userId: string;
  name: string | null;
  email: string;
  image: string | null;
};

export function useWizardMembers(limit = 100, search?: string): WizardMember[] {
  const { data: workspaceData } = useBuildMembers({
    limit,
    ...(search ? { search } : {}),
  });

  return useMemo(
    () =>
      (workspaceData?.data ?? []).map((m) => ({
        userId: m.id,
        name: m.name,
        email: m.email,
        image: m.image,
      })),
    [workspaceData?.data],
  );
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
