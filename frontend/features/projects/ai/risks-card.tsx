"use client";

import { useCallback } from "react";
import { ShieldAlert, RotateCcw } from "lucide-react";
import { SparklesIcon } from "@animateicons/react/lucide";
import { LoadingButton } from "@/components/ui/loading-button";
import { Skeleton } from "@/components/ui/skeleton";
import { getErrorMessage } from "@/lib/get-error-message";
import { useAnimatedIcon } from "@/hooks/common/use-animated-icon";
import type { Plan } from "@/lib/billing/feature-gates";
import type { AiSeverity } from "@/types/projects/ai";
import { useProjectAiRisks } from "@/hooks/api/projects/ai";
import { EvidenceStrip } from "./evidence-strip";

interface RisksCardProps {
  projectId: number;
  featureEnabled: boolean;
  requiredPlan: Plan | null;
}

function severityClasses(s: AiSeverity): string {
  if (s === "high")
    return "bg-red-50 text-red-700 border-red-200/70 dark:bg-red-500/10 dark:text-red-300 dark:border-red-500/30";

  if (s === "medium")
    return "bg-amber-50 text-amber-700 border-amber-200/70 dark:bg-amber-500/10 dark:text-amber-300 dark:border-amber-500/30";

  return "bg-muted text-muted-foreground border-border/70 dark:bg-slate-500/10 dark:text-slate-300 dark:border-slate-500/30";
}

export function RisksCard({
  projectId,
  featureEnabled,
  requiredPlan,
}: RisksCardProps) {
  const mutation = useProjectAiRisks(projectId);
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
          className="h-8 w-full gap-1.5 text-xs"
          {...hoverHandlers}
        >
          <SparklesIcon ref={iconRef} size={14} />
          {featureEnabled
            ? "Detect Risks"
            : `Requires ${requiredPlan ?? "PROFESSIONAL"} plan`}
        </LoadingButton>
      ) : null}

      {mutation.isPending ? (
        <div className="space-y-3 py-1">
          {[0, 1].map((i) => (
            <div key={i} className="space-y-1.5">
              <div className="flex items-center gap-2">
                <Skeleton className="h-3.5 w-3.5 shrink-0 rounded" />
                <Skeleton className="h-3.5 w-32 rounded" />
                <Skeleton className="h-4 w-12 rounded" />
              </div>
              <Skeleton className="h-3 w-full rounded" />
            </div>
          ))}
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
            className="h-8 w-full gap-1.5 text-xs"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Retry
          </LoadingButton>
        </div>
      ) : null}

      {result ? (
        <div className="space-y-3">
          {result.risks.length === 0 ? (
            <p className="text-[13px] text-muted-foreground">
              No significant risks detected.
            </p>
          ) : (
            <ul className="space-y-3">
              {result.risks.map((risk, i) => (
                <li key={i} className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <ShieldAlert className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                    <span className="text-[13px] font-medium text-foreground">
                      {risk.title}
                    </span>
                    <span
                      className={`inline-flex items-center rounded border px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${severityClasses(risk.severity)}`}
                    >
                      {risk.severity}
                    </span>
                  </div>
                  <p className="pl-5 text-[12px] text-muted-foreground">
                    {risk.rationale}
                  </p>
                  <p className="pl-5 text-[12px] text-foreground/80">
                    <span className="font-medium">Mitigation: </span>
                    {risk.mitigation}
                  </p>
                </li>
              ))}
            </ul>
          )}
          <EvidenceStrip evidence={result.evidence} />
          <LoadingButton
            variant="ghost"
            size="sm"
            onClick={handleRun}
            isPending={mutation.isPending}
            className="h-8 w-full gap-1.5 text-xs text-muted-foreground hover:text-foreground"
          >
            <RotateCcw className="h-3 w-3" />
            Regenerate
          </LoadingButton>
        </div>
      ) : null}
    </div>
  );
}
