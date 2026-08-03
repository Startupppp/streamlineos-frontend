"use client";

import { useCallback } from "react";
import { RotateCcw } from "lucide-react";
import { SparklesIcon } from "@animateicons/react/lucide";
import { LoadingButton } from "@/components/ui/loading-button";
import { Skeleton } from "@/components/ui/skeleton";
import { getErrorMessage } from "@/lib/get-error-message";
import { useAnimatedIcon } from "@/hooks/common/use-animated-icon";
import type { Plan } from "@/lib/billing/feature-gates";
import { useProjectAiSummary } from "@/hooks/api/build/ai";
import { useSaveSnapshot } from "@/hooks/api/ai-summaries";
import { StandardSummaryCard } from "@/features/ai-summaries";
import { EvidenceStrip } from "./evidence-strip";

interface SummaryCardProps {
  projectId: number;
  featureEnabled: boolean;
  requiredPlan: Plan | null;
}

export function SummaryCard({ projectId, featureEnabled, requiredPlan }: SummaryCardProps) {
  const mutation = useProjectAiSummary(projectId);
  const saveSnapshot = useSaveSnapshot("project", String(projectId));
  const result = mutation.data;
  const { iconRef, hoverHandlers } = useAnimatedIcon();

  const handleRun = useCallback(async () => {
    try {
      const data = await mutation.mutateAsync(undefined);
      saveSnapshot.mutate({
        summary: data.summary,
        structured: {
          highlights: data.highlights,
          blockers: data.atRisk ? ["Project is at risk"] : [],
          nextActions: [],
        },
      });
    } catch {
      // mutation.isError already handles display
    }
  }, [mutation, saveSnapshot]);

  const isIdle = !result && !mutation.isPending && !mutation.isError;

  return (
    <div className="flex flex-col gap-3">
      {isIdle ? (
        <LoadingButton
          size="sm"
          onClick={handleRun}
          disabled={!featureEnabled}
          isPending={mutation.isPending}
          className="w-full gap-1.5 text-xs"
          {...hoverHandlers}
        >
          <SparklesIcon ref={iconRef} size={14} />
          {featureEnabled ? "Generate Summary" : `Requires ${requiredPlan ?? "PROFESSIONAL"} plan`}
        </LoadingButton>
      ) : null}

      {mutation.isPending ? (
        <div className="space-y-2 py-1">
          <Skeleton className="h-3.5 w-full rounded" />
          <Skeleton className="h-3.5 w-4/5 rounded" />
          <Skeleton className="h-3.5 w-3/5 rounded" />
          <Skeleton className="h-3.5 w-3/4 rounded" />
        </div>
      ) : null}

      {mutation.isError ? (
        <div className="space-y-2.5">
          <p className="text-[13px] leading-snug text-destructive">
            {getErrorMessage(mutation.error)}
          </p>
          <LoadingButton
            variant="outline"
            size="sm"
            onClick={handleRun}
            className="w-full gap-1.5 text-xs"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Retry
          </LoadingButton>
        </div>
      ) : null}

      {result ? (
        <div className="space-y-2.5">
          <StandardSummaryCard
            entityType="project"
            entityId={String(projectId)}
            summary={result.summary}
            structured={{
              highlights: result.highlights,
              blockers: result.atRisk ? ["Project is at risk"] : [],
              nextActions: [],
            }}
            generatedAt={new Date()}
            confidence={0.8}
          />
          <EvidenceStrip evidence={result.evidence} />
          <LoadingButton
            variant="ghost"
            size="sm"
            onClick={handleRun}
            isPending={mutation.isPending}
            className="w-full gap-1.5 text-xs text-muted-foreground hover:text-foreground"
          >
            <RotateCcw className="h-3 w-3" />
            Regenerate
          </LoadingButton>
        </div>
      ) : null}
    </div>
  );
}
