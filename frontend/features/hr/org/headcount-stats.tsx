"use client";

import { useOrgHeadcount } from "@/hooks/api/hr/hr-org";
import { StatCard, StatCardGrid, StatCardGridSkeleton } from "@/components/ui/stat-card";
import { Users } from "lucide-react";

interface Props {
  groupBy: "department" | "location" | "role";
}

export function HeadcountStats({ groupBy }: Props) {
  const { data, isLoading } = useOrgHeadcount(groupBy);

  if (isLoading) {
    return <StatCardGridSkeleton cols={4} count={12} className="mb-4" />;
  }

  if (!data || data.length === 0) return null;

  const total = data.reduce((sum, g) => sum + g.headcount, 0);

  return (
    <StatCardGrid cols={4} className="mb-4">
      <StatCard label="Total" value={total} icon={Users} featured />
      {data.slice(0, 7).map((group) => (
        <StatCard
          key={String(group.groupId ?? group.groupName)}
          label={group.groupName ?? "Unknown"}
          value={group.headcount}
        />
      ))}
    </StatCardGrid>
  );
}
