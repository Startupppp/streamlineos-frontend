"use client";

import { useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ShieldCheck, Download } from "lucide-react";
import { useHrCompliance } from "@/lib/api/hooks/hr/dashboard";

export function ComplianceWidget() {
  const { data, isLoading } = useHrCompliance();

  const ringColor =
    (data?.overallPct ?? 0) >= 80
      ? "text-emerald-500"
      : (data?.overallPct ?? 0) >= 60
        ? "text-amber-500"
        : "text-destructive";

  const handleExport = useCallback(() => {
    window.open("/api/hr/dashboard/export", "_blank");
  }, []);

  return (
    <Card>
      <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 text-muted-foreground" />
          <CardTitle className="text-sm font-medium">Compliance Tracker</CardTitle>
        </div>
        <button
          onClick={handleExport}
          className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground transition-colors"
          title="Export HR Report"
        >
          <Download className="h-3 w-3" />
          Export
        </button>
      </CardHeader>
      <CardContent className="p-4 pt-0">
        {isLoading ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => <Skeleton key={i} className="h-4 w-full" />)}
          </div>
        ) : !data || data.total === 0 ? (
          <p className="text-xs text-muted-foreground py-4 text-center">No employees yet</p>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <span className={`text-2xl font-bold tabular-nums ${ringColor}`}>
                {data.overallPct}%
              </span>
              <div>
                <p className="text-xs font-medium">Overall Compliance</p>
                <p className="text-[10px] text-muted-foreground">
                  {data.overallCompliant} / {data.total} employees fully profiled
                </p>
              </div>
            </div>
            <div className="space-y-1.5">
              {data.checks.map((c) => (
                <div key={c.label} className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground flex-1 truncate">{c.label}</span>
                  <div className="w-20 h-1.5 rounded-full bg-muted overflow-hidden shrink-0">
                    <div
                      className={`h-full rounded-full ${
                        c.pct >= 80
                          ? "bg-emerald-500"
                          : c.pct >= 60
                            ? "bg-amber-500"
                            : "bg-destructive"
                      }`}
                      style={{ width: `${c.pct}%` }}
                    />
                  </div>
                  <span className="text-[10px] tabular-nums text-muted-foreground w-8 text-right shrink-0">
                    {c.pct}%
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
