"use client";

import { AlertTriangle, RefreshCw, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { LoadingButton } from "@/components/ui/loading-button";
import { AiCitationChips } from "@/components/ai/ai-citation-chips";
import { AiGeneratedLabel } from "@/components/ai/ai-generated-label";
import { getErrorMessage } from "@/lib/get-error-message";
import {
  useExecutiveBrief,
  useGenerateBrief,
  type LatestBriefResponse,
} from "@/lib/api/hooks/executive-brief";

export default function ExecutiveBriefPage() {
  const { data, isLoading, error } = useExecutiveBrief();
  const generate = useGenerateBrief();

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
      {error && (
        <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-destructive text-sm">
          {getErrorMessage(error)}
        </div>
      )}
      {!isLoading && !error && data && <BriefContent data={data} />}
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

function BriefContent({ data }: { data: LatestBriefResponse }) {
  const { snapshot, isStale } = data;

  if (!snapshot) {
    return (
      <div className="flex flex-col items-center justify-center flex-1 min-h-[300px] gap-3 text-muted-foreground">
        <RefreshCw className="h-8 w-8 opacity-30" />
        <p className="text-sm">No executive brief yet. Click "Generate Brief" to create one.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {isStale && (
        <div className="flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 dark:bg-amber-500/10 dark:border-amber-500/30 p-3 text-amber-700 dark:text-amber-300 text-sm">
          <AlertTriangle className="h-4 w-4 flex-shrink-0" />
          <span>This brief may be outdated. Generate a new one for current data.</span>
        </div>
      )}

      {snapshot.uncertaintyNotes.length > 0 && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 dark:bg-amber-500/10 dark:border-amber-500/30 p-4">
          <p className="text-xs font-semibold text-amber-700 dark:text-amber-300 mb-2">
            Data gaps — not all sources were available:
          </p>
          <ul className="space-y-1">
            {snapshot.uncertaintyNotes.map((note, i) => (
              <li
                key={i}
                className="text-xs text-amber-600 dark:text-amber-400 flex items-start gap-1.5"
              >
                <AlertTriangle className="h-3 w-3 mt-0.5 flex-shrink-0" />
                {note}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="rounded-xl border border-border bg-card p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-foreground">Operational Summary</h2>
          <AiGeneratedLabel timestamp={snapshot.generatedAt} />
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
