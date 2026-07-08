"use client";

import { useCallback } from "react";
import { BarChart2, RotateCcw, Sparkles, AlertTriangle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { getErrorMessage } from "@/lib/get-error-message";
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

  const handleRun = useCallback(() => {
    mutation.mutate(undefined);
  }, [mutation]);

  const isIdle = !result && !mutation.isPending && !mutation.isError;

  return (
    <div className="bg-card border border-border rounded-xl shadow-sm p-4 flex flex-col gap-3 h-full">
      <div className="flex items-start gap-3">
        <div className="shrink-0 flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 border border-blue-100">
          <BarChart2 className="h-4 w-4 text-blue-500" />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-semibold text-foreground">Project Summary</h3>
          <p className="text-[12px] text-muted-foreground mt-0.5">AI-generated status overview</p>
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
            {featureEnabled ? "Generate Summary" : `Requires ${requiredPlan ?? "PROFESSIONAL"} plan`}
          </Button>
        )}

        {mutation.isPending && (
          <div className="space-y-2 py-1">
            <Skeleton className="h-3.5 w-full rounded" />
            <Skeleton className="h-3.5 w-4/5 rounded" />
            <Skeleton className="h-3.5 w-3/5 rounded" />
            <Skeleton className="h-3.5 w-3/4 rounded" />
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
          <div className="space-y-2.5">
            {result.atRisk && (
              <Badge variant="destructive" className="text-[11px] gap-1 h-5 px-1.5">
                <AlertTriangle className="h-2.5 w-2.5" />
                At risk
              </Badge>
            )}
            <p className="text-[13px] text-foreground leading-relaxed">{result.summary}</p>
            {result.highlights.length > 0 && (
              <ul className="space-y-1">
                {result.highlights.map((h, i) => (
                  <li key={i} className="text-[12px] text-muted-foreground flex items-start gap-1.5">
                    <span className="mt-1.5 h-1 w-1 rounded-full bg-blue-500 shrink-0" />
                    {h}
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
