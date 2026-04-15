"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Timer } from "lucide-react";
import { useHrTimeToFill } from "@/lib/api/hooks/hr/dashboard";

export function TimeToFillWidget() {
  const { data, isLoading } = useHrTimeToFill();

  return (
    <Card>
      <CardHeader className="p-4 pb-2 flex flex-row items-center gap-2">
        <Timer className="h-4 w-4 text-muted-foreground" />
        <CardTitle className="text-sm font-medium">Time to Fill</CardTitle>
      </CardHeader>
      <CardContent className="p-4 pt-0">
        {isLoading ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => <Skeleton key={i} className="h-4 w-full" />)}
          </div>
        ) : data?.avgDaysOverall == null ? (
          <p className="text-xs text-muted-foreground py-4 text-center">No filled roles yet</p>
        ) : (
          <div className="space-y-3">
            <div className="flex items-end gap-1">
              <span className="text-2xl font-bold">{data.avgDaysOverall}</span>
              <span className="text-sm text-muted-foreground mb-0.5">avg days</span>
            </div>
            {data.byDepartment.length > 0 && (
              <div className="space-y-1.5">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wide font-medium">
                  By Department
                </p>
                {data.byDepartment.slice(0, 4).map((d) => (
                  <div key={d.department} className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground flex-1 truncate">
                      {d.department}
                    </span>
                    <Badge variant="secondary" className="text-[10px] tabular-nums shrink-0">
                      {d.avgDays}d · {d.filledCount} filled
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
