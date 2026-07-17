"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { LoadingButton } from "@/components/ui/loading-button";
import { AiDraftCard, AiGeneratedLabel } from "@/components/ai";
import { getErrorMessage } from "@/lib/get-error-message";
import { useExplainReconciliation } from "@/hooks/api/accounting/accounting-ai";
import type { AiNarrationFactor } from "@/hooks/api/accounting/accounting-ai";

interface ReconciliationExplainPanelProps {
  matchId: number;
  className?: string;
}

function FactorRow({ factor }: { factor: AiNarrationFactor }) {
  return (
    <li className="flex items-start gap-2 text-xs">
      <span
        className={cn(
          "mt-0.5 shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-medium",
          factor.isFactual
            ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
            : "bg-amber-500/10 text-amber-700 dark:text-amber-400",
        )}
      >
        {factor.isFactual ? "Fact" : "Inference"}
      </span>
      <span className="text-muted-foreground leading-relaxed">
        <span className="font-medium text-foreground">{factor.label}:</span> {factor.value}
      </span>
    </li>
  );
}

export function ReconciliationExplainPanel({ matchId, className }: ReconciliationExplainPanelProps) {
  const mutation = useExplainReconciliation();

  function handleExplain() {
    mutation.mutate({ matchId });
  }

  return (
    <div className={cn("space-y-3", className)}>
      {!mutation.data && (
        <LoadingButton
          size="sm"
          variant="outline"
          isPending={mutation.isPending}
          loadingText="Analyzing match…"
          onClick={handleExplain}
          className="h-7 text-xs"
        >
          Explain match
        </LoadingButton>
      )}

      {mutation.error && (
        <p className="text-xs text-destructive">{getErrorMessage(mutation.error)}</p>
      )}

      {mutation.data && (
        <AiDraftCard timestamp={mutation.data.generatedAt}>
          <div className="space-y-3">
            <AiGeneratedLabel timestamp={mutation.data.generatedAt} />
            <p className="text-sm text-foreground leading-relaxed">{mutation.data.narration}</p>

            {mutation.data.factors.length > 0 && (
              <div className="space-y-1.5">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  Match factors
                </p>
                <ul className="space-y-1.5">
                  {mutation.data.factors.map((f, i) => (
                    <FactorRow key={i} factor={f} />
                  ))}
                </ul>
              </div>
            )}
          </div>
        </AiDraftCard>
      )}

      {mutation.data && (
        <button
          type="button"
          onClick={handleExplain}
          className="text-[11px] text-muted-foreground hover:text-foreground underline underline-offset-2 transition-colors"
        >
          Regenerate
        </button>
      )}
    </div>
  );
}
