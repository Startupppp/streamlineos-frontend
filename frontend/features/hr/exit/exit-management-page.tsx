"use client";

import { useState, useCallback } from "react";
import { getErrorMessage } from "@/lib/get-error-message";
import {
  useResignations,
  useHrReviewResignation,
  useFinalReviewResignation,
  useWithdrawResignation,
  type Resignation,
} from "@/hooks/api/hr";
import { apiClient } from "@/lib/api-client";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Skeleton } from "@/components/ui/skeleton";
import { AnimatedIconButton } from "@/components/ui/animated-icon-button";
import { ConfirmSheet } from "@/components/ui/confirm-sheet";
import { EmptyState } from "@/components/ui/empty-state";
import { TablePagination } from "@/components/ui/table-pagination";
import { toast } from "sonner";
import { PlusIcon } from "@animateicons/react/lucide";
import { EmptyPersonIllustration } from "@/components/illustrations";
import { useSession } from "next-auth/react";
import { useCan } from "@/hooks/api/access";
import { ResignationCard } from "@/features/hr/exit/resignation-card";
import { ResignationFormSheet } from "@/features/hr/exit/resignation-form-sheet";
import { RejectRemarksSheet, type RejectDialogState } from "@/features/hr/exit/reject-remarks-sheet";

export function ExitManagementPage() {
  const { data: session } = useSession();
  const [page, setPage] = useState(1);
  const { data: resignationData, isLoading, isError, refetch } = useResignations({ page, limit: 20 });
  const resignations = resignationData?.data;
  const pagination = resignationData?.pagination;
  const handleRetry = useCallback(() => {
    void refetch();
  }, [refetch]);

  const hrReview = useHrReviewResignation();
  const finalReview = useFinalReviewResignation();
  const withdrawResignation = useWithdrawResignation();

  const userId = session?.user?.id;
  const isAdmin = useCan("hr:exit:manage");
  const isHR = isAdmin;
  const canApproveExit = useCan("hr:exit:approve");

  const [sheetOpen, setSheetOpen] = useState(false);
  const [hrApproveId, setHrApproveId] = useState<number | null>(null);
  const [finalApproveId, setFinalApproveId] = useState<number | null>(null);
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

  const handleFinalApprove = useCallback(() => {
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

  const handleOpenRejectDialog = useCallback((id: number, type: "hr" | "final") => {
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

  function handlePageChange(nextPage: number) {
    setPage(nextPage);
  }

  const handleHrApproveClose = useCallback((open: boolean) => {
    if (!open) setHrApproveId(null);
  }, []);

  const handleFinalApproveClose = useCallback((open: boolean) => {
    if (!open) setFinalApproveId(null);
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

  const handleFinalReject = useCallback(
    (id: number) => handleOpenRejectDialog(id, "final"),
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
        !canApproveExit && !hasActiveResignation ? (
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
            canApproveExit || isHR
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
              canApproveExit={canApproveExit}
              userId={userId}
              onToggleExpand={toggleExpand}
              onHrApprove={setHrApproveId}
              onHrReject={handleHrReject}
              onFinalApprove={setFinalApproveId}
              onFinalReject={handleFinalReject}
              onWithdraw={setWithdrawId}
              onViewLetter={handleViewLetter}
            />
          ))}
          {pagination && pagination.totalPages > 1 && (
            <TablePagination
              page={page}
              pageSize={pagination.limit}
              total={pagination.total}
              onPageChange={handlePageChange}
            />
          )}
        </div>
      )}

      <ResignationFormSheet open={sheetOpen} onOpenChange={setSheetOpen} />

      <ConfirmSheet
        open={hrApproveId !== null}
        onOpenChange={handleHrApproveClose}
        title="Approve Resignation (HR)"
        description="Are you sure you want to approve this resignation? It will be forwarded to the FINAL for final approval."
        confirmLabel="Approve"
        onConfirm={handleHrApprove}
        isPending={hrReview.isPending}
      />

      <ConfirmSheet
        open={finalApproveId !== null}
        onOpenChange={handleFinalApproveClose}
        title="Approve Resignation (FINAL)"
        description="Are you sure you want to give final approval for this resignation?"
        confirmLabel="Approve"
        onConfirm={handleFinalApprove}
        isPending={finalReview.isPending}
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
