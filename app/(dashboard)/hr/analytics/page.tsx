"use client";

import { useMemo } from "react";
import { useHrAnalytics, type HrAnalyticsData } from "@/lib/api/hooks/hr";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { StatCard } from "@/components/ui/stat-card";
import { DashboardGate } from "@/components/shared/dashboard-gate";
import { EmptyLeaderboardIllustration } from "@/components/illustrations";
import {
  Users, UserPlus, TrendingUp, IndianRupee,
  CalendarCheck, Clock, Building2, Receipt,
} from "lucide-react";

function formatCurrency(val: string | number) {
  const num = Number(val);
  if (num >= 10000000) return `${(num / 10000000).toFixed(1)}Cr`;
  if (num >= 100000) return `${(num / 100000).toFixed(1)}L`;
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
  return num.toLocaleString("en-IN");
}

function BarChart({ data, maxValue }: { data: { label: string; value: number; color?: string }[]; maxValue?: number }) {
  const max = maxValue ?? Math.max(...data.map((d) => d.value), 1);
  return (
    <div className="space-y-2">
      {data.map((item) => (
        <div key={item.label} className="flex items-center gap-3">
          <span className="text-xs text-muted-foreground w-24 truncate shrink-0">{item.label}</span>
          <div className="flex-1 h-5 bg-muted rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${item.color ?? "bg-primary"}`}
              style={{ width: `${Math.max(2, (item.value / max) * 100)}%` }}
            />
          </div>
          <span className="text-xs font-medium tabular-nums w-8 text-right">{item.value}</span>
        </div>
      ))}
    </div>
  );
}

