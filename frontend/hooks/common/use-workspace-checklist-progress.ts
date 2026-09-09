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

    const name = session?.user?.name?.trim() ?? "";
    if (name.length >= 2) {
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
