"use client";

import { useState, useCallback, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { useCan } from "@/hooks/api/access";
import { isToday, isFuture, parseISO } from "date-fns";
import { toast } from "sonner";
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
  useCreateTermination,
  useSubmitTermination,
  useCompleteTermination,
  useFinalReviewTermination,
  useSendTerminationEmail,
  useHrEmployees,
  type Termination,
  type TerminationStatus,
} from "@/hooks/api/hr";
import type { Employee } from "@/types/hr";
import { getErrorMessage } from "@/lib/get-error-message";
import { TERMINATION_REASON_OTHER } from "@/lib/constants/hr-separation";

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
  const createTermination = useCreateTermination();
  const submitTermination = useSubmitTermination();
  const finalReview = useFinalReviewTermination();
  const sendEmail = useSendTerminationEmail();
  const completeTermination = useCompleteTermination();
  const [createOpen, setCreateOpen] = useState(() => Boolean(employeeUserIdParam));
  const [selectedEmployeeUserId, setSelectedEmployeeUserId] = useState(
    () => employeeUserIdParam ?? "",
  );
  const [selectedReason, setSelectedReason] = useState("");
  const [remarks, setRemarks] = useState("");
  const [effectiveDate, setEffectiveDate] = useState("");
  const [noticePeriodWaived, setNoticePeriodWaived] = useState(false);
  const [severanceAmount, setSeveranceAmount] = useState("");
  const [internalNotes, setInternalNotes] = useState("");
  const [submitTerminationId, setSubmitTerminationId] = useState<number | null>(null);
  const [reviewRecord, setReviewRecord] = useState<Termination | null>(null);
  const [reviewDecision, setReviewDecision] = useState<
    "approve" | "reject" | null
  >(null);
  const [finalRemarks, setFinalRemarks] = useState("");
  const [finalSheetOpen, setFinalSheetOpen] = useState(false);
  const [emailRecord, setEmailRecord] = useState<Termination | null>(null);
  const [completeTerminationId, setCompleteTerminationId] = useState<number | null>(null);
  const [viewRecord, setViewRecord] = useState<Termination | null>(null);
  const [viewSheetOpen, setViewSheetOpen] = useState(false);

  const employees = useMemo<Employee[]>(() => {
    if (!employeesData) return [];
    if (Array.isArray(employeesData)) return employeesData as Employee[];
    const paged = employeesData as { items?: Employee[]; data?: Employee[] };
    return paged.items ?? paged.data ?? [];
  }, [employeesData]);

  const resetCreateForm = useCallback(() => {
    setSelectedEmployeeUserId("");
    setSelectedReason("");
    setRemarks("");
    setEffectiveDate("");
    setNoticePeriodWaived(false);
    setSeveranceAmount("");
    setInternalNotes("");
  }, []);

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

  const isOtherReason = selectedReason === TERMINATION_REASON_OTHER;

  const canSubmitCreate =
    !!selectedEmployeeUserId &&
    !!selectedReason &&
    !!effectiveDate &&
    (!isOtherReason || remarks.trim().length >= 10);

  const handleCreateSubmit = useCallback(() => {
    if (!selectedEmployeeUserId) {
      toast.error("Please select an employee");
      return;
    }

    const targetEmployee = employees.find(
      (employee) => employee.id === selectedEmployeeUserId,
    );
    if (targetEmployee && !targetEmployee.isActive) {
      toast.error("This employee has already been terminated or is inactive");
      return;
    }

    if (!selectedReason) {
      toast.error("Please select a termination reason");
      return;
    }

    if (isOtherReason && remarks.trim().length < 10) {
      toast.error("Remarks for 'Other' reason must be at least 10 characters");
      return;
    }

    if (!effectiveDate) {
      toast.error("Please set an effective date");
      return;
    }

    const parsedDate = parseISO(effectiveDate);
    if (!isToday(parsedDate) && !isFuture(parsedDate)) {
      toast.error("Effective date must be today or a future date");
      return;
    }

    if (severanceAmount) {
      const numSeverance = Number(severanceAmount);
      if (isNaN(numSeverance) || numSeverance < 0) {
        toast.error("Severance amount must be a non-negative number");
        return;
      }
      if (numSeverance > 9999999) {
        toast.error("Severance amount cannot exceed INR 99,99,999");
        return;
      }
    }
    if (internalNotes.trim().length > 1000) {
      toast.error("Internal notes must be at most 1000 characters");
      return;
    }

    createTermination.mutate(
      {
        employeeUserId: selectedEmployeeUserId,
        reasons: [selectedReason],
        detailedExplanation: remarks.trim(),
        effectiveDate,
        severanceAmount: severanceAmount ? Number(severanceAmount) : undefined,
        noticePeriodWaived,
        internalNotes: internalNotes.trim() || undefined,
      },
      {
        onSuccess: () => {
          toast.success("Termination saved as draft");
          setCreateOpen(false);
          resetCreateForm();
        },
        onError: (mutationError) => toast.error(getErrorMessage(mutationError)),
      },
    );
  }, [
    selectedEmployeeUserId,
    employees,
    selectedReason,
    isOtherReason,
    remarks,
    effectiveDate,
    severanceAmount,
    noticePeriodWaived,
    internalNotes,
    createTermination,
    resetCreateForm,
  ]);

  const handleSubmitForApproval = useCallback(() => {
    if (!submitTerminationId) return;
    submitTermination.mutate(submitTerminationId, {
      onSuccess: () => {
        toast.success("Submitted for FINAL approval");
        setSubmitTerminationId(null);
      },
      onError: (mutationError) => toast.error(getErrorMessage(mutationError)),
    });
  }, [submitTerminationId, submitTermination]);

  const handleOpenFinalReview = useCallback(
    (record: Termination, decision: "approve" | "reject") => {
      setReviewRecord(record);
      setReviewDecision(decision);
      setFinalRemarks("");
      setFinalSheetOpen(true);
    },
    [],
  );

  const handleFinalReviewSubmit = useCallback(() => {
    if (!reviewRecord || !reviewDecision) return;
    finalReview.mutate(
      {
        terminationId: reviewRecord.id,
        decision: reviewDecision,
        remarks: finalRemarks.trim() || undefined,
      },
      {
        onSuccess: () => {
          toast.success(
            reviewDecision === "approve"
              ? "Termination approved"
              : "Termination rejected",
          );
          setFinalSheetOpen(false);
          setReviewRecord(null);
          setReviewDecision(null);
          setFinalRemarks("");
        },
        onError: (mutationError) => toast.error(getErrorMessage(mutationError)),
      },
    );
  }, [reviewRecord, reviewDecision, finalRemarks, finalReview]);

  const handleSendEmailOpen = useCallback((record: Termination) => {
    if (record.emailSentAt) {
      toast.error("Termination email has already been sent");
      return;
    }
    setEmailRecord(record);
  }, []);

  const handleSendEmailConfirm = useCallback(() => {
    if (!emailRecord) return;
    sendEmail.mutate(emailRecord.id, {
      onSuccess: () => {
        toast.success("Termination email sent successfully");
        setEmailRecord(null);
      },
      onError: (mutationError) => {
        toast.error(`Failed to send email: ${getErrorMessage(mutationError)}`);
        setEmailRecord(null);
      },
    });
  }, [emailRecord, sendEmail]);

  const handleCompleteConfirm = useCallback(() => {
    if (!completeTerminationId) return;
    completeTermination.mutate(completeTerminationId, {
      onSuccess: () => {
        toast.success(
          "Termination completed. Employee deactivated, FnF and asset return initiated.",
        );
        setCompleteTerminationId(null);
      },
      onError: (mutationError) => toast.error(getErrorMessage(mutationError)),
    });
  }, [completeTerminationId, completeTermination]);

  const handleApprove = useCallback(
    (terminationId: number) => {
      const terminationRecord = terminations.find(
        (termination) => termination.id === terminationId,
      );
      if (terminationRecord) handleOpenFinalReview(terminationRecord, "approve");
    },
    [terminations, handleOpenFinalReview],
  );

  const handleReject = useCallback(
    (terminationId: number) => {
      const terminationRecord = terminations.find(
        (termination) => termination.id === terminationId,
      );
      if (terminationRecord) handleOpenFinalReview(terminationRecord, "reject");
    },
    [terminations, handleOpenFinalReview],
  );

  const handleViewRecord = useCallback((record: Termination) => {
    setViewRecord(record);
    setViewSheetOpen(true);
  }, []);

  const handleViewSheetOpenChange = useCallback((open: boolean) => {
    setViewSheetOpen(open);
    if (!open) setViewRecord(null);
  }, []);

  const handleCreateOpen = useCallback(() => setCreateOpen(true), []);

  const handleCreateSheetOpenChange = useCallback(
    (open: boolean) => {
      setCreateOpen(open);
      if (!open) resetCreateForm();
    },
    [resetCreateForm],
  );

  const handleFinalSheetOpenChange = useCallback((open: boolean) => {
    setFinalSheetOpen(open);
    if (!open) {
      setReviewRecord(null);
      setReviewDecision(null);
      setFinalRemarks("");
    }
  }, []);

  const handleSetSubmitTerminationId = useCallback(
    (terminationId: number) => setSubmitTerminationId(terminationId),
    [],
  );
  const handleSetCompleteTerminationId = useCallback(
    (terminationId: number) => setCompleteTerminationId(terminationId),
    [],
  );
  const handleRemarksChange = useCallback(
    (inputEvent: React.ChangeEvent<HTMLTextAreaElement>) =>
      setRemarks(inputEvent.target.value),
    [],
  );
  const handleEffectiveDateChange = useCallback(
    (value: string) => setEffectiveDate(value),
    [],
  );
  const handleSeveranceAmountChange = useCallback(
    (inputEvent: React.ChangeEvent<HTMLInputElement>) =>
      setSeveranceAmount(inputEvent.target.value),
    [],
  );
  const handleInternalNotesChange = useCallback(
    (inputEvent: React.ChangeEvent<HTMLTextAreaElement>) =>
      setInternalNotes(inputEvent.target.value),
    [],
  );
  const handleFinalRemarksChange = useCallback(
    (inputEvent: React.ChangeEvent<HTMLTextAreaElement>) =>
      setFinalRemarks(inputEvent.target.value),
    [],
  );
  const handleSubmitConfirmClose = useCallback((open: boolean) => {
    if (!open) setSubmitTerminationId(null);
  }, []);
  const handleEmailRecordClose = useCallback((open: boolean) => {
    if (!open) setEmailRecord(null);
  }, []);
  const handleCompleteSheetOpenChange = useCallback((open: boolean) => {
    if (!open) setCompleteTerminationId(null);
  }, []);

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
          <Button size="sm" onClick={handleCreateOpen} className="gap-1.5">
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
        onView={handleViewRecord}
        onSubmit={handleSetSubmitTerminationId}
        onApprove={handleApprove}
        onReject={handleReject}
        onSendEmail={handleSendEmailOpen}
        onComplete={handleSetCompleteTerminationId}
        isSubmitting={submitTermination.isPending}
        isCompleting={completeTermination.isPending}
      />

      <TerminationFormSheet
        open={createOpen}
        onOpenChange={handleCreateSheetOpenChange}
        canApproveExit={canApproveExit}
        isPending={createTermination.isPending}
        submitDisabled={!canSubmitCreate}
        onSubmit={handleCreateSubmit}
        employees={employees}
        selectedEmployeeUserId={selectedEmployeeUserId}
        onSelectedEmployeeUserIdChange={setSelectedEmployeeUserId}
        selectedReason={selectedReason}
        onSelectedReasonChange={setSelectedReason}
        remarks={remarks}
        onRemarksChange={handleRemarksChange}
        effectiveDate={effectiveDate}
        onEffectiveDateChange={handleEffectiveDateChange}
        noticePeriodWaived={noticePeriodWaived}
        onNoticePeriodWaivedChange={setNoticePeriodWaived}
        severanceAmount={severanceAmount}
        onSeveranceAmountChange={handleSeveranceAmountChange}
        internalNotes={internalNotes}
        onInternalNotesChange={handleInternalNotesChange}
      />

      <ConfirmSheet
        open={submitTerminationId !== null}
        onOpenChange={handleSubmitConfirmClose}
        title="Submit for FINAL Approval"
        description="Are you sure you want to submit this termination record for FINAL approval? The record will move to PENDING_FINAL status."
        confirmLabel="Submit"
        onConfirm={handleSubmitForApproval}
        isPending={submitTermination.isPending}
      />

      <TerminationDetailSheet
        open={finalSheetOpen}
        onOpenChange={handleFinalSheetOpenChange}
        reviewRecord={reviewRecord}
        reviewDecision={reviewDecision}
        finalRemarks={finalRemarks}
        onFinalRemarksChange={handleFinalRemarksChange}
        isPending={finalReview.isPending}
        onSubmit={handleFinalReviewSubmit}
      />

      <TerminationDetailSheet
        open={viewSheetOpen}
        onOpenChange={handleViewSheetOpenChange}
        reviewRecord={viewRecord}
        isViewOnly
      />

      <ConfirmSheet
        open={emailRecord !== null}
        onOpenChange={handleEmailRecordClose}
        title="Send Termination Email"
        description={`Send termination email to ${emailRecord?.employee?.name ?? "this employee"}? The employee will be officially notified. Account deactivation will happen when you mark the termination as Complete.`}
        confirmLabel="Send Email"
        onConfirm={handleSendEmailConfirm}
        isPending={sendEmail.isPending}
      />

      <ConfirmSheet
        open={completeTerminationId !== null}
        onOpenChange={handleCompleteSheetOpenChange}
        title="Complete Termination"
        description="This will deactivate the employee's account, initiate Full & Final settlement, and create asset return records. This action cannot be undone."
        confirmLabel="Complete Termination"
        destructive
        onConfirm={handleCompleteConfirm}
        isPending={completeTermination.isPending}
      />
    </PageWrapper>
  );
}
