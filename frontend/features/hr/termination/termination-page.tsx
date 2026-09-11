"use client";

import { useState, useCallback, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { useCan } from "@/hooks/api/access";
import { Plus } from "lucide-react";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/shared/error-state";
import { ConfirmSheet } from "@/components/ui/confirm-sheet";
import { TerminationList } from "./termination-list";
import { TerminationFormSheet } from "./termination-form-sheet";
import { TerminationDetailSheet } from "./termination-detail-sheet";
import {
  useTerminations,
  useHrEmployees,
  type TerminationStatus,
} from "@/hooks/api/hr";
import type { EmployeeListItem } from "@/types/hr";
import { useTerminationActions } from "./use-termination-actions";

type StatusFilter = "ALL" | TerminationStatus;

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
    refetch,
  } = useTerminations({
    cursor,
    status: statusFilter === "ALL" ? undefined : statusFilter,
  });
  const terminations = useMemo(() => terminationsData?.data ?? [], [terminationsData]);
  const { data: employeesData } = useHrEmployees({ limit: 100 });

  const employees = useMemo(() => employeesData?.data ?? [], [employeesData]);

  const actions = useTerminationActions({ terminations, employees, employeeUserIdParam });

  const handleRetry = useCallback(() => {
    void refetch();
  }, [refetch]);

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

  if (isLoading || isError) {
    return (
      <PageWrapper
        title="Termination Management"
        subtitle="Manage employee terminations"
      >
        {isLoading ? (
          <div className="flex min-h-0 flex-1 flex-col gap-3">
            {Array.from({ length: 10 }).map((_, skeletonIndex) => (
              <Skeleton key={skeletonIndex} className="h-20 rounded-2xl" />
            ))}
          </div>
        ) : (
          <ErrorState
            title="Failed to load terminations"
            description="Something went wrong. Please try again."
            onRetry={handleRetry}
          />
        )}
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
        description={`Send termination email to ${actions.emailRecord?.employee?.name ?? "this employee"}? The employee will be officially notified. Account deactivation will happen when you mark the termination as Complete.`}
        confirmLabel="Send Email"
        onConfirm={actions.handleSendEmailConfirm}
        isPending={actions.sendEmailIsPending}
      />

      <ConfirmSheet
        open={actions.completeTerminationId !== null}
        onOpenChange={actions.handleCompleteSheetOpenChange}
        title="Complete Termination"
        description="This will deactivate the employee's account, initiate Full & Final settlement, and create asset return records. This action cannot be undone."
        confirmLabel="Complete Termination"
        destructive
        onConfirm={actions.handleCompleteConfirm}
        isPending={actions.completeIsPending}
      />
    </PageWrapper>
  );
}
