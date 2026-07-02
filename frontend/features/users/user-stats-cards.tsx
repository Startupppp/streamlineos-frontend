"use client";

import { Users, UserCheck, UserX, Mail } from "lucide-react";
import { StatCard, StatCardGrid } from "@/components/ui/stat-card";
import { useUserStats } from "@/hooks/api/users";

export function UserStatsCards() {
  const { data, isLoading } = useUserStats();

  return (
    <StatCardGrid cols={4}>
      <StatCard
        label="Total Users"
        value={data?.total ?? 0}
        icon={Users}
        tone="default"
        isLoading={isLoading}
      />
      <StatCard
        label="Active"
        value={data?.active ?? 0}
        icon={UserCheck}
        tone="emerald"
        isLoading={isLoading}
      />
      <StatCard
        label="Suspended"
        value={data?.suspended ?? 0}
        icon={UserX}
        tone="amber"
        isLoading={isLoading}
      />
      <StatCard
        label="Pending Invites"
        value={data?.pendingInvitations ?? 0}
        icon={Mail}
        tone="blue"
        isLoading={isLoading}
      />
    </StatCardGrid>
  );
}
