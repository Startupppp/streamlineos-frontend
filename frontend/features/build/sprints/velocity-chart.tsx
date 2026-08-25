"use client";

import { memo, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp } from "lucide-react";
import { PM_PANEL } from "@/features/build/shared/pm-chrome";
import { TEXT_ONE_LINE } from "@/lib/text-overflow";
import { cn } from "@/lib/utils";

interface Sprint {
  id: number;
  name: string;
  status: string | null;
  tickets?: Array<{
    id: number;
    status: string | null;
    points: number | null;
  }>;
}

interface VelocityChartProps {
  sprints: Sprint[];
}

export const VelocityChart = memo(function VelocityChart({ sprints }: VelocityChartProps) {
  const completedSprints = useMemo(
    () => sprints.filter(s => s.status === "COMPLETED").slice(0, 8).reverse(),
    [sprints]
  );

  const chartData = useMemo(() => {
    if (completedSprints.length === 0) return null;
    const data = completedSprints.map(sprint => {
      const tickets = sprint.tickets ?? [];
      const committed = tickets.reduce((sum, t) => sum + (t.points || 0), 0);
      const completed = tickets
        .filter(t => t.status === "DONE")
        .reduce((sum, t) => sum + (t.points || 0), 0);
      return { name: sprint.name, committed, completed };
    });
    const maxPoints = Math.max(...data.map(d => Math.max(d.committed, d.completed)), 1);
    const avgVelocity = Math.round(data.reduce((sum, d) => sum + d.completed, 0) / data.length);
    return { data, maxPoints, avgVelocity };
  }, [completedSprints]);

  if (!chartData) {
    return (
      <Card className={cn(PM_PANEL, "shadow-sm")}>
        <CardHeader className="px-3 py-2.5">
          <CardTitle className="flex items-center gap-2 text-sm">
            <TrendingUp className="h-4 w-4 shrink-0 text-primary" />
            Velocity
          </CardTitle>
        </CardHeader>
        <CardContent className="px-3 pb-3 pt-0">
          <p className="py-6 text-center text-xs text-muted-foreground">
            Complete sprints to see velocity data
          </p>
        </CardContent>
      </Card>
    );
  }

  const { data, maxPoints, avgVelocity } = chartData;

  return (
    <Card className={cn(PM_PANEL, "shadow-sm")}>
      <CardHeader className="px-3 py-2.5">
        <div className="flex min-w-0 items-center justify-between gap-2">
          <CardTitle className="flex min-w-0 items-center gap-2 text-sm">
            <TrendingUp className="h-4 w-4 shrink-0 text-primary" />
            Velocity
          </CardTitle>
          <span className="shrink-0 text-dense tabular-nums text-muted-foreground">
            Avg: <span className="font-semibold text-foreground">{avgVelocity} pts</span>
          </span>
        </div>
      </CardHeader>
      <CardContent className="px-3 pb-3 pt-0">
        <div className="flex h-36 items-end gap-2.5">
          {data.map((item) => (
            <div key={item.name} className="flex min-w-0 flex-1 flex-col items-center gap-1">
              <div className="flex w-full items-end gap-0.5" style={{ height: "108px" }}>
                <div
                  className="flex-1 rounded-t bg-status-info-fill transition-all"
                  style={{ height: `${(item.committed / maxPoints) * 100}%` }}
                  title={`Committed: ${item.committed} pts`}
                />
                <div
                  className="flex-1 rounded-t bg-status-success-fill transition-all"
                  style={{ height: `${(item.completed / maxPoints) * 100}%` }}
                  title={`Completed: ${item.completed} pts`}
                />
              </div>
              <span
                className={cn(TEXT_ONE_LINE, "w-full text-center text-micro text-muted-foreground")}
                title={item.name}
              >
                {item.name}
              </span>
            </div>
          ))}
        </div>
        <div className="mt-3 flex items-center justify-center gap-4">
          <div className="flex items-center gap-1.5">
            <div className="h-2.5 w-2.5 rounded bg-status-info-fill" />
            <span className="text-micro text-muted-foreground">Committed</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="h-2.5 w-2.5 rounded bg-status-success-fill" />
            <span className="text-micro text-muted-foreground">Completed</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
});
