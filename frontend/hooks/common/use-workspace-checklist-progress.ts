"use client";

import { useMemo } from "react";
import { useSession } from "next-auth/react";
import { useUserStats } from "@/hooks/api/users";
import { useDashboardStats } from "@/hooks/api/dashboard";
import { useIntegrationConnections } from "@/hooks/api/integrations";
import { useLeads } from "@/hooks/api/leads";
import { useAiUsage } from "@/hooks/api/ai";

export const CHECKLIST_ITEM_IDS = [
  "invite",
  "record",
  "email",
  "profile",
  "ai",
] as const;

export type ChecklistItemId = (typeof CHECKLIST_ITEM_IDS)[number];

/**
 * Sign-up stores the email's local part as the name, so a name equal to it is a
 * placeholder the person never chose (HRMS-E2E-025). Compared case-sensitively:
 * sign-up writes the normalised lower-case form, so "Asha" was typed by a person.
 */
export function hasChosenProfileName(name: string | null | undefined, email: string | null | undefined): boolean {
  const trimmed = name?.trim() ?? "";
  if (trimmed.length < 2) return false;
  const localPart = email?.split("@")[0]?.trim();
  return trimmed !== localPart;
}

export function useWorkspaceChecklistProgress(enabled = true) {
  const { data: session } = useSession();

  const { data: dashboardStats, isLoading: dashboardLoading } =
    useDashboardStats({ enabled });
  const { data: connections, isLoading: connectionsLoading } =
    useIntegrationConnections({ enabled });
  const { data: aiUsage, isLoading: aiUsageLoading } = useAiUsage({ enabled });
  const { data: leadsData, isLoading: leadsLoading } = useLeads(
    { limit: 1 },
    { enabled },
  );
  const { data: userStats, isLoading: userStatsLoading } = useUserStats({
    enabled,
  });

  const completed = useMemo(() => {
    const done = new Set<ChecklistItemId>();

    const memberCount = userStats?.total ?? 0;
    const pendingInvites = userStats?.pendingInvitations ?? 0;
    if (memberCount > 1 || pendingInvites > 0) {
      done.add("invite");
    }

    const hasRecord =
      (dashboardStats?.activeProjects ?? 0) > 0 ||
      (leadsData?.totalCount ?? 0) > 0;
    if (hasRecord) {
      done.add("record");
    }

    if ((connections?.length ?? 0) > 0) {
      done.add("email");
    }

    if (hasChosenProfileName(session?.user?.name, session?.user?.email)) {
      done.add("profile");
    }

    const aiRequests = aiUsage?.totals?.requestCount ?? 0;
    if (aiRequests > 0) {
      done.add("ai");
    }

    return done;
  }, [
    userStats,
    dashboardStats,
    connections,
    leadsData,
    session?.user?.name,
    session?.user?.email,
    aiUsage,
  ]);

  const isLoading =
    userStatsLoading ||
    dashboardLoading ||
    connectionsLoading ||
    leadsLoading ||
    aiUsageLoading;

  return {
    completed,
    doneCount: completed.size,
    total: CHECKLIST_ITEM_IDS.length,
    isLoading,
  };
}
