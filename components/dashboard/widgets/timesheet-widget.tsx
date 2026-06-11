"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { usePersonalDashboard } from "@/lib/api/hooks/dashboard";
import { Clock, CheckCircle2, AlertTriangle, ExternalLink } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

export function TimesheetWidget() {
  const { data, isLoading, error } = usePersonalDashboard();
  const ts = data?.timesheetStatus;

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-3 flex flex-row items-center justify-between space-y-0 shrink-0">
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4 text-muted-foreground shrink-0" aria-hidden="true" />
          <CardTitle className="text-sm font-semibold">Timesheet</CardTitle>
        </div>
        <Link
          href="/timesheets"
          className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
          aria-label="Go to timesheets"
        >
          <ExternalLink className="h-3 w-3" aria-hidden="true" />
        </Link>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col gap-2 pb-4">
        {isLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-9 w-full rounded-lg" />
            <Skeleton className="h-3 w-24" />
          </div>
        ) : error ? (
          <p className="text-sm text-destructive">Failed to load.</p>
        ) : ts ? (
          <>
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p
                  className={cn(
                    "text-[11px] font-semibold uppercase tracking-wide",
                    ts.submitted ? "text-emerald-600" : "text-red-600",
                  )}
                >
                  {ts.submitted ? "Submitted" : "Hours Missing"}
                </p>
                <p className="text-2xl font-bold tabular-nums leading-none mt-1">
                  {ts.hoursLogged.toFixed(1)}
                  <span className="text-sm font-normal text-muted-foreground ml-1">hrs</span>
                </p>
              </div>
              <div
                className={cn(
                  "h-9 w-9 rounded-lg flex items-center justify-center shrink-0",
                  ts.submitted ? "bg-emerald-500/10" : "bg-red-500/10",
                )}
              >
                {ts.submitted ? (
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" aria-hidden="true" />
                ) : (
                  <AlertTriangle className="h-4 w-4 text-red-600" aria-hidden="true" />
                )}
              </div>
            </div>
            <p className="text-[11px] text-muted-foreground">{ts.weekLabel}</p>
          </>
        ) : null}
      </CardContent>
    </Card>
  );
}
