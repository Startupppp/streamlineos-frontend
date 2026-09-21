"use client";

import { useState, useCallback } from "react";
import { useResignations, type Resignation } from "@/hooks/api/hr";
import { apiClient } from "@/lib/api-client";
import { lazyContract } from "@/lib/api-envelope";
import { PageWrapper } from "@/components/ui/page-wrapper";

const exitLetterContract = lazyContract(() =>
  import("@/features/hr/exit/exit-management-schema").then((m) => m.exitLetterContract),
);
import { Skeleton } from "@/components/ui/skeleton";
import { AnimatedIconButton } from "@/components/ui/animated-icon-button";
import { EmptyState } from "@/components/ui/empty-state";
import { PageState } from "@/components/shared/page-state";
import { usePageState } from "@/hooks/api/use-page-state";
import { TablePagination, useCursorPager } from "@/components/ui/table-pagination";
import { toast } from "sonner";
import { PlusIcon } from "@animateicons/react/lucide";
import { EmptyPersonIllustration } from "@/components/illustrations";
import { useSession } from "next-auth/react";
import { useCan } from "@/hooks/api/access";
import { ResignationCard } from "@/features/hr/exit/resignation-card";
import { ResignationFormSheet } from "@/features/hr/exit/resignation-form-sheet";
import { ResignationReviewSheets } from "@/features/hr/exit/resignation-review-sheets";
import { useResignationReview } from "@/features/hr/exit/use-resignation-review";

const ACTIVE_RESIGNATION_STATUSES = ["SUBMITTED", "PENDING_HR", "HR_APPROVED"];

export function ExitManagementPage() {
  const { data: session } = useSession();
  const pager = useCursorPager();
  const { data: resignationData, isLoading, isError, error, refetch } = useResignations({ cursor: pager.cursor, limit: 20 });
  const resignations = resignationData?.data;
  const pagination = resignationData?.pagination;
  const handleRetry = useCallback(() => {
    void refetch();
  }, [refetch]);
  const pageState = usePageState({ permission: "hr:exit:view", isLoading, isError, error });

  const review = useResignationReview();

  const userId = session?.user?.id;
  const isAdmin = useCan("hr:exit:manage");
  const isHR = isAdmin;
  const canApproveExit = useCan("hr:exit:approve");

  const [sheetOpen, setSheetOpen] = useState(false);
  const [expandedIds, setExpandedIds] = useState<Set<number>>(new Set());

  const hasActiveResignation =
    resignations?.some(
      (r: Resignation) =>
        r.userId === userId && ACTIVE_RESIGNATION_STATUSES.includes(r.status ?? ""),
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
      const [{ sanitizeHtml }, data] = await Promise.all([
        import("@/lib/sanitize-html"),
        apiClient.get(`/hr/exit/${id}/letter`, undefined, undefined, exitLetterContract),
      ]);
      const win = window.open("", "_blank");
      if (!win) {
        toast.error("Popup blocked — please allow popups to view the letter.");
        return;
      }
      win.document.write(
        `<!DOCTYPE html><html><head><title>Resignation Letter</title><style>body{margin:0;padding:20px 40px;}</style></head><body>${sanitizeHtml(data.html)}</body></html>`,
      );
      win.document.close();
    } catch {
      toast.error("Failed to load resignation letter");
    }
  }, []);

  const handleOpenSheet = useCallback(() => setSheetOpen(true), []);

  function handleNextPage() {
    pager.goNext(pagination?.nextCursor);
  }

  if (pageState.kind === "loading") {
    return (
      <PageWrapper
        title="Exit Management"
        subtitle="Resignations, exit interviews, and offboarding"
      >
        <div className="flex flex-1 min-h-0 flex-col gap-3">
          {Array.from({ length: 10 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-2xl" />
          ))}
        </div>
      </PageWrapper>
    );
  }

  if (pageState.kind !== "ready" && pageState.kind !== "empty") {
    return (
      <PageWrapper
        title="Exit Management"
        subtitle="Resignations, exit interviews, and offboarding"
      >
        <PageState resolution={pageState} loading={null} onRetry={handleRetry} className="flex-1">
          {null}
        </PageState>
      </PageWrapper>
    );
  }

  return (
    <PageWrapper
      title="Exit Management"
      subtitle="Resignations, exit interviews, and offboarding"
      actions={
        hasActiveResignation ? (
          <span className="inline-flex items-center gap-1 text-micro font-semibold px-2 py-0.5 rounded-full border bg-status-warning-surface text-status-warning-ink border-status-warning-rule">
            Resignation pending
          </span>
        ) : (
          <AnimatedIconButton
            icon={PlusIcon}
            iconSize={14}
            size="sm"
            className="gap-1.5"
            onClick={handleOpenSheet}
          >
            {canApproveExit ? "New Resignation" : "Submit Resignation"}
          </AnimatedIconButton>
        )
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
          action={
            !hasActiveResignation
              ? {
                  label: canApproveExit ? "New Resignation" : "Submit Resignation",
                  onClick: handleOpenSheet,
                }
              : undefined
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
              onHrApprove={review.requestHrApprove}
              onHrReject={review.requestHrReject}
              onFinalApprove={review.requestFinalApprove}
              onFinalReject={review.requestFinalReject}
              onWithdraw={review.requestWithdraw}
              onViewLetter={handleViewLetter}
            />
          ))}
          {pagination && (pagination.hasMore || pager.hasPrevious) && (
            <TablePagination
              mode="cursor"
              rowCount={resignations.length}
              hasMore={pagination.hasMore}
              hasPrevious={pager.hasPrevious}
              onNext={handleNextPage}
              onPrevious={pager.goPrevious}
            />
          )}
        </div>
      )}

      <ResignationFormSheet open={sheetOpen} onOpenChange={setSheetOpen} />
      <ResignationReviewSheets review={review} />
    </PageWrapper>
  );
}
