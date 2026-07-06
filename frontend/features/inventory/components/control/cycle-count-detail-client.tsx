"use client";

import { useCallback } from "react";
import {
  useCycleCount,
  useStartCycleCount,
  useUpdateCycleCountLines,
  useReviewCycleCount,
  usePostCycleCount,
  useCancelCycleCount,
} from "@/hooks/api/inventory/counts";
import { CountDetailShared } from "./count-detail-shared";

interface Props {
  countId: number;
}

export function CycleCountDetailClient({ countId }: Props) {
  const { data: count, isLoading, error, refetch } = useCycleCount(countId);
  const startMutation = useStartCycleCount();
  const updateLinesMutation = useUpdateCycleCountLines();
  const reviewMutation = useReviewCycleCount();
  const postMutation = usePostCycleCount();
  const cancelMutation = useCancelCycleCount();

  const handleSaveLine = useCallback(
    (lineId: number, countedQty: number) => {
      updateLinesMutation.mutate({ countId, lines: [{ lineId, countedQty }] });
    },
    [countId, updateLinesMutation],
  );

  function handleStart(): void {
    startMutation.mutate(countId);
  }

  function handleReview(): void {
    reviewMutation.mutate(countId);
  }

  function handlePost(): void {
    postMutation.mutate(countId);
  }

  function handleCancel(): void {
    cancelMutation.mutate(countId);
  }

  function handleRetry(): void {
    void refetch();
  }

  return (
    <CountDetailShared
      entityNoun="Cycle Count"
      backHref="/inventory/cycle-counts"
      entityNumber={count?.countNumber}
      status={count?.status}
      lines={count?.lines ?? []}
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
