"use client";

import { useState } from "react";
import { toast } from "sonner";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { LoadingButton } from "@/components/ui/loading-button";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/shared/error-state";
import { EmptyState } from "@/components/ui/empty-state";
import { useCan } from "@/hooks/api/access";
import { getErrorMessage } from "@/lib/get-error-message";
import {
  useKnowledgeGaps,
  useDetectGaps,
  useDraftGap,
  useDismissGap,
} from "@/hooks/api/support/knowledge-gaps";
import { KnowledgeGapCard } from "./knowledge-gap-card";

function GapListSkeletons() {
  return (
    <div className="space-y-3">
      {[0, 1, 2].map((i) => (
        <div key={i} className="bg-card border border-border rounded-xl shadow-sm p-4 space-y-3">
          <div className="flex items-start justify-between gap-3">
            <Skeleton className="h-4 flex-1 max-w-[70%]" />
            <Skeleton className="h-5 w-16 rounded-full" />
          </div>
          <div className="flex gap-2">
            <Skeleton className="h-5 w-20 rounded-full" />
          </div>
          <div className="space-y-1.5">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-3 w-40" />
            <Skeleton className="h-3 w-36" />
          </div>
          <div className="flex gap-2 pt-1 border-t border-border">
            <Skeleton className="h-7 w-28" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function KnowledgeGapsPage() {
  const [cursor, setCursor] = useState<number | undefined>(undefined);
  const { data, isLoading, isError, refetch } = useKnowledgeGaps(cursor);
  const detectMutation = useDetectGaps();
  const draftMutation = useDraftGap();
  const dismissMutation = useDismissGap();

  function handleDetect() {
    detectMutation.mutate(void 0, {
      onSuccess: () => toast.success("Gap detection queued"),
      onError: (err) => toast.error(getErrorMessage(err)),
    });
  }

  function handleDraft(gapId: number) {
    draftMutation.mutate(
      { gapId },
      {
        onSuccess: () => toast.success("KB draft created — review & publish in KB"),
        onError: (err) => toast.error(getErrorMessage(err)),
      },
    );
  }

  function handleDismiss(gapId: number) {
    dismissMutation.mutate(
      { gapId },
      { onError: (err) => toast.error(getErrorMessage(err)) },
    );
  }

  function handleRetry() {
    void refetch();
  }

  function handleLoadMore() {
    if (data?.nextCursor) setCursor(data.nextCursor);
  }

  const canManage = useCan("support:knowledge-gaps:manage");

  const detectAction = canManage ? (
    <LoadingButton
      size="sm"
      variant="outline"
      isPending={detectMutation.isPending}
      loadingText="Detecting…"
      onClick={handleDetect}
    >
      Detect Gaps
    </LoadingButton>
  ) : null;

  return (
    <PageWrapper
      title="Knowledge Gaps"
      subtitle="Repeated unresolved questions that need KB articles"
      actions={detectAction}
    >
      {isLoading && <GapListSkeletons />}

      {!isLoading && isError && (
        <ErrorState
          title="Failed to load knowledge gaps"
          description="We couldn't load gap data. Please try again."
          onRetry={handleRetry}
        />
      )}

      {!isLoading && !isError && data && data.gaps.length === 0 && (
        <EmptyState
          illustrationPreset="search"
          title="No knowledge gaps detected yet"
          description="Run detection to find repeated unresolved questions that need KB articles."
          action={{ label: "Detect Gaps", onClick: handleDetect }}
        />
      )}

      {!isLoading && !isError && data && data.gaps.length > 0 && (
        <div className="flex flex-1 min-h-0 flex-col gap-3">
          {data.gaps.map((gap) => (
            <KnowledgeGapCard
              key={gap.id}
              gap={gap}
              onDraft={handleDraft}
              onDismiss={handleDismiss}
              isDrafting={draftMutation.isPending && draftMutation.variables?.gapId === gap.id}
              isDismissing={dismissMutation.isPending && dismissMutation.variables?.gapId === gap.id}
            />
          ))}
          {data.nextCursor !== null && (
            <div className="flex justify-center pt-2">
              <LoadingButton variant="outline" size="sm" isPending={isLoading} onClick={handleLoadMore}>
                Load more
              </LoadingButton>
            </div>
          )}
        </div>
      )}
    </PageWrapper>
  );
}
