"use client";

import { useState } from "react";
import { toast } from "sonner";
import { format } from "date-fns";
import { PlusIcon } from "@animateicons/react/lucide";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { PageState } from "@/components/shared/page-state";
import { Skeleton } from "@/components/ui/skeleton";
import { AnimatedIconButton } from "@/components/ui/animated-icon-button";
import { LoadingButton } from "@/components/ui/loading-button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { StatusBadge } from "@/components/ui/status-badge";
import { EmptyState } from "@/components/ui/empty-state";
import { PAGE_BODY_EMPTY_CLASS, PAGE_BODY_SKELETON_CLASS } from "@/components/ui/content-fill-panel";
import { usePageState } from "@/hooks/api/use-page-state";
import { useCan } from "@/hooks/api/access";
import { useMyResignations, useWithdrawMyResignation, type Resignation } from "@/hooks/api/hr/exit";
import { getErrorMessage } from "@/lib/get-error-message";
import { ResignationFormSheet } from "@/components/hr/resignation-form-sheet";

const ACTIVE_STATUSES = new Set(["SUBMITTED", "PENDING_HR", "HR_APPROVED"]);

function formatDay(value: string | null | undefined): string {
  return value ? format(new Date(value), "dd MMM yyyy") : "—";
}

interface ResignationRowProps {
  resignation: Resignation;
  canWithdraw: boolean;
  isWithdrawing: boolean;
  onWithdraw: (resignationId: number) => void;
}

export function MyResignationSkeleton() {
  return (
    <div className={PAGE_BODY_SKELETON_CLASS}>
      {Array.from({ length: 4 }, (_, i) => (
        <Skeleton key={"row-" + String(i)} className="h-16 w-full rounded-lg" />
      ))}
    </div>
  );
}

function ResignationRow({
  resignation,
  canWithdraw,
  isWithdrawing,
  onWithdraw,
}: ResignationRowProps) {
  function handleWithdraw() {
    onWithdraw(resignation.id);
  }
  return (
    <li className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-card p-4">
      <div className="flex min-w-0 flex-col gap-1">
        <div className="flex items-center gap-2">
          <StatusBadge status={resignation.status} />
          {resignation.reasonCategory ? (
            <span className="truncate text-sm text-foreground">{resignation.reasonCategory}</span>
          ) : null}
        </div>
        <span className="text-dense text-muted-foreground tabular-nums">
          Submitted {formatDay(resignation.createdAt)} · Last working day {formatDay(resignation.lastWorkingDate)}
        </span>
      </div>
      {canWithdraw && ACTIVE_STATUSES.has(resignation.status ?? "") ? (
        <LoadingButton variant="outline" size="sm" isPending={isWithdrawing} onClick={handleWithdraw}>
          Withdraw
        </LoadingButton>
      ) : null}
    </li>
  );
}

export function MyResignationPage() {
  const { data, isLoading, isError, error, refetch } = useMyResignations();
  const pageState = usePageState({ permission: "self:resignation", isLoading, isError, error });
  const canResign = useCan("self:resignation");
  const withdraw = useWithdrawMyResignation();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [withdrawId, setWithdrawId] = useState<number | null>(null);

  const resignations = data?.data ?? [];
  const hasActive = resignations.some((r) => ACTIVE_STATUSES.has(r.status ?? ""));

  function handleOpenSheet() {
    setSheetOpen(true);
  }
  function handleRetry() {
    void refetch();
  }
  function handleWithdrawOpenChange(open: boolean) {
    if (!open) setWithdrawId(null);
  }
  function handleConfirmWithdraw() {
    if (withdrawId === null) return;
    withdraw.mutate(
      { resignationId: withdrawId },
      {
        onSuccess: () => {
          toast.success("Resignation withdrawn");
          setWithdrawId(null);
        },
        onError: (e) => toast.error(getErrorMessage(e)),
      },
    );
  }

  const action =
    canResign && !hasActive ? (
      <AnimatedIconButton icon={PlusIcon} iconSize={14} size="sm" className="gap-1.5" onClick={handleOpenSheet}>
        Submit resignation
      </AnimatedIconButton>
    ) : undefined;

  return (
    <PageWrapper
      title="Resignation"
      subtitle="Submit, follow and withdraw your resignation"
      actions={action}
      noInternalScroll
      contentClassName="flex min-h-0 flex-1 flex-col"
    >
      <PageState
        resolution={pageState}
        className="flex min-h-0 flex-1 flex-col"
        loading={<MyResignationSkeleton />}
        onRetry={handleRetry}
      >
        {resignations.length === 0 ? (
          <EmptyState
            title="No resignation on record"
            description="If you decide to leave, submit your resignation here. HR reviews it before your exit begins."
            action={canResign ? { label: "Submit resignation", onClick: handleOpenSheet } : undefined}
            className={PAGE_BODY_EMPTY_CLASS}
          />
        ) : (
          <ul className="flex flex-col gap-2">
            {resignations.map((r) => (
              <ResignationRow
                key={r.id}
                resignation={r}
                canWithdraw={canResign}
                isWithdrawing={withdraw.isPending && withdrawId === r.id}
                onWithdraw={setWithdrawId}
              />
            ))}
          </ul>
        )}
      </PageState>

      <ResignationFormSheet open={sheetOpen} onOpenChange={setSheetOpen} />
      <ConfirmDialog
        open={withdrawId !== null}
        onOpenChange={handleWithdrawOpenChange}
        title="Withdraw resignation"
        description="Your resignation will be withdrawn and HR will stop processing it. You can submit a new one later."
        confirmLabel="Withdraw"
        destructive
        keepOpenOnConfirm
        onConfirm={handleConfirmWithdraw}
        isPending={withdraw.isPending}
      />
    </PageWrapper>
  );
}
