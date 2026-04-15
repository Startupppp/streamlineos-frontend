"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { CalendarOff } from "lucide-react";
import { useHrLeaveAnalytics } from "@/lib/api/hooks/hr/leaves-expenses";

export function LeaveAnalyticsWidget() {
  const { data, isLoading } = useHrLeaveAnalytics();
  const maxCount = Math.max(...(data?.byDepartment ?? []).map((d) => d.total), 1);

  return (
    <Card>
      <CardHeader className="p-4 pb-2 flex flex-row items-center gap-2">
        <CalendarOff className="h-4 w-4 text-muted-foreground" />
        <CardTitle className="text-sm font-medium">
          Leave Utilization {data?.year ? `(${data.year})` : ""}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4 pt-0">
        {isLoading ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => <Skeleton key={i} className="h-4 w-full" />)}
          </div>
        ) : !data || data.byDepartment.length === 0 ? (
          <p className="text-xs text-muted-foreground py-4 text-center">
            No leave data for this year
          </p>
        ) : (
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wide font-medium">
                By Department
              </p>
              {data.byDepartment.map((d) => (
                <div key={d.department} className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground w-24 truncate shrink-0">
                    {d.department}
                  </span>
                  <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gold/70"
                      style={{ width: `${(d.total / maxCount) * 100}%` }}
                    />
                  </div>
                  <Badge variant="secondary" className="text-[10px] tabular-nums shrink-0">
                    {d.approved}✓ {d.pending}⋯
                  </Badge>
                </div>
              ))}
            </div>
            <div className="space-y-1.5">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wide font-medium">
                Monthly Trend
              </p>
              <div className="flex items-end gap-0.5 h-20">
                {data.monthlyTrend.map((m) => {
                  const maxM = Math.max(...data.monthlyTrend.map((x) => x.count), 1);
                  const pct = Math.round((m.count / maxM) * 100);
                  return (
                    <div key={m.month} className="flex flex-col items-center gap-0.5 flex-1">
                      <div
                        className="w-full rounded-sm bg-gold/60"
                        style={{ height: `${Math.max(4, pct)}%`, minHeight: "2px" }}
                        title={`${m.month}: ${m.count}`}
                      />
                      <span className="text-[8px] text-muted-foreground">{m.month}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