function AnalyticsContent() {
  const { data, isLoading } = useHrAnalytics();

  const totalLeaves = useMemo(() => {
    if (!data) return 0;
    return Object.values(data.leaves.byStatus).reduce((s, v) => s + v, 0);
  }, [data]);

  if (isLoading) {
    return (
      <PageWrapper title="HR Analytics" subtitle="Workforce insights and metrics">
        <div className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {Array.from({ length: 8 }).map((_, i) => (
              <Card key={i}><CardContent className="p-4"><Skeleton className="h-4 w-16 mb-2" /><Skeleton className="h-8 w-12" /></CardContent></Card>
            ))}
          </div>
          <div className="grid md:grid-cols-2 gap-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <Card key={i}><CardContent className="p-4"><Skeleton className="h-40 w-full" /></CardContent></Card>
            ))}
          </div>
        </div>
      </PageWrapper>
    );
  }

  if (!data) return null;

  const GENDER_COLORS: Record<string, string> = {
    MALE: "bg-blue-500",
    FEMALE: "bg-pink-500",
    OTHER: "bg-purple-500",
    Unknown: "bg-slate-400",
  };

  return (
    <PageWrapper title="HR Analytics" subtitle="Workforce insights and metrics">
      <div className="space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatCard label="Total Employees" value={data.headcount.total} icon={Users} />
          <StatCard label="Active" value={data.headcount.active} icon={TrendingUp} subtitle={`${data.headcount.total > 0 ? Math.round((data.headcount.active / data.headcount.total) * 100) : 0}% active rate`} />
          <StatCard label="New This Month" value={data.headcount.newThisMonth} icon={UserPlus} />
          <StatCard label="Attendance (Month)" value={data.attendance.totalLogsThisMonth} icon={Clock} />
          <StatCard label="Leaves (YTD)" value={totalLeaves} icon={CalendarCheck} />
          <StatCard label="Payroll Cost (YTD)" value={`₹${formatCurrency(data.payroll.totalCostYTD)}`} icon={IndianRupee} />
          <StatCard label="Expenses (YTD)" value={`₹${formatCurrency(data.expenses.approvedYTD)}`} icon={Receipt} />
          <StatCard label="Departments" value={data.departments.length} icon={Building2} />
        </div>

        <div className="grid md:grid-cols-2 gap-3">
          <Card>
            <CardHeader className="p-4 pb-2">
              <CardTitle className="text-sm">Department Distribution</CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-2">
              {data.departments.length > 0 ? (
                <BarChart data={data.departments.map((d) => ({ label: d.name, value: d.count }))} />
              ) : (
                <div className="py-6">
                  <EmptyLeaderboardIllustration className="mx-auto mb-4 h-36 w-36 opacity-95" />
                  <p className="text-xs text-muted-foreground text-center">No department data</p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="p-4 pb-2">
              <CardTitle className="text-sm">Gender Diversity</CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-2">
              {data.gender.length > 0 ? (
                <div className="space-y-3">
                  {data.gender.map((g) => {
                    const total = data.headcount.active || 1;
                    const pct = Math.round((g.count / total) * 100);
                    return (
                      <div key={g.gender} className="flex items-center gap-3">
                        <span className="text-xs w-16 shrink-0">{g.gender}</span>
                        <Progress value={pct} className="h-2 flex-1" />
                        <span className="text-xs font-medium tabular-nums w-12 text-right">{g.count} ({pct}%)</span>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground text-center py-6">No gender data</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="p-4 pb-2">
              <CardTitle className="text-sm">Role Distribution</CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-2">
              {data.roles.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {data.roles.map((r) => (
                    <Badge key={r.role} variant="secondary" className="text-xs gap-1">
                      {r.role}
                      <span className="font-bold">{r.count}</span>
                    </Badge>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground text-center py-6">No role data</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="p-4 pb-2">
              <CardTitle className="text-sm">Leave Requests by Status (YTD)</CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-2">
              {Object.keys(data.leaves.byStatus).length > 0 ? (
                <BarChart
                  data={Object.entries(data.leaves.byStatus).map(([status, cnt]) => ({
                    label: status,
                    value: cnt,
                    color: status === "APPROVED" ? "bg-green-500" : status === "REJECTED" ? "bg-red-500" : "bg-amber-500",
                  }))}
                />
              ) : (
                <p className="text-xs text-muted-foreground text-center py-6">No leave data</p>
              )}
            </CardContent>
          </Card>

          {data.leaves.byMonth.length > 0 && (
            <Card className="md:col-span-2">
              <CardHeader className="p-4 pb-2">
                <CardTitle className="text-sm">Leave Requests by Month</CardTitle>
              </CardHeader>
              <CardContent className="p-4 pt-2">
                {(() => {
                  const monthData = data.leaves.byMonth;
                  const max = Math.max(...monthData.map((x) => x.count), 1);
                  const points = monthData
                    .map((m, i) => {
                      const x = monthData.length > 1 ? (i / (monthData.length - 1)) * 100 : 50;
                      const y = 100 - (m.count / max) * 100;
                      return `${x},${y}`;
                    })
                    .join(" ");

                  return (
                    <div className="relative rounded-lg border border-border/60 bg-muted/10 p-3">
                      <div className="pointer-events-none absolute inset-x-3 top-3 h-32">
                        <div className="h-full w-full bg-[linear-gradient(to_top,transparent_24%,hsl(var(--border)/0.35)_25%,transparent_26%,transparent_49%,hsl(var(--border)/0.35)_50%,transparent_51%,transparent_74%,hsl(var(--border)/0.35)_75%,transparent_76%)]" />
                      </div>

                      <div className="relative flex items-end gap-1 h-32">
                        {monthData.map((m) => {
                          const height = Math.max(6, (m.count / max) * 100);
                          return (
                            <div key={m.month} className="flex-1 flex flex-col items-center gap-1">
                              <span className="text-[9px] font-medium tabular-nums">{m.count}</span>
                              <div
                                className="w-full rounded-t-md bg-gradient-to-t from-primary/90 to-primary/40 shadow-[0_0_0_1px_hsl(var(--primary)/0.15)_inset]"
                                style={{ height: `${height}%` }}
                                aria-hidden="true"
                              />
                              <span className="text-[8px] text-muted-foreground">{m.month.slice(5)}</span>
                            </div>
                          );
                        })}
                      </div>

                      <svg
                        viewBox="0 0 100 100"
                        preserveAspectRatio="none"
                        className="pointer-events-none absolute inset-x-3 top-3 h-32 w-[calc(100%-1.5rem)]"
                        aria-hidden="true"
                      >
                        <polyline
                          points={points}
                          fill="none"
                          stroke="hsl(var(--gold))"
                          strokeWidth="1.8"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </div>
                  );
                })()}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </PageWrapper>
  );
}

export default function HrAnalyticsPage() {
  return (
    <DashboardGate allowedRoles={["CEO", "HR"]}>
      <AnalyticsContent />
    </DashboardGate>
  );
}
