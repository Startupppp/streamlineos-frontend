"use client";

import { useCallback } from "react";
import { Sparkles, Loader2, AlertTriangle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
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
    if (!featureEnabled) {
      toast.error(`AI Project Manager requires the ${requiredPlan ?? "PROFESSIONAL"} plan.`);
      return;
    }
    mutation.mutate(undefined, {
      onError: (e) => toast.error(getErrorMessage(e)),
    });
  }, [featureEnabled, requiredPlan, mutation]);

  return (
    <div className="bg-card border border-border rounded-xl shadow-sm p-4 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-sm font-semibold text-foreground">Project Summary</h3>
          <p className="text-[12px] text-muted-foreground mt-0.5">AI-generated status overview</p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleRun}
          disabled={mutation.isPending || !featureEnabled}
          className="shrink-0 h-8 gap-1.5 text-xs"
        >
          {mutation.isPending ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Sparkles className="h-3.5 w-3.5 text-blue-600" />
          )}
          {mutation.isPending ? "Analyzing…" : "Summarize"}
        </Button>
      </div>

      {result && (
        <div className="space-y-2.5 pt-3 border-t border-border/60">
          <div className="flex items-center gap-2 flex-wrap">
            {result.atRisk && (
              <Badge variant="destructive" className="text-[11px] gap-1 h-5 px-1.5">
                <AlertTriangle className="h-2.5 w-2.5" />
                At risk
              </Badge>
            )}
          </div>
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
        </div>
      )}
    </div>
  );
}
