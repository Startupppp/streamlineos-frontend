"use client";

import Link from "next/link";
import { useState } from "react";
import { GitBranch, Pencil } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/ui/loading-button";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/shared/error-state";
import { ReportingRelationshipBadge } from "@/components/hr/reporting-lines/reporting-relationship-badge";
import { ReportingRequestStatusBadge } from "@/components/hr/reporting-lines/reporting-status-badge";
import { useCan } from "@/hooks/api/access";
import { useConfirmReportingFallback, useReportingLine } from "@/hooks/api/hr/reporting-lines";
import type { ReportingLineView } from "@/hooks/api/hr/reporting-lines-schema";
import { statusToneClasses } from "@/lib/design-tokens";
import { formatShortDate } from "@/lib/date-utils";
import { getErrorMessage } from "@/lib/get-error-message";
import { cn } from "@/lib/utils";
import { PrimaryLineRow, RelationshipRow } from "./reporting-line-rows";
import { ReportingLineEditorSheet } from "./reporting-line-editor-sheet";

interface LineBodyProps {
  employeeId: string;
  line: ReportingLineView;
  canManage: boolean;
  onEdit: () => void;
}

function LineBody({ employeeId, line, canManage, onEdit }: LineBodyProps) {
  const confirmFallback = useConfirmReportingFallback();
  const canReview = useCan("hr:reporting-lines:review") && line.permittedActions.review;
  const current = line.current;
  const unconfirmedFallback = current !== null && current.isFallback && !current.fallbackConfirmedAt;
  const warning = statusToneClasses("warning");

  function handleKeepFallback() {
    confirmFallback.mutate(employeeId, {
      onSuccess: () => toast.success("Manager confirmed"),
      onError: (error) => toast.error(getErrorMessage(error)),
    });
  }

  return (
    <div className="flex flex-col gap-2">
      {current ? (
        <PrimaryLineRow
          entry={current}
          label="Primary reporting manager"
          badges={unconfirmedFallback ? <ReportingRelationshipBadge kind="fallback" /> : null}
          actions={
            unconfirmedFallback && canManage ? (
              <>
                <Button type="button" size="sm" variant="outline" onClick={onEdit}>
                  Replace manager
                </Button>
                <LoadingButton type="button" size="sm" variant="ghost" isPending={confirmFallback.isPending} onClick={handleKeepFallback}>
                  Keep as manager
                </LoadingButton>
              </>
            ) : null
          }
        />
      ) : line.topLevel ? (
        <div className="flex flex-col gap-1 rounded-lg border border-border/60 px-3 py-2">
          <div className="flex items-center gap-1.5">
            <ReportingRelationshipBadge kind="topLevel" />
            <span className="text-dense text-muted-foreground">
              since <span className="font-mono">{formatShortDate(line.topLevel.effectiveFrom)}</span>
            </span>
          </div>
          {line.topLevel.reason ? <p className="text-sm">{line.topLevel.reason}</p> : null}
        </div>
      ) : (
        <div className={cn("rounded-lg border px-3 py-2 text-sm", warning.surface, warning.ink, warning.rule)}>
          No reporting manager is on record. Leave, time and expense approvals fall back to the department head and then the HR queue until one is set.
        </div>
      )}
      {line.upcoming.map((entry) => (
        <PrimaryLineRow key={entry.lineId} entry={entry} label="Scheduled primary change" />
      ))}
      {line.secondary.length > 0 ? (
        <div className="flex flex-col gap-2 pt-1">
          <p className="text-xs font-medium text-muted-foreground">Additional reporting managers</p>
          {line.secondary.map((entry) => (
            <RelationshipRow
              key={entry.lineId}
              entry={entry}
              label="Additional reporting manager"
              badges={<ReportingRelationshipBadge kind="secondary" label={entry.label} />}
            />
          ))}
        </div>
      ) : null}
      {line.pendingRequest ? (
        <div className="flex flex-wrap items-center gap-2 text-dense text-muted-foreground">
          <span>The employee asked HR to review this line</span>
          <ReportingRequestStatusBadge status={line.pendingRequest.status} />
          {canReview ? (
            <Link
              href={`/hr/employees/reporting-requests?request=${line.pendingRequest.requestId}`}
              className="font-medium text-primary hover:underline"
            >
              Review request
            </Link>
          ) : null}
        </div>
      ) : null}
      {line.history.length > 1 ? (
        <p className="text-dense text-muted-foreground">
          <span className="tabular-nums">{line.history.length}</span> reporting-line records on file.
        </p>
      ) : null}
    </div>
  );
}

export function ReportingLineSection({ employeeId }: { employeeId: string }) {
  const { data, isLoading, isError, error, refetch } = useReportingLine(employeeId);
  const canManageKey = useCan("hr:reporting-lines:manage");
  const canManage = canManageKey && data?.permittedActions.manage === true;
  const [editing, setEditing] = useState(false);

  function handleRetry() {
    void refetch();
  }

  function handleEdit() {
    setEditing(true);
  }

  return (
    <Card className="rounded-2xl border border-border/70 bg-card/90 backdrop-blur-sm shadow-card overflow-hidden">
      <CardContent className="p-4">
        <div className="mb-3 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10">
              <GitBranch className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
            </div>
            <h3 className="text-sm font-semibold text-foreground">Reporting line</h3>
          </div>
          {canManage ? (
            <Button type="button" size="sm" variant="ghost" className="gap-1" onClick={handleEdit}>
              <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
              Edit
            </Button>
          ) : null}
        </div>
        {isLoading ? (
          <div className="flex flex-col gap-2">
            <Skeleton className="h-14 w-full rounded-lg" />
            <Skeleton className="h-14 w-full rounded-lg" />
          </div>
        ) : isError ? (
          <ErrorState compact title="Couldn't load the reporting line" description={getErrorMessage(error)} onRetry={handleRetry} />
        ) : data ? (
          <LineBody employeeId={employeeId} line={data} canManage={canManage} onEdit={handleEdit} />
        ) : null}
      </CardContent>
      {editing && data ? (
        <ReportingLineEditorSheet open={editing} onOpenChange={setEditing} employeeUserId={employeeId} line={data} />
      ) : null}
    </Card>
  );
}
