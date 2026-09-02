"use client";

import { AlertTriangle, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { LoadingButton } from "@/components/ui/loading-button";
import { AiCitationChips } from "@/components/ai/ai-citation-chips";
import { AiGeneratedLabel } from "@/components/ai/ai-generated-label";
import { AiUsageChip } from "@/components/ai/ai-usage-chip";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { getErrorMessage } from "@/lib/get-error-message";
import {
  useExecutiveBrief,
  useGenerateBrief,
  type LatestBriefResponse,
  type ExecutiveBriefSnapshot,
} from "@/lib/api/hooks/executive-brief";

export default function ExecutiveBriefPage() {
  const { data, isLoading, isError, error, refetch } = useExecutiveBrief();
  const generate = useGenerateBrief();

  function handleRetry() {
    void refetch();
  }

  function handleGenerate() {
    generate.mutate(undefined, {
      onError: (err) => toast.error(getErrorMessage(err)),
      onSuccess: () => toast.success("Executive brief generated"),
    });
  }

  return (
    <PageWrapper
      title="Executive Brief"
      subtitle="AI-generated cross-module operational summary for leadership"
      actions={
        <LoadingButton
          isPending={generate.isPending}
          loadingText="Generating…"
          onClick={handleGenerate}
        >
          <Sparkles className="h-3.5 w-3.5" />
          Generate Brief
        </LoadingButton>
      }
    >
      {isLoading && <BriefSkeleton />}
      {!isLoading && isError && (
        <ErrorState
          className="flex-1"
          title="Couldn't load the executive brief"
          description={getErrorMessage(error)}
          onRetry={handleRetry}
        />
      )}
      {!isLoading && !isError && data && (
        <BriefContent data={data} freshUsage={generate.data?.aiUsage} />
      )}
    </PageWrapper>
  );
}

function BriefSkeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="h-5 rounded-md bg-muted w-4/5" />
      <div className="h-5 rounded-md bg-muted w-3/5" />
      <div className="h-5 rounded-md bg-muted w-2/3" />
      <div className="h-5 rounded-md bg-muted w-1/2" />
    </div>
  );
}

function BriefContent({ data, freshUsage }: { data: LatestBriefResponse; freshUsage?: ExecutiveBriefSnapshot["aiUsage"] }) {
  const { snapshot, isStale } = data;

  if (!snapshot) {
    return (
      <EmptyState
        className="flex-1"
        title="No executive brief yet"
        description="Generate one to see a cross-module operational summary for leadership."
      />
    );
  }

  return (
    <div className="space-y-6">
      {isStale && (
        <div className="flex items-center gap-2 rounded-xl border border-status-warning-rule bg-status-warning-surface p-3 text-status-warning-ink text-sm">
          <AlertTriangle className="h-4 w-4 flex-shrink-0" />
          <span>This brief may be outdated. Generate a new one for current data.</span>
        </div>
      )}

      {snapshot.uncertaintyNotes.length > 0 && (
        <div className="rounded-xl border border-status-warning-rule bg-status-warning-surface p-4">
          <p className="text-xs font-semibold text-status-warning-ink mb-2">
            Data gaps — not all sources were available:
          </p>
          <ul className="space-y-1">
            {snapshot.uncertaintyNotes.map((note, i) => (
              <li
                key={i}
                className="text-xs text-status-warning-ink flex items-start gap-1.5"
              >
                <AlertTriangle className="h-3 w-3 mt-0.5 flex-shrink-0" />
                {note}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="rounded-xl border border-border bg-card p-6 shadow-sm space-y-4">
        <div className="flex flex-wrap items-center gap-2 justify-between">
          <h2 className="text-sm font-semibold text-foreground">Operational Summary</h2>
          <div className="flex items-center gap-3">
            <AiUsageChip usage={freshUsage} />
            <AiGeneratedLabel timestamp={snapshot.generatedAt} />
          </div>
        </div>
        <p className="text-sm text-foreground leading-relaxed whitespace-pre-line">
          {snapshot.narrative}
        </p>
        {snapshot.citations.length > 0 && (
          <AiCitationChips citations={snapshot.citations} />
        )}
      </div>
    </div>
  );
}
