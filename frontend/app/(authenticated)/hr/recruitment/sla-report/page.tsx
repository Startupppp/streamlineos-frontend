"use client";

import Link from "next/link";
import { useHrSlaReport } from "@/lib/api/hooks/hr/recruitment";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { ArrowLeft, AlertTriangle, CheckCircle, TrendingUp, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from "recharts";

const STAGE_COLORS = [
  "#06b6d4",
  "#3b82f6",
  "#ef4444",
  "#10b981",
  "#8b5cf6",
  "#f59e0b",
];

function breachColor(pct: number) {
  if (pct >= 50) return "text-destructive";
  if (pct >= 25) return "text-yellow-600";
  return "text-green-600";
}

function breachBg(pct: number) {
  if (pct >= 50) return "bg-destructive/10";
  if (pct >= 25) return "bg-yellow-50 dark:bg-yellow-950/20";
  return "bg-green-50 dark:bg-green-950/20";
}

export default function SlaReportPage() {
  const { data, isLoading, isError, refetch } = useHrSlaReport();

  return (
    <PageWrapper
      title="SLA Breach Report"
      subtitle="Monthly % of candidates who breached SLA per recruitment stage"
      actions={
        <Button variant="ghost" size="sm" asChild>
          <Link href="/hr/recruitment/sla">
            <ArrowLeft className="mr-1 h-3.5 w-3.5" />
            SLA Config
          </Link>
        </Button>
      }
    >
      {isLoading ? (
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-28 w-full rounded-lg" />
            ))}
          </div>
          <Skeleton className="h-72 w-full rounded-lg" />
          <Skeleton className="h-48 w-full rounded-lg" />
        </div>
      ) : isError ? (
        <div className="flex flex-col items-center justify-center flex-1 gap-3 py-16">
          <AlertCircle className="h-10 w-10 text-destructive/50" />
          <p className="text-sm text-muted-foreground">Failed to load SLA breach report.</p>
          <Button variant="outline" size="sm" onClick={() => void refetch()}>
            Try again
          </Button>
        </div>
      ) : !data || data.stages.length === 0 ? (
        <div className="flex flex-col items-center justify-center flex-1 gap-3 py-16">
          <CheckCircle className="h-10 w-10 text-muted-foreground/30" />
          <p className="text-sm font-medium text-muted-foreground">No SLA tracking data yet.</p>
          <p className="text-xs text-muted-foreground">
            SLA data is recorded as candidates move through recruitment stages.
          </p>
          <Button variant="outline" size="sm" asChild>
            <Link href="/hr/recruitment/sla">Configure SLAs</Link>
          </Button>
        </div>
      ) : (
        <div className="space-y-6">
          <div>
            <h2 className="text-sm font-semibold mb-3 flex items-center gap-1.5">
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
              6-Month Stage Summary
            </h2>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {data.stageSummary.map((s) => (
                <Card key={s.stage} className={cn("overflow-hidden", breachBg(s.avgBreachPct))}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{s.stage}</p>
                        <p className={cn("text-2xl font-bold mt-0.5", breachColor(s.avgBreachPct))}>
                          {s.avgBreachPct}%
                        </p>
                        <p className="text-[10px] text-muted-foreground">avg breach rate</p>
                      </div>
                      {s.avgBreachPct >= 25 && (
                        <AlertTriangle className={cn("h-4 w-4 mt-1", s.avgBreachPct >= 50 ? "text-destructive" : "text-yellow-500")} />
                      )}
                    </div>
                    <Progress value={s.avgBreachPct} className="h-1.5" />
                    <p className="text-[10px] text-muted-foreground mt-1.5">
                      {s.totalBreached} of {s.totalAll} total breached
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          <Card>
            <CardHeader className="p-4 pb-2">
              <CardTitle className="text-sm">Breach % by Stage — Last 6 Months</CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <ResponsiveContainer width="100%" height={260}>
                <BarChart
                  data={data.report.map((r) => {
                    const row: Record<string, string | number> = { month: r.label };
                    for (const s of r.stages) {
                      row[s.stage] = s.breachPct;
                    }
                    return row;
                  })}
                  margin={{ top: 4, right: 8, left: -10, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                  <YAxis tickFormatter={(v: number) => `${v}%`} tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(v: unknown) => [`${v}%`, ""]} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  {data.stages.map((stage, i) => (
                    <Bar
                      key={stage}
                      dataKey={stage}
                      name={stage}
                      fill={STAGE_COLORS[i % STAGE_COLORS.length]}
                      radius={[2, 2, 0, 0]}
                    />
                  ))}
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="p-4 pb-2">
              <CardTitle className="text-sm">Monthly Breakdown</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div>
                <table className="w-full text-[10px] md:text-xs">
                  <thead>
                    <tr className="border-b bg-muted/40">
                      <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">Month</th>
                      {data.stages.map((s) => (
                        <th key={s} className="px-4 py-2.5 text-center font-medium text-muted-foreground">{s}</th>
                      ))}
                      <th className="px-4 py-2.5 text-center font-medium text-muted-foreground">Overall</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.report.map((row) => (
                      <tr key={row.month} className="border-b last:border-0 hover:bg-muted/20 transition-colors">
                        <td className="px-4 py-2.5 font-medium">{row.label}</td>
                        {data.stages.map((stage) => {
                          const st = row.stages.find((s) => s.stage === stage);
                          return (
                            <td key={stage} className="px-4 py-2.5 text-center">
                              {st && st.total > 0 ? (
                                <span className={cn("font-medium", breachColor(st.breachPct))}>
                                  {st.breachPct}%
                                  <span className="text-muted-foreground font-normal ml-1">({st.breached}/{st.total})</span>
                                </span>
                              ) : (
                                <span className="text-muted-foreground">—</span>
                              )}
                            </td>
                          );
                        })}
                        <td className="px-4 py-2.5 text-center">
                          {row.overall.total > 0 ? (
                            <Badge
                              variant={row.overall.breachPct >= 50 ? "destructive" : row.overall.breachPct >= 25 ? "secondary" : "outline"}
                              className="text-[10px]"
                            >
                              {row.overall.breachPct}%
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </PageWrapper>
  );
}
