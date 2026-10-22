"use client";

import { Users, UserCheck, UserX, MailQuestion } from "lucide-react";
import {
  StatCard,
  StatCardGrid,
  StatCardGridSkeleton,
} from "@/components/ui/stat-card";
import { useHrEmployeeCounts, type HrEmployeeCountsParams } from "@/hooks/api/hr/employee-list";
import type { EmployeeStatusFilter } from "@/features/hr/employees/employee-list-filters";

interface EmployeesDirectoryStatsProps {
  loadedCount: number;
  hasMore: boolean;
  statusFilter: EmployeeStatusFilter;
  filters: HrEmployeeCountsParams;
}

const FILTERED_HINT = "Current filters";

export function EmployeesDirectoryStats({
  loadedCount,
  hasMore,
  statusFilter,
  filters,
}: EmployeesDirectoryStatsProps) {
  const counts = useHrEmployeeCounts(filters);

  if (counts.isLoading) return <StatCardGridSkeleton cols={3} count={3} />;

  const matching =
    counts.data === undefined
      ? undefined
      : statusFilter === "active"
        ? counts.data.active
        : statusFilter === "inactive"
          ? counts.data.inactive
          : statusFilter === "pending"
            ? counts.data.pending
            : counts.data.active + (counts.data.pending ?? 0) + counts.data.inactive;

  return (
    <StatCardGrid>
      <StatCard
        label="Showing"
        value={loadedCount}
        icon={Users}
        tone="default"
        hint={
          matching === undefined
            ? hasMore
              ? "More results available"
              : FILTERED_HINT
            : `of ${matching} matching`
        }
      />
      {counts.data && (statusFilter === "all" || statusFilter === "active") ? (
        <StatCard
          label="Active"
          value={counts.data.active}
          icon={UserCheck}
          tone="emerald"
          hint={FILTERED_HINT}
        />
      ) : null}
      {counts.data && (statusFilter === "pending" || ((counts.data.pending ?? 0) > 0 && statusFilter === "all")) ? (
        <StatCard
          label="Pending invite"
          value={counts.data.pending}
          icon={MailQuestion}
          tone="amber"
          hint="Invited, not yet accepted"
        />
      ) : null}
      {counts.data && (statusFilter === "all" || statusFilter === "inactive") ? (
        <StatCard
          label="Inactive"
          value={counts.data.inactive}
          icon={UserX}
          tone={counts.data.inactive > 0 ? "amber" : "default"}
          hint={FILTERED_HINT}
        />
      ) : null}
    </StatCardGrid>
  );
}
