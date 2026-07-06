"use client";

import { useCallback } from "react";
import {
  usePhysicalAudit,
  useStartPhysicalAudit,
  useUpdatePhysicalAuditLines,
  useReviewPhysicalAudit,
  usePostPhysicalAudit,
  useCancelPhysicalAudit,
} from "@/hooks/api/inventory/counts";
import { CountDetailShared } from "./count-detail-shared";

interface Props {
  auditId: number;
}

export function PhysicalAuditDetailClient({ auditId }: Props) {
  const { data: audit, isLoading, error, refetch } = usePhysicalAudit(auditId);
  const startMutation = useStartPhysicalAudit();
  const updateLinesMutation = useUpdatePhysicalAuditLines();
  const reviewMutation = useReviewPhysicalAudit();
  const postMutation = usePostPhysicalAudit();
  const cancelMutation = useCancelPhysicalAudit();

  const handleSaveLine = useCallback(
    (lineId: number, countedQty: number) => {
      updateLinesMutation.mutate({ auditId, lines: [{ lineId, countedQty }] });
    },
    [auditId, updateLinesMutation],
  );

  function handleStart(): void {
    startMutation.mutate(auditId);
  }

  function handleReview(): void {
    reviewMutation.mutate(auditId);
  }

  function handlePost(): void {
    postMutation.mutate(auditId);
  }

  function handleCancel(): void {
    cancelMutation.mutate(auditId);
  }

  function handleRetry(): void {
    void refetch();
  }

  return (
    <CountDetailShared
      entityNoun="Physical Audit"
      backHref="/inventory/physical-audits"
      entityNumber={audit?.auditNumber}
      status={audit?.status}
      lines={audit?.lines ?? []}
      isLoading={isLoading}
      error={error}
      onStart={handleStart}
      onReview={handleReview}
      onPost={handlePost}
      onCancel={handleCancel}
      onRetry={handleRetry}
      onSaveLine={handleSaveLine}
      startPending={startMutation.isPending}
      reviewPending={reviewMutation.isPending}
      postPending={postMutation.isPending}
      cancelPending={cancelMutation.isPending}
    />
  );
}
