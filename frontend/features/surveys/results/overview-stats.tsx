import { Users, CheckCircle2, Clock, Award } from "lucide-react";
import { StatCard, StatCardGrid } from "@/components/ui/stat-card";
import type { SurveyAnalyticsOverview } from "@/hooks/api/surveys/analytics";

export function OverviewStats({ overview }: { overview: SurveyAnalyticsOverview }) {
  const avgTime = overview.averageCompletionTimeSeconds
    ? `${Math.round(overview.averageCompletionTimeSeconds)}s`
    : "—";

  return (
    <StatCardGrid cols={4}>
      <StatCard label="Responses" value={overview.totalResponses} icon={Users} />
      <StatCard label="Completion rate" value={`${Math.round(overview.completionRate * 100)}%`} icon={CheckCircle2} />
      <StatCard label="Avg. completion time" value={avgTime} icon={Clock} />
      <StatCard
        label="Avg. score"
        value={overview.averageScore !== null ? Math.round(overview.averageScore) : "—"}
        icon={Award}
      />
    </StatCardGrid>
  );
}
