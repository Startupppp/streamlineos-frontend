import { Phone, Mail, Video } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { StatCard } from "@/components/ui/stat-card";
import type { SalesLeaderboardEntry } from "@/types/leads";

interface ActivityTotals {
  calls: number;
  emails: number;
  meetings: number;
}

function computeActivityTotals(
  leaderboard: SalesLeaderboardEntry[],
): ActivityTotals {
  return leaderboard.reduce(
    (acc, rep) => ({
      calls: acc.calls + rep.totalCalls,
      emails: acc.emails + rep.totalEmails,
      meetings: acc.meetings + rep.totalMeetings,
    }),
    { calls: 0, emails: 0, meetings: 0 },
  );
}

interface ActivitySummaryProps {
  leaderboard: SalesLeaderboardEntry[] | undefined;
  periodLabel: string;
}

export function ActivitySummary({
  leaderboard,
  periodLabel,
}: ActivitySummaryProps) {
  const totals = leaderboard ? computeActivityTotals(leaderboard) : null;

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
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-3">
          <StatCard
            label="Calls"
            value={totals ? totals.calls.toLocaleString() : "—"}
            icon={Phone}
            color="blue"
            index={0}
          />
          <StatCard
            label="Emails"
            value={totals ? totals.emails.toLocaleString() : "—"}
            icon={Mail}
            color="blue"
            index={1}
          />
          <StatCard
            label="Meetings"
            value={totals ? totals.meetings.toLocaleString() : "—"}
            icon={Video}
            color="amber"
            index={2}
          />
        </div>
      </CardContent>
    </Card>
  );
}
