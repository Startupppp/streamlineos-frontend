"use client";

import { useCallback } from "react";
import { Sparkles, Loader2, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
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
  if (s === "high") return "bg-red-50 text-red-700 border-red-200/70";
  if (s === "medium") return "bg-amber-50 text-amber-700 border-amber-200/70";
  return "bg-slate-50 text-slate-600 border-slate-200/70";
}

export function RisksCard({ projectId, featureEnabled, requiredPlan }: RisksCardProps) {
  const mutation = useProjectAiRisks(projectId);
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
          <h3 className="text-sm font-semibold text-foreground">Risk Detection</h3>
          <p className="text-[12px] text-muted-foreground mt-0.5">Identify blockers and threats early</p>
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
          {mutation.isPending ? "Scanning…" : "Detect Risks"}
        </Button>
      </div>

      {result && (
        <div className="space-y-3 pt-3 border-t border-border/60">
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
        </div>
      )}
    </div>
  );
}
