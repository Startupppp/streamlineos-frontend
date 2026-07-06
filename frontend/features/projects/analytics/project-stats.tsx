"use client";

import { memo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const STATE_COLORS: Record<string, string> = {
  backlog: "#94a3b8",
  todo: "#60a5fa",
  in_progress: "#facc15",
  in_review: "#a78bfa",
  done: "#4ade80",
  cancelled: "#f87171",
};

const PRIORITY_COLORS: Record<string, string> = {
  urgent: "#ef4444",
  high: "#f97316",
  medium: "#eab308",
  low: "#22c55e",
  none: "#94a3b8",
};

export const CHART_COLORS = [
  "#1d4ed8",
  "#8b5cf6",
  "#ec4899",
  "#f43f5e",
  "#f97316",
  "#eab308",
  "#22c55e",
  "#14b8a6",
  "#06b6d4",
  "#3b82f6",
];

export { STATE_COLORS, PRIORITY_COLORS };

interface HealthBreakdown {
  completionPct: number;
  onTimePct: number;
  velocityScore: number;
  overdueTickets: number;
  totalTickets: number;
}

interface ProjectStatsProps {
  healthScore: number | undefined;
  healthStatus: string | undefined;
  healthBreakdown: HealthBreakdown | undefined;
}

export const ProjectStats = memo(function ProjectStats({
  healthScore,
  healthStatus,
  healthBreakdown,
}: ProjectStatsProps) {
  if (healthScore == null || !healthBreakdown) return null;

  const healthColor =
    healthStatus === "EXCELLENT"
      ? "text-emerald-500"
      : healthStatus === "GOOD"
        ? "text-blue-500"
        : healthStatus === "AT_RISK"
          ? "text-amber-500"
          : "text-destructive";

  return (
    <Card className="mb-6 rounded-lg border border-border bg-card shadow-none">
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Project Health Score</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-6 flex-wrap">
          <div className="text-center">
            <p className={`text-5xl font-bold tabular-nums ${healthColor}`}>
              {healthScore}
            </p>
            <p className={`text-sm font-medium mt-1 ${healthColor}`}>
              {healthStatus?.replace("_", " ")}
            </p>
          </div>
          <div className="flex-1 space-y-3 min-w-48">
            {[
              {
                label: "Completion Rate",
                value: healthBreakdown.completionPct,
                weight: "50%",
              },
              {
                label: "On-Time Rate",
                value: healthBreakdown.onTimePct,
                weight: "30%",
              },
              {
                label: "Velocity Score",
                value: healthBreakdown.velocityScore,
                weight: "20%",
              },
            ].map((item) => (
              <div key={item.label} className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">
                    {item.label}{" "}
                    <span className="opacity-60">({item.weight} weight)</span>
                  </span>
                  <span className="font-medium">{item.value}%</span>
                </div>
                <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full bg-primary rounded-full"
                    style={{ width: `${item.value}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
          <div className="text-xs text-muted-foreground space-y-1">
            <p>
              <span className="font-medium text-foreground">
                {healthBreakdown.overdueTickets}
              </span>{" "}
              overdue tickets
            </p>
            <p>
              <span className="font-medium text-foreground">
                {healthBreakdown.totalTickets}
              </span>{" "}
              total tickets
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
});
