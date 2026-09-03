"use client";

import { useCallback, useState } from "react";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/get-error-message";
import {
  useFinalReviewResignation,
  useHrReviewResignation,
  useWithdrawResignation,
} from "@/hooks/api/hr";
import type { RejectDialogState } from "@/features/hr/exit/reject-remarks-sheet";

export interface ResignationReview {
  hrApproveId: number | null;
  finalApproveId: number | null;
  rejectDialog: RejectDialogState | null;
  rejectRemarksOpen: boolean;
  withdrawId: number | null;
  isHrPending: boolean;
  isFinalPending: boolean;
  isWithdrawPending: boolean;
  requestHrApprove: (id: number) => void;
  requestFinalApprove: (id: number) => void;
  requestHrReject: (id: number) => void;
  requestFinalReject: (id: number) => void;
  requestWithdraw: (id: number) => void;
  confirmHrApprove: () => void;
  confirmFinalApprove: () => void;
  confirmWithdraw: () => void;
  setHrApproveOpen: (open: boolean) => void;
  setFinalApproveOpen: (open: boolean) => void;
  setRejectRemarksOpen: (open: boolean) => void;
  setWithdrawOpen: (open: boolean) => void;
}

/**
 * The resignation approval chain — HR review, final review and withdrawal —
 * with the confirmation state each step needs. The list page owns none of it:
 * it renders cards and passes the `request*` callbacks down.
 */
export function useResignationReview(): ResignationReview {
  const hrReview = useHrReviewResignation();
  const finalReview = useFinalReviewResignation();
  const withdrawResignation = useWithdrawResignation();

  const [hrApproveId, setHrApproveId] = useState<number | null>(null);
  const [finalApproveId, setFinalApproveId] = useState<number | null>(null);
  const [rejectDialog, setRejectDialog] = useState<RejectDialogState | null>(null);
  const [rejectRemarksOpen, setRejectRemarksOpenState] = useState(false);
  const [withdrawId, setWithdrawId] = useState<number | null>(null);

  const openReject = useCallback((id: number, type: "hr" | "final") => {
    setRejectDialog({ id, type });
    setRejectRemarksOpenState(true);
  }, []);

  const requestHrReject = useCallback((id: number) => openReject(id, "hr"), [openReject]);
  const requestFinalReject = useCallback((id: number) => openReject(id, "final"), [openReject]);

  const confirmHrApprove = useCallback(() => {
    if (!hrApproveId) return;
    hrReview.mutate(
      { id: hrApproveId, action: "approve" },
      {
        onSuccess: () => {
          toast.success("Resignation approved by HR");
          setHrApproveId(null);
        },
        onError: (e) => toast.error(getErrorMessage(e)),
      },
    );
  }, [hrApproveId, hrReview]);

  const confirmFinalApprove = useCallback(() => {
    if (!finalApproveId) return;
    finalReview.mutate(
      { id: finalApproveId, action: "approve" },
      {
        onSuccess: () => {
          toast.success("Resignation approved by FINAL");
          setFinalApproveId(null);
        },
        onError: (e) => toast.error(getErrorMessage(e)),
      },
    );
  }, [finalApproveId, finalReview]);

  const confirmWithdraw = useCallback(() => {
    if (!withdrawId) return;
    withdrawResignation.mutate(
      { id: withdrawId },
      {
        onSuccess: () => {
          toast.success("Resignation withdrawn");
          setWithdrawId(null);
        },
        onError: (e) => toast.error(getErrorMessage(e)),
      },
    );
  }, [withdrawId, withdrawResignation]);

  const setHrApproveOpen = useCallback((open: boolean) => {
    if (!open) setHrApproveId(null);
  }, []);

  const setFinalApproveOpen = useCallback((open: boolean) => {
    if (!open) setFinalApproveId(null);
  }, []);

  const setRejectRemarksOpen = useCallback((open: boolean) => {
    if (!open) setRejectDialog(null);
    setRejectRemarksOpenState(open);
  }, []);

  const setWithdrawOpen = useCallback((open: boolean) => {
    if (!open) setWithdrawId(null);
  }, []);

  return {
    hrApproveId,
    finalApproveId,
    rejectDialog,
    rejectRemarksOpen,
    withdrawId,
    isHrPending: hrReview.isPending,
    isFinalPending: finalReview.isPending,
    isWithdrawPending: withdrawResignation.isPending,
    requestHrApprove: setHrApproveId,
    requestFinalApprove: setFinalApproveId,
    requestHrReject,
    requestFinalReject,
    requestWithdraw: setWithdrawId,
    confirmHrApprove,
    confirmFinalApprove,
    confirmWithdraw,
    setHrApproveOpen,
    setFinalApproveOpen,
    setRejectRemarksOpen,
    setWithdrawOpen,
  };
}
