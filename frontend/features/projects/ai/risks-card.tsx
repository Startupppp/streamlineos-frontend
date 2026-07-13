"use client";

import { useCallback } from "react";
import { ShieldAlert, RotateCcw, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { getErrorMessage } from "@/lib/get-error-message";
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
  if (s === "high") return "bg-red-50 text-red-700 border-red-200/70 dark:bg-red-500/10 dark:text-red-300 dark:border-red-500/30";
  if (s === "medium") return "bg-amber-50 text-amber-700 border-amber-200/70 dark:bg-amber-500/10 dark:text-amber-300 dark:border-amber-500/30";
  return "bg-muted text-muted-foreground border-border/70 dark:bg-slate-500/10 dark:text-slate-300 dark:border-slate-500/30";
}

export function RisksCard({ projectId, featureEnabled, requiredPlan }: RisksCardProps) {
  const mutation = useProjectAiRisks(projectId);
  const result = mutation.data;

  const handleRun = useCallback(() => {
    mutation.mutate(undefined);
  }, [mutation]);

  const isIdle = !result && !mutation.isPending && !mutation.isError;

  return (
    <div className="bg-card border border-border rounded-xl shadow-sm p-4 flex flex-col gap-3 h-full">
      <div className="flex items-start gap-3">
        <div className="shrink-0 flex h-8 w-8 items-center justify-center rounded-lg bg-amber-50 border border-amber-100 dark:bg-amber-500/10 dark:border-amber-500/30">
          <ShieldAlert className="h-4 w-4 text-amber-500" />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-semibold text-foreground">Risk Detection</h3>
          <p className="text-[12px] text-muted-foreground mt-0.5">Identify blockers and threats early</p>
        </div>
      </div>

      <div className="flex-1">
        {isIdle && (
          <Button
            size="sm"
            onClick={handleRun}
            disabled={!featureEnabled}
            className="h-8 gap-1.5 text-xs"
          >
            <Sparkles className="h-3.5 w-3.5" />
            {featureEnabled ? "Detect Risks" : `Requires ${requiredPlan ?? "PROFESSIONAL"} plan`}
          </Button>
        )}

        {mutation.isPending && (
          <div className="space-y-3 py-1">
            {[0, 1].map((i) => (
              <div key={i} className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <Skeleton className="h-3.5 w-3.5 rounded shrink-0" />
                  <Skeleton className="h-3.5 w-32 rounded" />
                  <Skeleton className="h-4 w-12 rounded" />
                </div>
                <Skeleton className="h-3 w-full rounded" />
              </div>
            ))}
          </div>
        )}

        {mutation.isError && (
          <div className="space-y-2.5">
            <p className="text-[13px] text-destructive leading-snug">
              {getErrorMessage(mutation.error)}
            </p>
            <Button variant="outline" size="sm" onClick={handleRun} className="h-8 gap-1.5 text-xs">
              <RotateCcw className="h-3.5 w-3.5" />
              Retry
            </Button>
          </div>
        )}

        {result && (
          <div className="space-y-3">
            {result.risks.length === 0 ? (
              <p className="text-[13px] text-muted-foreground">No significant risks detected.</p>
            ) : (
              <ul className="space-y-3">
                {result.risks.map((risk, i) => (
                  <li key={i} className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <ShieldAlert className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                      <span className="text-[13px] font-medium text-foreground">{risk.title}</span>
                      <span
                        className={`inline-flex items-center px-1.5 py-0.5 rounded border text-[10px] font-semibold uppercase tracking-wide ${severityClasses(risk.severity)}`}
                      >
                        {risk.severity}
                      </span>
                    </div>
                    <p className="text-[12px] text-muted-foreground pl-5">{risk.rationale}</p>
                    <p className="text-[12px] text-foreground/80 pl-5">
                      <span className="font-medium">Mitigation: </span>
                      {risk.mitigation}
                    </p>
                  </li>
                ))}
              </ul>
            )}
            <EvidenceStrip evidence={result.evidence} />
            <Button
              variant="ghost"
              size="sm"
              onClick={handleRun}
              disabled={mutation.isPending}
              className="h-7 gap-1.5 text-xs text-muted-foreground hover:text-foreground -ml-2"
            >
              <RotateCcw className="h-3 w-3" />
              Regenerate
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
