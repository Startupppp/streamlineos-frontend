"use client";

import { useOrgHeadcount } from "@/hooks/api/hr/hr-org";
import { StatCard, StatCardGrid, StatCardGridSkeleton } from "@/components/ui/stat-card";
import { Users } from "lucide-react";
import { ErrorState } from "@/components/shared/error-state";

interface Props {
  groupBy: "department" | "location" | "role";
}

export function HeadcountStats({ groupBy }: Props) {
  const { data, isLoading, isError, refetch } = useOrgHeadcount(groupBy);

  if (isLoading) {
    return <StatCardGridSkeleton cols={4} className="mb-4" />;
  }

  if (isError) {
    return (
      <ErrorState
        title="Failed to load headcount"
        description="Headcount data is temporarily unavailable."
        onRetry={() => void refetch()}
        compact
        className="mb-4"
      />
    );
  }

  if (!data || data.length === 0) return null;

  const total = data.reduce(
    (headcountTotal, headcountGroup) =>
      headcountTotal + headcountGroup.headcount,
    0,
  );

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
