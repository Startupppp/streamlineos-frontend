import { Users } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { StatCard, StatCardGrid } from "@/components/ui/stat-card";
import type { SalesLeaderboardEntry } from "@/types/leads";

interface ActivitySummaryProps {
  leaderboard: SalesLeaderboardEntry[] | undefined;
  periodLabel: string;
}

export function ActivitySummary({
  leaderboard,
  periodLabel,
}: ActivitySummaryProps) {
  const totalLeads = leaderboard
    ? leaderboard.reduce((acc, rep) => acc + rep.count, 0)
    : null;
  const totalReps = leaderboard?.length ?? null;

  return (
    <Card className="shadow-sm">
      <CardHeader className="pb-3">
        <h2 className="text-sm font-semibold text-foreground">
          Activity Summary
        </h2>
        <p className="text-xs text-muted-foreground mt-0.5">
          {periodLabel} totals across all reps
        </p>
      </CardHeader>
      <CardContent>
        <StatCardGrid cols={2}>
          <StatCard
            label="Total Leads"
            value={totalLeads !== null ? totalLeads.toLocaleString() : "—"}
            icon={Users}
            color="blue"
            index={0}
          />
          <StatCard
            label="Active Reps"
            value={totalReps !== null ? totalReps.toLocaleString() : "—"}
            icon={Users}
            color="emerald"
            index={1}
          />
        </StatCardGrid>
      </CardContent>
    </Card>
  );
}
