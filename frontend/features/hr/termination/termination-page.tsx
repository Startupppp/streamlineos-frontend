"use client";

import { useState, useCallback, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { useCan } from "@/hooks/api/access";
import { Plus } from "lucide-react";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { PageState } from "@/components/shared/page-state";
import { usePageState } from "@/hooks/api/use-page-state";
import { ConfirmSheet } from "@/components/ui/confirm-sheet";
import { TerminationList } from "./termination-list";
import { TerminationFormSheet } from "./termination-form-sheet";
import { TerminationDetailSheet } from "./termination-detail-sheet";
import {
  useTerminations,
  useHrEmployees,
  type TerminationStatus,
} from "@/hooks/api/hr";
import { statusToneClasses } from "@/lib/design-tokens";
import { useTerminationCandidate } from "@/hooks/api/hr/termination";
import { useTerminationActions } from "./use-termination-actions";

type StatusFilter = "ALL" | TerminationStatus;

/** What `PATCH /hr/termination/:id/complete` does (termination-separation.service). */
const COMPLETION_EFFECTS =
  "removes the employee's access to this organization, ends their employment record, opens a draft final settlement, creates asset-return records for their assigned assets and starts the exit checklist.";

export function TerminationPage() {
  const canApproveExit = useCan("hr:exit:approve");
  const searchParams = useSearchParams();
  const employeeUserIdParam = searchParams.get("employeeId");
  const canManageExit = useCan("hr:exit:manage");

  const [cursorHistory, setCursorHistory] = useState<Array<string | undefined>>([undefined]);
  const cursor = cursorHistory.at(-1);
  const page = cursorHistory.length;
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");
  const {
    data: terminationsData,
    isLoading,
    isFetching,
    isError,
    error,
    refetch,
  } = useTerminations({
    cursor,
    status: statusFilter === "ALL" ? undefined : statusFilter,
  });
  const terminations = useMemo(() => terminationsData?.data ?? [], [terminationsData]);
  const { data: employeesData } = useHrEmployees({ limit: 100, isActive: "current" });

  const employees = useMemo(() => employeesData?.data ?? [], [employeesData]);
  const candidate = useTerminationCandidate(employeeUserIdParam);
  const prefilledEmployee = candidate.data;
  const prefillMissing = employeeUserIdParam !== null && candidate.isError;

  const actions = useTerminationActions({
    canApproveExit,
    terminations,
    employees,
    employeeUserIdParam,
    prefillMissing,
  });
  const missingTone = statusToneClasses("warning");

  const handleRetry = useCallback(() => {
    void refetch();
  }, [refetch]);
  // FE-41: the old branch printed "Something went wrong" for every failure,
  // discarding the 402 upgrade path and the backend message.
  const pageState = usePageState({ permission: "hr:exit:manage", isLoading, isError, error });

  const handleStatusFilterChange = useCallback((value: StatusFilter) => {
    setStatusFilter(value);
    setCursorHistory([undefined]);
  }, []);

  const handlePreviousPage = useCallback(() => {
    setCursorHistory((history) =>
      history.length > 1 ? history.slice(0, -1) : history,
    );
  }, []);

  const handleNextPage = useCallback(() => {
    const nextCursor = terminationsData?.pagination.nextCursor;
    if (nextCursor)
      setCursorHistory((history) => [...history, nextCursor]);
  }, [terminationsData?.pagination.nextCursor]);

  if (pageState.kind !== "ready" && pageState.kind !== "empty") {
    return (
      <PageWrapper
        title="Termination Management"
        subtitle="Manage employee terminations"
      >
        <PageState
          resolution={pageState}
          onRetry={handleRetry}
          loading={
            <div className="flex min-h-0 flex-1 flex-col gap-3">
              {Array.from({ length: 10 }).map((_, skeletonIndex) => (
                <Skeleton key={skeletonIndex} className="h-20 rounded-2xl" />
              ))}
            </div>
          }
        >
          {null}
        </PageState>
      </PageWrapper>
    );
  }

  return (
    <PageWrapper
      title="Termination Management"
      subtitle="Manage employee terminations"
      actions={
        canManageExit ? (
          <Button size="sm" onClick={actions.handleCreateOpen} className="gap-1.5">
            <Plus className="h-3.5 w-3.5" />
            New Termination
          </Button>
        ) : undefined
      }
    >
      {prefillMissing ? (
        <div
          role="alert"
          className={`mb-3 rounded-lg border px-3 py-2 text-dense ${missingTone.surface} ${missingTone.rule} ${missingTone.ink}`}
        >
          Employee not found. The link you followed names an employee who does not exist or whom you cannot access, so no termination was started.
        </div>
      ) : null}
      <TerminationList
        terminations={terminations}
        statusCounts={terminationsData?.statusCounts}
        pagination={terminationsData?.pagination}
        page={page}
        isFetching={isFetching}
        onPreviousPage={handlePreviousPage}
        onNextPage={handleNextPage}
        canManageExit={canManageExit}
        canApproveExit={canApproveExit}
        statusFilter={statusFilter}
        onStatusFilterChange={handleStatusFilterChange}
        onView={actions.handleViewRecord}
        onSubmit={actions.handleSetSubmitTerminationId}
        onApprove={actions.handleApprove}
        onReject={actions.handleReject}
        onSendEmail={actions.handleSendEmailOpen}
        onComplete={actions.handleSetCompleteTerminationId}
        isSubmitting={actions.submitIsPending}
        isCompleting={actions.completeIsPending}
      />

      <TerminationFormSheet
        open={actions.createOpen}
        onOpenChange={actions.handleCreateSheetOpenChange}
        canApproveExit={canApproveExit}
        isPending={actions.createIsPending}
        submitDisabled={!actions.canSubmitCreate}
        onSubmit={actions.handleCreateSubmit}
        employees={employees}
        prefilledEmployee={prefilledEmployee ?? null}
        selectedEmployeeUserId={actions.selectedEmployeeUserId}
        onSelectedEmployeeUserIdChange={actions.setSelectedEmployeeUserId}
        selectedReason={actions.selectedReason}
        onSelectedReasonChange={actions.setSelectedReason}
        remarks={actions.remarks}
        onRemarksChange={actions.handleRemarksChange}
        effectiveDate={actions.effectiveDate}
        onEffectiveDateChange={actions.handleEffectiveDateChange}
        noticePeriodWaived={actions.noticePeriodWaived}
        onNoticePeriodWaivedChange={actions.setNoticePeriodWaived}
        severanceAmount={actions.severanceAmount}
        onSeveranceAmountChange={actions.handleSeveranceAmountChange}
        internalNotes={actions.internalNotes}
        onInternalNotesChange={actions.handleInternalNotesChange}
        saveAsDraft={actions.saveAsDraft}
        onSaveAsDraftChange={actions.setSaveAsDraft}
      />

      <ConfirmSheet
        open={actions.confirmCreateOpen}
        onOpenChange={actions.handleConfirmCreateOpenChange}
        title="Approve this termination now?"
        description={`It is approved immediately, with no second reviewer. You then send the termination letter; completing it on or after the effective date ${COMPLETION_EFFECTS} Turn on "Save as draft" to keep it for review instead.`}
        confirmLabel="Create & Approve"
        destructive
        onConfirm={actions.performCreate}
        isPending={actions.createIsPending}
      />

      <ConfirmSheet
        open={actions.submitTerminationId !== null}
        onOpenChange={actions.handleSubmitConfirmClose}
        title="Submit for FINAL Approval"
        description="Are you sure you want to submit this termination record for FINAL approval? The record will move to PENDING_FINAL status."
        confirmLabel="Submit"
        onConfirm={actions.handleSubmitForApproval}
        isPending={actions.submitIsPending}
      />

      <TerminationDetailSheet
        open={actions.finalSheetOpen}
        onOpenChange={actions.handleFinalSheetOpenChange}
        reviewRecord={actions.reviewRecord}
        reviewDecision={actions.reviewDecision}
        finalRemarks={actions.finalRemarks}
        onFinalRemarksChange={actions.handleFinalRemarksChange}
        isPending={actions.finalReviewIsPending}
        onSubmit={actions.handleFinalReviewSubmit}
      />

      <TerminationDetailSheet
        open={actions.viewSheetOpen}
        onOpenChange={actions.handleViewSheetOpenChange}
        reviewRecord={actions.viewRecord}
        isViewOnly
      />

      <ConfirmSheet
        open={actions.emailRecord !== null}
        onOpenChange={actions.handleEmailRecordClose}
        title="Send Termination Email"
        description={`Send termination email to ${actions.emailRecord?.employee?.name ?? "this employee"}? The employee will be officially notified. If the effective date has arrived, sending it also completes the termination, which ${COMPLETION_EFFECTS}`}
        confirmLabel="Send Email"
        onConfirm={actions.handleSendEmailConfirm}
        isPending={actions.sendEmailIsPending}
      />

      <ConfirmSheet
        open={actions.completeTerminationId !== null}
        onOpenChange={actions.handleCompleteSheetOpenChange}
        title="Complete Termination"
        description={`Completing it ${COMPLETION_EFFECTS} Their sign-in to other organizations is not affected. This action cannot be undone.`}
        confirmLabel="Complete Termination"
        destructive
        onConfirm={actions.handleCompleteConfirm}
        isPending={actions.completeIsPending}
      />
    </PageWrapper>
  );
}
