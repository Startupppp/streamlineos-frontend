"use client";

import Link from "next/link";
import { GitBranch } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { ErrorState } from "@/components/shared/error-state";
import { useReportingLine } from "@/hooks/api/hr/reporting-lines";
import type { ManagerState, ReportingLineEntry } from "@/hooks/api/hr/reporting-lines-schema";
import { statusToneClasses, type StatusTone } from "@/lib/design-tokens";
import { formatShortDate } from "@/lib/date-utils";
import { getErrorMessage } from "@/lib/get-error-message";
import { cn } from "@/lib/utils";

const MANAGER_STATE_LABEL: Record<ManagerState, { label: string; tone: StatusTone }> = {
  active: { label: "Active", tone: "success" },
  "on-notice": { label: "On notice", tone: "warning" },
  inactive: { label: "Inactive", tone: "danger" },
  exited: { label: "Exited", tone: "danger" },
};

function ManagerStateBadge({ state }: { state: ManagerState }) {
  const { label, tone } = MANAGER_STATE_LABEL[state];
  const classes = statusToneClasses(tone);
  return (
    <Badge variant="outline" className={cn("h-5 px-2 py-0.5 text-micro", classes.surface, classes.ink, classes.rule)}>
      {label}
    </Badge>
  );
}

function ManagerRow({ entry, label }: { entry: ReportingLineEntry; label: string }) {
  const name = entry.managerName ?? entry.managerEmail ?? "Unnamed manager";
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-border/60 px-3 py-2">
      <div className="min-w-0">
        <p className="text-dense font-medium uppercase tracking-wider text-muted-foreground">{label}</p>
        {entry.managerUserId ? (
          <Link href={`/hr/employees/${entry.managerUserId}`} className="text-sm font-medium text-primary hover:underline">
            {name}
          </Link>
        ) : (
          <p className="text-sm font-medium">{name}</p>
        )}
        <p className="text-dense text-muted-foreground">
          {entry.managerDesignation ? `${entry.managerDesignation} · ` : ""}
          from <span className="font-mono">{formatShortDate(entry.effectiveFrom)}</span>
          {entry.effectiveTo ? (
            <>
              {" "}
              to <span className="font-mono">{formatShortDate(entry.effectiveTo)}</span>
            </>
          ) : null}
        </p>
      </div>
      <ManagerStateBadge state={entry.managerState} />
    </div>
  );
}

export function ReportingLineSection({ employeeId }: { employeeId: string }) {
  const { data, isLoading, isError, error, refetch } = useReportingLine(employeeId);

  function handleRetry() {
    void refetch();
  }

  return (
    <Card className="rounded-2xl border border-border/70 bg-card/90 backdrop-blur-sm shadow-card overflow-hidden">
      <CardContent className="p-4">
        <div className="mb-3 flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10">
            <GitBranch className="h-3.5 w-3.5 text-primary" />
          </div>
          <h3 className="text-sm font-semibold text-foreground">Reporting line</h3>
        </div>
        {isLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-14 w-full rounded-lg" />
            <Skeleton className="h-14 w-full rounded-lg" />
          </div>
        ) : isError ? (
          <ErrorState compact title="Couldn't load the reporting line" description={getErrorMessage(error)} onRetry={handleRetry} />
        ) : !data || (data.current === null && data.upcoming.length === 0) ? (
          <div className={cn("rounded-lg border px-3 py-2 text-sm", statusToneClasses("warning").surface, statusToneClasses("warning").ink, statusToneClasses("warning").rule)}>
            No reporting manager is on record. Leave, time and expense approvals fall back to the department head and then the HR queue until one is set.
          </div>
        ) : (
          <div className="space-y-2">
            {data.current ? <ManagerRow entry={data.current} label="Reports to" /> : null}
            {data.upcoming.map((entry) => (
              <ManagerRow key={entry.lineId} entry={entry} label="Scheduled change" />
            ))}
            {data.history.length > 1 ? (
              <p className="text-dense text-muted-foreground">
                {data.history.length} reporting-line records on file.
              </p>
            ) : null}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
