import { memo } from "react";
import { Clock, TrendingUp, CheckSquare, UserX } from "lucide-react";
import { StatCard, StatCardGrid } from "@/components/ui/stat-card";

interface TeamStatsProps {
  totalHours: number;
  /**
   * Billable share, or null when it could not be sourced. It comes from the
   * reports overview, which needs `timesheets:reports:view`; a team viewer
   * without that key used to get a hard 0%, which reads as "nobody billed
   * anything" rather than "not available to you".
   */
  billablePercent: number | null;
  submittedCount: number;
  missingCount: number;
  isLoading: boolean;
}

export const TeamStats = memo(function TeamStats({
  totalHours,
  billablePercent,
  submittedCount,
  missingCount,
  isLoading,
}: TeamStatsProps) {
  return (
    <StatCardGrid cols={4}>
      <StatCard
        label="Total Hours"
        value={isLoading ? "—" : `${totalHours.toFixed(1)}h`}
        icon={Clock}
        tone="blue"
        isLoading={isLoading}
      />
      <StatCard
        label="Billable"
        value={isLoading || billablePercent === null ? "—" : `${billablePercent.toFixed(0)}%`}
        icon={TrendingUp}
        tone="emerald"
        isLoading={isLoading}
      />
      <StatCard
        label="Submitted"
        value={isLoading ? "—" : submittedCount}
        icon={CheckSquare}
        tone="amber"
        isLoading={isLoading}
      />
      <StatCard
        label="Not Submitted"
        value={isLoading ? "—" : missingCount}
        icon={UserX}
        tone="red"
        isLoading={isLoading}
      />
    </StatCardGrid>
  );
});
