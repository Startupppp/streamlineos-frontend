"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/shared/error-state";
import { ReportingRelationshipBadge } from "@/components/hr/reporting-lines/reporting-relationship-badge";
import { describeManager } from "@/components/hr/reporting-lines/manager-candidate-picker";
import { useModuleEnabled } from "@/hooks/api/access";
import { useMyReportingLine, useMyReportingManagerRequests } from "@/hooks/api/hr/my-reporting-line";
import type { RelationshipEntry } from "@/hooks/api/hr/reporting-lines-schema";
import { formatShortDate } from "@/lib/date-utils";
import { getErrorMessage } from "@/lib/get-error-message";
import { isActiveRequest, MyReportingRequestsList } from "./my-reporting-requests-list";
import { ReportIssueDialog } from "./report-issue-dialog";

function ManagerRow({ entry, heading }: { entry: RelationshipEntry; heading: string }) {
  const fallback = entry.isFallback && !entry.fallbackConfirmedAt;
  return (
    <div className="flex flex-col gap-1 rounded-lg border border-border/60 px-3 py-2">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-dense font-medium text-muted-foreground">{heading}</span>
        {entry.relationshipType === "SECONDARY" ? <ReportingRelationshipBadge kind="secondary" label={entry.label} /> : null}
        {fallback ? <ReportingRelationshipBadge kind="fallback" /> : null}
      </div>
      <span className="text-sm font-medium">{entry.manager.name}</span>
      <span className="text-dense text-muted-foreground">
        {describeManager(entry.manager)} · from <span className="font-mono">{formatShortDate(entry.effectiveFrom)}</span>
      </span>
    </div>
  );
}

/**
 * The employee's own reporting line on /settings (PRD §7.5). Renders nothing
 * where it has nothing to say: HR off, or a member with no employment.
 */
export function MyReportingLineSection() {
  const hrEnabled = useModuleEnabled("hr");
  const { data, isLoading, isError, error, refetch } = useMyReportingLine();
  const requests = useMyReportingManagerRequests({ enabled: hrEnabled });
  const [reporting, setReporting] = useState(false);

  const hasActiveRequest = (requests.data?.pages ?? []).some((page) => page.items.some(isActiveRequest));

  function handleRetry() {
    void refetch();
  }

  function handleOpenReport() {
    setReporting(true);
  }

  function handleDuplicate() {
    void requests.refetch();
  }

  if (!hrEnabled || data?.hasEmployment === false) return null;

  return (
    <section className="flex flex-col gap-4 rounded-xl border border-border bg-card p-5 shadow-sm" aria-labelledby="reporting-line-heading">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 id="reporting-line-heading" className="text-sm font-semibold text-foreground">
            Reporting line
          </h2>
          <p className="mt-0.5 text-xs text-muted-foreground">Who you report to. Only HR can change it.</p>
        </div>
        {data ? (
          <Button type="button" variant="outline" onClick={handleOpenReport} disabled={hasActiveRequest} className="w-full sm:w-auto">
            Report an issue
          </Button>
        ) : null}
      </div>
      {isLoading ? (
        <div className="flex flex-col gap-2">
          <Skeleton className="h-16 w-full rounded-lg" />
        </div>
      ) : isError ? (
        <ErrorState compact title="Couldn't load your reporting line" description={getErrorMessage(error)} onRetry={handleRetry} />
      ) : data ? (
        <div className="flex flex-col gap-2">
          {data.primary ? <ManagerRow entry={data.primary} heading="Primary reporting manager" /> : null}
          {data.secondary.length > 0 ? (
            <div className="flex flex-col gap-2">
              <span className="text-dense font-medium text-muted-foreground">Additional reporting managers</span>
              {data.secondary.map((entry) => (
                <ManagerRow key={entry.lineId} entry={entry} heading="Additional" />
              ))}
            </div>
          ) : null}
          {!data.primary && data.topLevel ? (
            <p className="text-sm text-muted-foreground">
              Your role is top-level: you report to no one, from{" "}
              <span className="font-mono">{formatShortDate(data.topLevel.effectiveFrom)}</span>.
            </p>
          ) : null}
          {!data.primary && !data.topLevel ? (
            <p className="text-sm text-muted-foreground">No reporting manager is on record for you.</p>
          ) : null}
          {hasActiveRequest ? (
            <p className="text-dense text-muted-foreground">
              You have a request under review. Cancel it below to report a different issue.
            </p>
          ) : null}
        </div>
      ) : null}
      <MyReportingRequestsList />
      <ReportIssueDialog
        open={reporting}
        onOpenChange={setReporting}
        currentManagerName={data?.primary?.manager.name ?? null}
        onDuplicate={handleDuplicate}
      />
    </section>
  );
}
