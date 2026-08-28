"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import {
  useJobRequisitions,
  useSubmitRequisition,
  useApproveRequisition,
  useRejectRequisition,
  useCreateJobFromRequisition,
} from "@/hooks/api/hr/requisitions";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Button } from "@/components/ui/button";
import { ConfirmWithReasonSheet } from "@/components/ui/confirm-with-reason-sheet";
import { getErrorMessage } from "@/lib/get-error-message";
import { Plus } from "lucide-react";
import { ErrorState } from "@/components/shared/error-state";
import { EmptyApprovalIllustration } from "@/components/illustrations";
import { RecruitmentEmptyState } from "@/features/hr/recruitment/components/recruitment-empty-state";
import { CONTENT_FILL_PANEL, FILTER_TOOLBAR_ROW } from "@/components/ui/content-fill-panel";
import {
  RequisitionCard,
  RequisitionCardSkeleton,
  StatusTabButton,
  STATUS_STYLES,
  STATUS_TABS,
} from "@/features/hr/recruitment/requisitions/requisition-card";
import { RequisitionFormSheet } from "@/features/hr/recruitment/requisitions/requisition-form-sheet";
import { useCan } from "@/hooks/api/access";

export default function RequisitionsPage() {
  const canManage = useCan("hr:requisitions:manage");
  const router = useRouter();
  const [activeStatus, setActiveStatus] = useState<string | undefined>(undefined);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [rejectTarget, setRejectTarget] = useState<number | null>(null);

  const { data: requisitions, isLoading, isError, refetch } = useJobRequisitions(activeStatus);
  const submitRequisition = useSubmitRequisition();
  const approveRequisition = useApproveRequisition();
  const rejectRequisition = useRejectRequisition();
  const createJobFromRequisition = useCreateJobFromRequisition();

  const handleOpenSheet = useCallback(() => setSheetOpen(true), []);
  const handleCloseSheet = useCallback(() => setSheetOpen(false), []);

  const handleSubmit = useCallback(
    (id: number) => {
      submitRequisition.mutate(id, {
        onSuccess: () => toast.success("Requisition submitted for approval"),
        onError: (e) => toast.error(getErrorMessage(e)),
      });
    },
    [submitRequisition],
  );

  const handleApprove = useCallback(
    (id: number) => {
      approveRequisition.mutate(id, {
        onSuccess: () => toast.success("Requisition approved"),
        onError: (e) => toast.error(getErrorMessage(e)),
      });
    },
    [approveRequisition],
  );

  const handleConvertToJob = useCallback(
    (id: number) => {
      createJobFromRequisition.mutate(id, {
        onSuccess: (data) => {
          toast.success(`Job posting "${data.jobTitle}" created`);
          router.push(`/hr/recruitment/jobs/${data.jobId}/edit`);
        },
        onError: (e) => toast.error(getErrorMessage(e)),
      });
    },
    [createJobFromRequisition, router],
  );

  const handleRejectOpen = useCallback((id: number) => setRejectTarget(id), []);
  const handleRejectClose = useCallback(() => setRejectTarget(null), []);

  const handleRejectConfirm = useCallback(
    (reason: string) => {
      if (!rejectTarget) return;
      rejectRequisition.mutate(
        { id: rejectTarget, reason },
        {
          onSuccess: () => {
            toast.success("Requisition rejected");
            setRejectTarget(null);
          },
          onError: (e) => toast.error(getErrorMessage(e)),
        },
      );
    },
    [rejectTarget, rejectRequisition],
  );

  const isEmpty = !isLoading && !isError && (!requisitions || requisitions.length === 0);

  function handleRetry() {
    void refetch();
  }

  function handleRejectOpenChange(open: boolean) {
    if (!open) handleRejectClose();
  }

  return (
    <>
      <PageWrapper
        title="Job Requisitions"
        subtitle="Manage headcount requests and approvals"
        actions={
          canManage ? (
            <Button size="sm" onClick={handleOpenSheet}>
              <Plus className="mr-1.5 h-4 w-4" /> New Requisition
            </Button>
          ) : undefined
        }
        filters={
          <div className={FILTER_TOOLBAR_ROW}>
            {STATUS_TABS.map((tab) => (
              <StatusTabButton
                key={tab.label}
                label={tab.label}
                value={tab.value}
                activeStatus={activeStatus}
                onSelect={setActiveStatus}
              />
            ))}
          </div>
        }
      >
        <div className="flex flex-1 min-h-0 flex-col">
          {isLoading ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 12 }).map((_, i) => (
                <RequisitionCardSkeleton key={i} />
              ))}
            </div>
          ) : isError ? (
            <ErrorState className="flex-1" title="Failed to load requisitions" onRetry={handleRetry} />
          ) : isEmpty ? (
            <RecruitmentEmptyState
              illustration={<EmptyApprovalIllustration />}
              title={
                activeStatus
                  ? `No ${STATUS_STYLES[activeStatus]?.label ?? activeStatus} requisitions`
                  : "No requisitions yet"
              }
              description={
                activeStatus
                  ? "Try another status filter or create a new requisition."
                  : "Create your first headcount request to get started."
              }
              action={
                canManage
                  ? { label: "New Requisition", onClick: handleOpenSheet }
                  : undefined
              }
              className={CONTENT_FILL_PANEL}
            />
          ) : (
            <AnimatePresence mode="popLayout">
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {requisitions?.map((req) => (
                  <RequisitionCard
                    key={req.id}
                    req={req}
                    onSubmit={handleSubmit}
                    onApprove={handleApprove}
                    onReject={handleRejectOpen}
                    onConvertToJob={handleConvertToJob}
                    isSubmitting={submitRequisition.isPending}
                    isApproving={approveRequisition.isPending}
                    isConverting={createJobFromRequisition.isPending}
                    canManage={canManage}
                  />
                ))}
              </div>
            </AnimatePresence>
          )}
        </div>
      </PageWrapper>

      {canManage && (
        <RequisitionFormSheet open={sheetOpen} onClose={handleCloseSheet} />
      )}

      {canManage && (
        <ConfirmWithReasonSheet
          open={rejectTarget !== null}
          onOpenChange={handleRejectOpenChange}
          title="Reject Requisition"
          description="Provide a reason for rejecting this requisition."
          reasonLabel="Rejection reason"
          reasonPlaceholder="Rejection reason..."
          reasonRequired
          confirmLabel="Reject"
          onConfirm={handleRejectConfirm}
          isPending={rejectRequisition.isPending}
        />
      )}
    </>
  );
}
