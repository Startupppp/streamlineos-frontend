"use client";

import { useState, useCallback } from "react";
import { getErrorMessage } from "@/lib/get-error-message";
import {
  useResignations,
  useHrReviewResignation,
  useCeoReviewResignation,
  useWithdrawResignation,
  type Resignation,
} from "@/hooks/api/hr";
import { apiClient } from "@/lib/api-client";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Skeleton } from "@/components/ui/skeleton";
import { AnimatedIconButton } from "@/components/ui/animated-icon-button";
import { ConfirmSheet } from "@/components/ui/confirm-sheet";
import { EmptyState } from "@/components/ui/empty-state";
import { toast } from "sonner";
import { PlusIcon } from "@animateicons/react/lucide";
import { EmptyPersonIllustration } from "@/components/illustrations";
import { useSession } from "next-auth/react";
import { useCan } from "@/hooks/api/access";
import { ResignationCard } from "@/features/hr/exit/resignation-card";
import { ResignationFormSheet } from "@/features/hr/exit/resignation-form-sheet";
import { RejectRemarksSheet, type RejectDialogState } from "@/features/hr/exit/reject-remarks-sheet";

export default function ExitManagementPage() {
  const { data: session } = useSession();
  const { data: resignations, isLoading, isError, refetch } = useResignations();
  const handleRetry = useCallback(() => {
    void refetch();
  }, [refetch]);

  const hrReview = useHrReviewResignation();
  const ceoReview = useCeoReviewResignation();
  const withdrawResignation = useWithdrawResignation();

  const role = session?.user?.role;
  const userId = session?.user?.id;
  const isAdmin = useCan("hr:exit:manage");
  const isHR = role === "HR";
  const isCEO = useCan("hr:exit:approve");

  const [sheetOpen, setSheetOpen] = useState(false);
  const [hrApproveId, setHrApproveId] = useState<number | null>(null);
  const [ceoApproveId, setCeoApproveId] = useState<number | null>(null);
  const [rejectDialog, setRejectDialog] = useState<RejectDialogState | null>(null);
  const [rejectRemarksOpen, setRejectRemarksOpen] = useState(false);
  const [withdrawId, setWithdrawId] = useState<number | null>(null);
  const [expandedIds, setExpandedIds] = useState<Set<number>>(new Set());

  const hasActiveResignation =
    resignations?.some(
      (r: Resignation) =>
        r.userId === userId && ["SUBMITTED", "PENDING_HR", "HR_APPROVED"].includes(r.status ?? ""),
    ) ?? false;

  const toggleExpand = useCallback((id: number) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const handleViewLetter = useCallback(async (id: number) => {
    try {
      const data = await apiClient.get<{ html: string }>(`/hr/exit/${id}/letter`);
      const win = window.open("", "_blank");
      if (!win) {
        toast.error("Popup blocked — please allow popups to view the letter.");
        return;
      }
      win.document.write(
        `<!DOCTYPE html><html><head><title>Resignation Letter</title><style>body{margin:0;padding:20px 40px;}</style></head><body>${data.html}</body></html>`,
      );
      win.document.close();
    } catch {
      toast.error("Failed to load resignation letter");
    }
  }, []);

  const handleHrApprove = useCallback(() => {
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

  const handleCeoApprove = useCallback(() => {
    if (!ceoApproveId) return;
    ceoReview.mutate(
      { id: ceoApproveId, action: "approve" },
      {
        onSuccess: () => {
          toast.success("Resignation approved by CEO");
          setCeoApproveId(null);
        },
        onError: (e) => toast.error(getErrorMessage(e)),
      },
    );
  }, [ceoApproveId, ceoReview]);

  const handleOpenRejectDialog = useCallback((id: number, type: "hr" | "ceo") => {
    setRejectDialog({ id, type });
    setRejectRemarksOpen(true);
  }, []);

  const handleWithdraw = useCallback(() => {
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

  const handleOpenSheet = useCallback(() => setSheetOpen(true), []);

  const handleHrApproveClose = useCallback((open: boolean) => {
    if (!open) setHrApproveId(null);
  }, []);

  const handleCeoApproveClose = useCallback((open: boolean) => {
    if (!open) setCeoApproveId(null);
  }, []);

  const handleRejectRemarksOpenChange = useCallback(
    (open: boolean) => {
      if (!open) setRejectDialog(null);
      setRejectRemarksOpen(open);
    },
    [],
  );

  const handleWithdrawClose = useCallback((open: boolean) => {
    if (!open) setWithdrawId(null);
  }, []);

  const handleHrReject = useCallback(
    (id: number) => handleOpenRejectDialog(id, "hr"),
    [handleOpenRejectDialog],
  );

  const handleCeoReject = useCallback(
    (id: number) => handleOpenRejectDialog(id, "ceo"),
    [handleOpenRejectDialog],
  );

  if (isLoading) {
    return (
      <PageWrapper
        title="Exit Management"
        subtitle="Resignations and offboarding"
        variant="display"
      >
        <div className="flex flex-1 min-h-0 flex-col gap-3">
          {Array.from({ length: 10 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-2xl" />
          ))}
        </div>
      </PageWrapper>
    );
  }

  if (isError) {
    return (
      <PageWrapper
        title="Exit Management"
        subtitle="Resignations and offboarding"
        variant="display"
      >
        <EmptyState
          illustrationPreset="alert"
          title="Failed to load resignations"
          description="Something went wrong. Please try again."
          action={{ label: "Retry", onClick: handleRetry }}
        />
      </PageWrapper>
    );
  }

  return (
    <PageWrapper
      title="Exit Management"
      subtitle="Resignations, exit interviews, and offboarding"
      actions={
        !isCEO && !hasActiveResignation ? (
          <AnimatedIconButton
            icon={PlusIcon}
            iconSize={14}
            size="sm"
            className="gap-1.5"
            onClick={handleOpenSheet}
          >
            Submit Resignation
          </AnimatedIconButton>
        ) : hasActiveResignation ? (
          <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full border bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-300 dark:border-amber-800">
            Resignation pending
          </span>
        ) : null
      }
    >
      {!resignations?.length ? (
        <EmptyState
          illustration={<EmptyPersonIllustration className="h-24 w-24" />}
          title="No resignations on record"
          description={
            isCEO || isHR
              ? "Employee resignations will appear here once submitted."
              : "Submit a resignation to start the exit process."
          }
          compact
        />
      ) : (
        <div className="flex flex-1 min-h-0 flex-col gap-2">
          {resignations.map((r: Resignation) => (
            <ResignationCard
              key={r.id}
              resignation={r}
              isExpanded={expandedIds.has(r.id)}
              isAdmin={isAdmin}
              isHR={isHR}
              isCEO={isCEO}
              userId={userId}
              onToggleExpand={toggleExpand}
              onHrApprove={setHrApproveId}
              onHrReject={handleHrReject}
              onCeoApprove={setCeoApproveId}
              onCeoReject={handleCeoReject}
              onWithdraw={setWithdrawId}
              onViewLetter={handleViewLetter}
            />
          ))}
        </div>
      )}

      <ResignationFormSheet open={sheetOpen} onOpenChange={setSheetOpen} />

      <ConfirmSheet
        open={hrApproveId !== null}
        onOpenChange={handleHrApproveClose}
        title="Approve Resignation (HR)"
        description="Are you sure you want to approve this resignation? It will be forwarded to the CEO for final approval."
        confirmLabel="Approve"
        onConfirm={handleHrApprove}
        isPending={hrReview.isPending}
      />

      <ConfirmSheet
        open={ceoApproveId !== null}
        onOpenChange={handleCeoApproveClose}
        title="Approve Resignation (CEO)"
        description="Are you sure you want to give final approval for this resignation?"
        confirmLabel="Approve"
        onConfirm={handleCeoApprove}
        isPending={ceoReview.isPending}
      />

      <RejectRemarksSheet
        open={rejectRemarksOpen}
        rejectDialog={rejectDialog}
        onOpenChange={handleRejectRemarksOpenChange}
      />

      <ConfirmSheet
        open={withdrawId !== null}
        onOpenChange={handleWithdrawClose}
        title="Withdraw Resignation"
        description="Are you sure you want to withdraw your resignation? This action cannot be undone."
        confirmLabel="Withdraw"
        destructive
        onConfirm={handleWithdraw}
        isPending={withdrawResignation.isPending}
      />
    </PageWrapper>
  );
}
