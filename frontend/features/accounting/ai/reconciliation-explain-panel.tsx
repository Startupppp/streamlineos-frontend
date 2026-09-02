"use client";

import { cn } from "@/lib/utils";
import { LoadingButton } from "@/components/ui/loading-button";
import { AiDraftCard, AiGeneratedLabel, AiFailureBody } from "@/components/ai";
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
          "mt-0.5 shrink-0 rounded-full px-1.5 py-0.5 text-micro font-medium",
          factor.isFactual
            ? "bg-status-success-surface text-status-success-ink"
            : "bg-status-warning-surface text-status-warning-ink",
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
        <AiFailureBody error={mutation.error} onRetry={handleExplain} />
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
          className="text-dense text-muted-foreground hover:text-foreground underline underline-offset-2 transition-colors"
        >
          Regenerate
        </button>
      )}
    </div>
  );
}
