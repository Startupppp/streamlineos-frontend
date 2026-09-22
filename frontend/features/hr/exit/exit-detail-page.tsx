"use client";

import { useState } from "react";
import { toast } from "sonner";
import { CheckCheckIcon } from "@animateicons/react/lucide";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Skeleton } from "@/components/ui/skeleton";
import { StatCardGridSkeleton } from "@/components/ui/stat-card";
import { AnimatedIconButton } from "@/components/ui/animated-icon-button";
import { ConfirmWithReasonSheet } from "@/components/ui/confirm-with-reason-sheet";
import { CONTENT_PANEL_SOLID } from "@/components/ui/content-fill-panel";
import { PageState } from "@/components/shared/page-state";
import { usePageState } from "@/hooks/api/use-page-state";
import { useCan } from "@/hooks/api/access";
import { useCompleteExit, useResignation, type ResignationDetail } from "@/hooks/api/hr/exit";
import { getErrorMessage } from "@/lib/get-error-message";
import { getUserDisplayName } from "@/lib/person-display";
import { formatShortDate } from "@/lib/date-utils";
import { cn } from "@/lib/utils";
import { ExitChecklistPanel } from "./exit-checklist-panel";
import { ExitTimeline, type ExitTimelineStep } from "./exit-timeline";

interface ExitDetailPageProps {
  resignationId: number;
}

const COMPLETABLE_STATUSES = new Set(["FINAL_APPROVED", "IN_PROGRESS", "APPROVED"]);

function statusLabel(status: string): string {
  return status.toLowerCase().replace(/_/g, " ");
}

function withDisplayTimestamp(step: ResignationDetail["progress"][number]): ExitTimelineStep {
  return { ...step, timestamp: step.timestamp ? formatShortDate(step.timestamp) : null };
}

function DetailSkeleton() {
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      <StatCardGridSkeleton count={4} />
      <div className={cn(CONTENT_PANEL_SOLID, "divide-y divide-border/60")}>
        {Array.from({ length: 8 }).map((_, index) => (
          <div key={index} className="flex items-center gap-3 px-4 py-3">
            <Skeleton className="h-8 w-8 rounded-md" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-3.5 w-1/2" />
              <Skeleton className="h-3 w-1/3" />
            </div>
            <Skeleton className="h-8 w-24 rounded-md" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function ExitDetailPage({ resignationId }: ExitDetailPageProps) {
  const { data: exit, isLoading, isError, error, refetch } = useResignation(resignationId);
  const pageState = usePageState({ permission: "hr:exit:view", isLoading, isError, error });
  const canManage = useCan("hr:exit:manage");
  const completeExit = useCompleteExit();
  const [completeOpen, setCompleteOpen] = useState(false);

  function handleRetry() {
    void refetch();
  }

  function handleOpenComplete() {
    setCompleteOpen(true);
  }

  function handleConfirmComplete(reason: string) {
    completeExit.mutate(
      { exitId: resignationId, overrideReason: reason.length > 0 ? reason : undefined },
      {
        onSuccess: () => {
          toast.success("Exit completed");
          setCompleteOpen(false);
        },
        onError: (mutationError) => toast.error(getErrorMessage(mutationError)),
      },
    );
  }

  const title = exit ? getUserDisplayName(exit.user) : "Exit";
  const subtitle = exit
    ? `${statusLabel(exit.status)}${exit.lastWorkingDate ? ` · last working day ${formatShortDate(exit.lastWorkingDate)}` : ""}`
    : "Offboarding checklist, owners and progress";
  const showComplete = canManage && exit !== undefined && COMPLETABLE_STATUSES.has(exit.status);
  const openItems = exit?.checklist.summary.open ?? 0;

  return (
    <PageWrapper
      title={title}
      subtitle={subtitle}
      backHref="/hr/exit"
      backLabel="Back to exit management"
      actions={
        showComplete ? (
          <AnimatedIconButton icon={CheckCheckIcon} iconClassName="mr-1.5" size="sm" onClick={handleOpenComplete}>
            Complete exit
          </AnimatedIconButton>
        ) : undefined
      }
    >
      <PageState resolution={pageState} loading={<DetailSkeleton />} onRetry={handleRetry} className="flex-1">
        {exit ? (
          <div className="grid min-h-0 flex-1 gap-4 lg:grid-cols-[minmax(0,1fr)_18rem]">
            <ExitChecklistPanel resignationId={exit.id} checklist={exit.checklist} exitStatus={exit.status} canReassign={canManage} />
            <div className="flex flex-col gap-4">
              <section className={cn(CONTENT_PANEL_SOLID, "p-4")}>
                <h2 className="text-sm font-semibold">Exit progress</h2>
                <ExitTimeline steps={exit.progress.map(withDisplayTimestamp)} className="mt-3" />
              </section>
              <section className={cn(CONTENT_PANEL_SOLID, "p-4")}>
                <h2 className="text-sm font-semibold">Resignation</h2>
                <dl className="mt-3 grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-2 text-dense">
                  <dt className="text-muted-foreground">Submitted</dt>
                  <dd className="tabular-nums">{formatShortDate(exit.createdAt)}</dd>
                  <dt className="text-muted-foreground">Notice</dt>
                  <dd className="tabular-nums">{exit.noticePeriodDays} days</dd>
                  <dt className="text-muted-foreground">Category</dt>
                  <dd>{exit.reasonCategory ?? "Not given"}</dd>
                  <dt className="text-muted-foreground">Exit interview</dt>
                  <dd>{exit.exitInterviewDate ? formatShortDate(exit.exitInterviewDate) : exit.willingForExitInterview ? "Willing, not scheduled" : "Declined"}</dd>
                  {exit.user?.designation ? (
                    <>
                      <dt className="text-muted-foreground">Role</dt>
                      <dd>{exit.user.designation}</dd>
                    </>
                  ) : null}
                </dl>
              </section>
            </div>
          </div>
        ) : null}
      </PageState>
      <ConfirmWithReasonSheet
        open={completeOpen}
        onOpenChange={setCompleteOpen}
        title="Complete this exit"
        description={
          openItems > 0
            ? `${openItems} checklist ${openItems === 1 ? "item is" : "items are"} still open. Completing now needs an override reason, which is recorded in the audit log.`
            : "Every checklist item is closed. Asset recovery and access removal are verified again before the exit closes."
        }
        reasonLabel="Override reason"
        reasonPlaceholder="Why the exit closes with items still open or a gate unverified"
        reasonRequired={openItems > 0}
        confirmLabel="Complete exit"
        destructive={false}
        isPending={completeExit.isPending}
        onConfirm={handleConfirmComplete}
      />
    </PageWrapper>
  );
}
