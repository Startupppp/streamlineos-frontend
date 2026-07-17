"use client";

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface InterviewerStat {
  interviewerId: string;
  name: string | null;
  avgRating: number;
}

interface ScorecardChartsProps {
  stats: InterviewerStat[];
  dist: Array<{ range: string; count: number }>;
  orgAvgRating: number | undefined;
}

export function ScorecardCharts({ stats, dist, orgAvgRating }: ScorecardChartsProps) {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Avg Rating by Interviewer</CardTitle>
          <p className="text-xs text-muted-foreground">Org average: {orgAvgRating} — deviations highlight potential bias</p>
        </CardHeader>
        <CardContent className="p-0 pb-2">
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={stats} margin={{ left: -10, right: 16, top: 8, bottom: 4 }}>
              <XAxis
                dataKey="name"
                tick={{ fontSize: 10 }}
                tickFormatter={(v: string | null) => v ? v.split(" ")[0] : "?"}
              />
              <YAxis domain={[0, 10]} tick={{ fontSize: 10 }} />
              <Tooltip
                formatter={(v) => [`${v} / 10`, "Avg Rating"]}
                labelFormatter={(label) => `Interviewer: ${label}`}
              />
              <Bar dataKey="avgRating" radius={[4, 4, 0, 0]}>
                {stats.map((s) => (
                  <Cell
                    key={s.interviewerId}
                    fill={
                      s.avgRating < (orgAvgRating ?? 5) - 1.5
                        ? "hsl(var(--destructive))"
                        : s.avgRating > (orgAvgRating ?? 5) + 1.5
                        ? "hsl(142 76% 36%)"
                        : "hsl(var(--primary))"
                    }
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Score Distribution</CardTitle>
          <p className="text-xs text-muted-foreground">Count of scorecards by avg rating range</p>
        </CardHeader>
        <CardContent className="p-0 pb-2">
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={dist} margin={{ left: -10, right: 16, top: 8, bottom: 4 }}>
              <XAxis dataKey="range" tick={{ fontSize: 10 }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 10 }} />
              <Tooltip />
              <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}
