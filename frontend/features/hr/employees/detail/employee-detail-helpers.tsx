"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { TruncatedText } from "@/components/ui/truncated-text";
import { useDirectReports, useManagerScorecard, useEmployeeAvailability } from "@/hooks/api/hr";
import { cn, resolveImageUrl } from "@/lib/utils";
import Link from "next/link";
import {
  AlertCircle,
  BarChart2,
  CheckCircle2,
  Users,
  XCircle,
} from "lucide-react";

export function AvailabilityBadge({ userId }: { userId: string }) {
  const { data } = useEmployeeAvailability([userId]);
  const entry = data?.find((e) => e.userId === userId);
  if (!entry) return null;

  if (entry.status === "ON_LEAVE") {
    const label = `On Leave${entry.leaveType ? ` (${entry.leaveType})` : ""}`;
    return (
      <span className="inline-flex items-center gap-1 text-micro font-semibold px-2 py-0.5 rounded-full border bg-rose-100 text-rose-700 border-rose-200 dark:bg-rose-500/10 dark:text-rose-300 dark:border-rose-500/30">
        <XCircle className="h-3 w-3" />
        {label}
      </span>
    );
  }
  if (entry.status === "HALF_DAY") {
    return (
      <span className="inline-flex items-center gap-1 text-micro font-semibold px-2 py-0.5 rounded-full border bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-300 dark:border-amber-500/30">
        <AlertCircle className="h-3 w-3" />
        Half Day
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-micro font-semibold px-2 py-0.5 rounded-full border bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:border-emerald-500/30">
      <CheckCircle2 className="h-3 w-3" />
      Available
    </span>
  );
}

export function StatBlock({
  label,
  value,
  colorClass,
}: {
  label: string;
  value: string | number;
  colorClass?: string;
}) {
  return (
    <div className="min-w-0 flex-1 text-center px-2 sm:px-4 first:pl-0 last:pr-0">
      <p
        className={cn(
          "text-2xl font-bold tabular-nums sm:text-3xl",
          colorClass ?? "text-foreground",
        )}
      >
        {value}
      </p>
      <p className="mt-0.5 text-micro font-semibold uppercase tracking-wider text-muted-foreground sm:text-dense">
        {label}
      </p>
    </div>
  );
}

export function InfoField({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string | null | undefined;
  icon?: React.ComponentType<{ className?: string }>;
}) {
  if (!value) return null;
  return (
    <div className="flex min-w-0 items-start gap-2 sm:min-w-[10rem]">
      {Icon && (
        <Icon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
      )}
      <div className="min-w-0 space-y-0.5">
        <p className="text-micro font-semibold uppercase tracking-wider text-muted-foreground">
          {label}
        </p>
        <TruncatedText text={value} className="text-sm font-medium leading-snug" />
      </div>
    </div>
  );
}

export function DirectReportsSection({ employeeId }: { employeeId: string }) {
  const { data: reports, isLoading } = useDirectReports(employeeId);

  if (isLoading) {
    return (
      <Card className="rounded-2xl border border-border/70 bg-card/90 backdrop-blur-sm shadow-[0_1px_2px_rgba(15,23,42,0.04),0_12px_32px_-14px_rgba(15,23,42,0.12)] overflow-hidden">
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-7 rounded-lg bg-primary/10 flex items-center justify-center">
              <Users className="h-3.5 w-3.5 text-primary" />
            </div>
            <h3 className="text-sm font-semibold text-foreground">
              Direct Reports
            </h3>
          </div>
          <div className="space-y-2">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full rounded-lg" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }
  if (!reports || reports.length === 0) return null;

  return (
    <Card className="rounded-2xl border border-border/70 bg-card/90 backdrop-blur-sm shadow-[0_1px_2px_rgba(15,23,42,0.04),0_12px_32px_-14px_rgba(15,23,42,0.12)] overflow-hidden">
      <CardContent className="p-4">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-7 rounded-lg bg-primary/10 flex items-center justify-center">
            <Users className="h-3.5 w-3.5 text-primary" />
          </div>
          <h3 className="text-sm font-semibold text-foreground">
            Direct Reports
          </h3>
          <span className="ml-auto inline-flex items-center text-micro font-semibold px-2 py-0.5 rounded-full border bg-muted text-muted-foreground border-border">
            {reports.length}
          </span>
        </div>
        <div className="space-y-1">
          {reports.map((r) => (
            <Link
              key={r.id}
              href={`/hr/employees/${r.id}`}
              className="flex items-center gap-2.5 hover:bg-muted/60 rounded-lg p-2 transition-colors duration-200"
            >
              <Avatar className="w-7 shrink-0">
                <AvatarImage src={resolveImageUrl(r.image)} />
                <AvatarFallback className="text-xs bg-muted text-muted-foreground font-bold">
                  {(r.name ?? "?")[0]?.toUpperCase() ?? "?"}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <TruncatedText
                  text={r.name ?? r.email ?? ""}
                  className="text-sm font-medium"
                />
                {r.designation && (
                  <TruncatedText
                    text={r.designation}
                    className="text-dense text-muted-foreground"
                  />
                )}
              </div>
            </Link>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export function ManagerScorecardSection({ employeeId }: { employeeId: string }) {
  const { data: scorecard, isLoading } = useManagerScorecard(employeeId);

  if (isLoading) return <Skeleton className="h-28 w-full rounded-2xl" />;
  if (!scorecard || scorecard.teamSize === 0) return null;

  return (
    <Card className="rounded-2xl border border-border/70 bg-card/90 backdrop-blur-sm shadow-[0_1px_2px_rgba(15,23,42,0.04),0_12px_32px_-14px_rgba(15,23,42,0.12)] overflow-hidden">
      <CardContent className="p-4">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-7 rounded-lg bg-primary/10 flex items-center justify-center">
            <BarChart2 className="h-3.5 w-3.5 text-primary" />
          </div>
          <h3 className="text-sm font-semibold text-foreground">
            Manager Scorecard
          </h3>
        </div>
        <div className="grid grid-cols-3 divide-x divide-border">
          <StatBlock
            label="Team Size"
            value={scorecard.teamSize}
            colorClass="text-primary"
          />
          <StatBlock
            label="Avg Rating"
            value={
              scorecard.avgPerformanceRating !== null
                ? `${scorecard.avgPerformanceRating}/5`
                : "N/A"
            }
            colorClass="text-primary"
          />
          <StatBlock
            label="Attendance"
            value={
              scorecard.teamAttendanceRate !== null
                ? `${scorecard.teamAttendanceRate}%`
                : "N/A"
            }
            colorClass="text-emerald-700 dark:text-emerald-300"
          />
        </div>
        {scorecard.pendingLeaveRequests > 0 && (
          <div className="mt-3 flex items-center gap-1.5 rounded-lg bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/30 px-3 py-2">
            <AlertCircle className="h-3.5 w-3.5 text-amber-600 dark:text-amber-300 shrink-0" />
            <p className="text-xs text-amber-700 dark:text-amber-300 font-medium">
              {scorecard.pendingLeaveRequests} pending leave request
              {scorecard.pendingLeaveRequests !== 1 ? "s" : ""} awaiting
              approval
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
