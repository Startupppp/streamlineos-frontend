"use client";

import { Users, UserCheck, UserX } from "lucide-react";
import {
  StatCard,
  StatCardGrid,
  StatCardGridSkeleton,
} from "@/components/ui/stat-card";
import { useCan } from "@/hooks/api/access";
import { useHrCommandCenter } from "@/hooks/api/hr";

interface EmployeesDirectoryStatsProps {
  loadedCount: number;
  hasMore: boolean;
}

export function EmployeesDirectoryStats({
  loadedCount,
  hasMore,
}: EmployeesDirectoryStatsProps) {
  const canAnalytics = useCan("hr:analytics:read");
  const commandCenter = useHrCommandCenter();

  if (canAnalytics && commandCenter.isLoading)
    return <StatCardGridSkeleton cols={3} count={3} />;

  const headcount = commandCenter.data?.headcount;
  const showOrgStatus = canAnalytics && headcount != null;
  const inactive = showOrgStatus
    ? Math.max(0, headcount.total - headcount.active)
    : 0;

  return (
    <StatCardGrid>
      <StatCard
        label="Loaded"
        value={loadedCount}
        icon={Users}
        tone="default"
        hint={hasMore ? "More results available" : "Current filters"}
      />
      {showOrgStatus ? (
        <>
          <StatCard
            label="Active"
            value={headcount.active}
            icon={UserCheck}
            tone="emerald"
            hint="Org-wide"
            href="/hr/employees?status=active"
          />
          <StatCard
            label="Inactive"
            value={inactive}
            icon={UserX}
            tone={inactive > 0 ? "amber" : "default"}
            hint="Org-wide"
            href="/hr/employees?status=inactive"
          />
        </>
      ) : null}
    </StatCardGrid>
  );
}
