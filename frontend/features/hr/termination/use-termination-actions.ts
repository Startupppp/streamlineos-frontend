"use client";

import { useState, useCallback } from "react";
import { toast } from "sonner";
import { isToday, isFuture, parseISO } from "date-fns";
import {
  useCreateTermination,
  useSubmitTermination,
  useCompleteTermination,
  useFinalReviewTermination,
  useSendTerminationEmail,
  type Termination,
} from "@/hooks/api/hr";
import type { Employee } from "@/types/hr";
import { getErrorMessage } from "@/lib/get-error-message";
import { TERMINATION_REASON_OTHER } from "@/lib/constants/hr-separation";

interface UseTerminationActionsOptions {
  terminations: Termination[];
  employees: Employee[];
  employeeUserIdParam: string | null;
}

export function useTerminationActions({
  terminations,
  employees,
  employeeUserIdParam,
}: UseTerminationActionsOptions) {
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
  const [reviewDecision, setReviewDecision] = useState<"approve" | "reject" | null>(null);
  const [finalRemarks, setFinalRemarks] = useState("");
  const [finalSheetOpen, setFinalSheetOpen] = useState(false);
  const [emailRecord, setEmailRecord] = useState<Termination | null>(null);
  const [completeTerminationId, setCompleteTerminationId] = useState<number | null>(null);
  const [viewRecord, setViewRecord] = useState<Termination | null>(null);
  const [viewSheetOpen, setViewSheetOpen] = useState(false);

  const isOtherReason = selectedReason === TERMINATION_REASON_OTHER;

  const canSubmitCreate =
    !!selectedEmployeeUserId &&
    !!selectedReason &&
    !!effectiveDate &&
    (!isOtherReason || remarks.trim().length >= 10);

  const resetCreateForm = useCallback(() => {
    setSelectedEmployeeUserId("");
    setSelectedReason("");
    setRemarks("");
    setEffectiveDate("");
    setNoticePeriodWaived(false);
    setSeveranceAmount("");
    setInternalNotes("");
  }, []);

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

  return {
    createOpen,
    handleCreateOpen,
    handleCreateSheetOpenChange,
    canSubmitCreate,
    handleCreateSubmit,
    createIsPending: createTermination.isPending,
    selectedEmployeeUserId,
    setSelectedEmployeeUserId,
    selectedReason,
    setSelectedReason,
    remarks,
    handleRemarksChange,
    effectiveDate,
    handleEffectiveDateChange,
    noticePeriodWaived,
    setNoticePeriodWaived,
    severanceAmount,
    handleSeveranceAmountChange,
    internalNotes,
    handleInternalNotesChange,
    submitTerminationId,
    handleSetSubmitTerminationId,
    handleSubmitForApproval,
    handleSubmitConfirmClose,
    submitIsPending: submitTermination.isPending,
    reviewRecord,
    reviewDecision,
    finalRemarks,
    finalSheetOpen,
    handleFinalSheetOpenChange,
    handleFinalRemarksChange,
    handleFinalReviewSubmit,
    finalReviewIsPending: finalReview.isPending,
    handleApprove,
    handleReject,
    viewRecord,
    viewSheetOpen,
    handleViewRecord,
    handleViewSheetOpenChange,
    emailRecord,
    handleSendEmailOpen,
    handleSendEmailConfirm,
    handleEmailRecordClose,
    sendEmailIsPending: sendEmail.isPending,
    completeTerminationId,
    handleSetCompleteTerminationId,
    handleCompleteConfirm,
    handleCompleteSheetOpenChange,
    completeIsPending: completeTermination.isPending,
  };
}
