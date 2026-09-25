"use client";

import { useCallback, useState } from "react";
import { toast } from "sonner";
import { EmptyState } from "@/components/ui/empty-state";
import { CONTENT_FILL_PANEL } from "@/components/ui/content-fill-panel";
import { CursorPageControls } from "@/components/ui/cursor-page-controls";
import { Skeleton } from "@/components/ui/skeleton";
import { PageState } from "@/components/shared/page-state";
import { usePageState } from "@/hooks/api/use-page-state";
import { BenefitPlanCard } from "@/features/hr/benefits/benefit-plan-card";
import { DependentsManager } from "@/features/hr/benefits/dependents-manager";
import { useBenefitPlans, useEnroll, useMyBenefits, useWaive } from "@/hooks/api/hr";
import { getErrorMessage } from "@/lib/get-error-message";

export function BenefitsMyTab() {
  const { data, isLoading, isError, error, refetch } = useMyBenefits();
  const pageState = usePageState({ permission: "hr:benefits:view", module: "hr", isLoading, isError, error });
  const [cursors, setCursors] = useState<(string | null)[]>([null]);
  const [cursorIndex, setCursorIndex] = useState(0);
  const { data: plansResult, isFetching } = useBenefitPlans({
    status: "active",
    cursor: cursors[cursorIndex] ?? undefined,
    limit: 20,
  });
  const enroll = useEnroll();
  const waive = useWaive();
  const enrolledPlanIds = new Set(
    data?.enrollments
      .filter((enrollment) => enrollment.status === "active")
      .map((enrollment) => enrollment.planId) ?? [],
  );

  const handleEnroll = useCallback((planId: number) => {
    toast.promise(enroll.mutateAsync({ planId }), {
      loading: "Enrolling...",
      success: "Enrolled successfully",
      error: (error: unknown) => getErrorMessage(error),
    });
  }, [enroll]);
  const handleWaive = useCallback((planId: number) => {
    toast.promise(waive.mutateAsync({ planId }), {
      loading: "Waiving...",
      success: "Enrollment waived",
      error: (error: unknown) => getErrorMessage(error),
    });
  }, [waive]);
  const handleRetry = useCallback(() => { void refetch(); }, [refetch]);

  function handlePreviousPage() {
    setCursorIndex((current) => Math.max(0, current - 1));
  }

  function handleNextPage() {
    const nextCursor = plansResult?.pagination.nextCursor;
    if (!nextCursor) return;
    setCursors((current) => [...current.slice(0, cursorIndex + 1), nextCursor]);
    setCursorIndex((current) => current + 1);
  }

  if (pageState.kind !== "ready") {
    return (
      <PageState
        resolution={pageState}
        loading={
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 8 }).map((_, index) => (
              <Skeleton key={index} className="h-40 rounded-xl" />
            ))}
          </div>
        }
        onRetry={handleRetry}
        className="flex-1"
      >
        {null}
      </PageState>
    );
  }

  const plans = plansResult?.data ?? [];
  return (
    <div className="space-y-4">
      {!plans.length ? (
        <EmptyState illustrationPreset="payroll" title="No active benefit plans" description="Your organisation has not configured any benefit plans yet." className={CONTENT_FILL_PANEL} />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {plans.map((plan) => (
            <BenefitPlanCard
              key={plan.id}
              plan={plan}
              enrolled={enrolledPlanIds.has(plan.id)}
              onEnroll={() => handleEnroll(plan.id)}
              onWaive={() => handleWaive(plan.id)}
              isPending={
                (enroll.isPending && enroll.variables?.planId === plan.id) ||
                (waive.isPending && waive.variables?.planId === plan.id)
              }
            />
          ))}
        </div>
      )}
      {cursorIndex > 0 || plansResult?.pagination.hasMore ? (
        <CursorPageControls page={cursorIndex + 1} hasNext={plansResult?.pagination.hasMore ?? false} disabled={isFetching} onPrevious={handlePreviousPage} onNext={handleNextPage} />
      ) : null}
      <DependentsManager />
    </div>
  );
}
