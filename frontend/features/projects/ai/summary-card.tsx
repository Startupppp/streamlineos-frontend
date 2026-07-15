"use client";

import { useCallback } from "react";
import { AlertTriangle, RotateCcw } from "lucide-react";
import { SparklesIcon } from "@animateicons/react/lucide";
import { Badge } from "@/components/ui/badge";
import { LoadingButton } from "@/components/ui/loading-button";
import { Skeleton } from "@/components/ui/skeleton";
import { getErrorMessage } from "@/lib/get-error-message";
import { useAnimatedIcon } from "@/hooks/common/use-animated-icon";
import type { Plan } from "@/lib/billing/feature-gates";
import { useProjectAiSummary } from "@/hooks/api/projects/ai";
import { EvidenceStrip } from "./evidence-strip";

interface SummaryCardProps {
  projectId: number;
  featureEnabled: boolean;
  requiredPlan: Plan | null;
}

export function SummaryCard({ projectId, featureEnabled, requiredPlan }: SummaryCardProps) {
  const mutation = useProjectAiSummary(projectId);
  const result = mutation.data;
  const { iconRef, hoverHandlers } = useAnimatedIcon();

  const handleRun = useCallback(() => {
    mutation.mutate(undefined);
  }, [mutation]);

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
          {result.atRisk ? (
            <Badge variant="destructive" className="h-5 gap-1 px-1.5 text-[11px]">
              <AlertTriangle className="h-2.5 w-2.5" />
              At risk
            </Badge>
          ) : null}
          <p className="text-[13px] leading-relaxed text-foreground">{result.summary}</p>
          {result.highlights.length > 0 ? (
            <ul className="space-y-1">
              {result.highlights.map((h, i) => (
                <li key={i} className="flex items-start gap-1.5 text-[12px] text-muted-foreground">
                  <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-primary" />
                  {h}
                </li>
              ))}
            </ul>
          ) : null}
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
