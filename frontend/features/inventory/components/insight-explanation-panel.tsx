"use client";

import { memo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { LoadingButton } from "@/components/ui/loading-button";
import { AiGeneratedLabel } from "@/components/ai/ai-generated-label";
import { getErrorMessage } from "@/lib/get-error-message";
import { useExplainInsight, type ExplainFactor, type InsightNarration } from "@/hooks/api/inv-ai-explain";
import type { AiInsight } from "@/hooks/api/inventory/reports";

interface EvidenceSectionProps {
  narration: InsightNarration;
}

const EvidenceSection = memo(function EvidenceSection({ narration }: EvidenceSectionProps) {
  const factual = narration.factors.filter((f) => f.isFactual);
  const suggestions = narration.factors.filter((f) => !f.isFactual);

  return (
    <div className="space-y-3">
      <div>
        <p className="text-micro font-semibold uppercase tracking-wide text-muted-foreground mb-1.5">
          Evidence
        </p>
        <div className="grid grid-cols-2 gap-1.5">
          {factual.map((f: ExplainFactor, i: number) => (
            <div key={i} className="flex flex-col gap-0.5 rounded-md border border-border bg-muted/40 px-2 py-1.5">
              <span className="text-micro text-muted-foreground">{f.label}</span>
              <span className="text-xs font-semibold text-foreground">{f.value}</span>
            </div>
          ))}
        </div>
      </div>

      <div>
        <div className="flex items-center gap-2 mb-1.5">
          <p className="text-micro font-semibold uppercase tracking-wide text-muted-foreground">
            AI Narration
          </p>
          <AiGeneratedLabel />
        </div>
        <p className="text-xs text-muted-foreground leading-relaxed">{narration.explanation}</p>
      </div>

      {suggestions.length > 0 && (
        <div>
          <p className="text-micro font-semibold uppercase tracking-wide text-muted-foreground mb-1.5">
            Operational Notes
          </p>
          <div className="space-y-1">
            {suggestions.map((f: ExplainFactor, i: number) => (
              <div key={i} className="flex items-start gap-1.5">
                <Badge variant="outline" className="text-micro h-4 px-1 shrink-0 mt-0.5 bg-primary/5 border-primary/20 text-primary">
                  {f.label}
                </Badge>
                <span className="text-dense text-muted-foreground">{f.value}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {narration.suggestedActions.length > 0 && (
        <div>
          <p className="text-micro font-semibold uppercase tracking-wide text-muted-foreground mb-1.5">
            Suggested Actions
          </p>
          <ul className="space-y-1">
            {narration.suggestedActions.map((action: string, i: number) => (
              <li key={i} className="flex items-start gap-1.5 text-dense text-muted-foreground">
                <span className="shrink-0 mt-0.5 h-3.5 w-3.5 rounded-full border border-primary/30 bg-primary/5 flex items-center justify-center text-micro font-bold text-primary">
                  {i + 1}
                </span>
                {action}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
});

interface InsightExplanationPanelProps {
  insight: AiInsight;
}

export const InsightExplanationPanel = memo(function InsightExplanationPanel({
  insight,
}: InsightExplanationPanelProps) {
  const [narration, setNarration] = useState<InsightNarration | null>(null);
  const explainMutation = useExplainInsight();

  function handleExplain(): void {
    explainMutation.mutate(insight.id, {
      onSuccess: (data) => setNarration(data),
    });
  }

  return (
    <Card className="mt-2 border-border/60">
      <CardHeader className="pb-2 pt-3 px-3">
        <CardTitle className="text-dense font-semibold text-foreground flex items-center justify-between gap-2">
          <span>{insight.title}</span>
          {!narration && (
            <LoadingButton
              size="sm"
              variant="outline"
              className="text-micro h-6 px-2"
              isPending={explainMutation.isPending}
              loadingText="Explaining…"
              onClick={handleExplain}
            >
              Explain with AI
            </LoadingButton>
          )}
        </CardTitle>
      </CardHeader>

      {narration && (
        <>
          <Separator className="mb-3" />
          <CardContent className="px-3 pb-3">
            <EvidenceSection narration={narration} />
          </CardContent>
        </>
      )}

      {explainMutation.isError && (
        <CardContent className="px-3 pb-3">
          <p className="text-dense text-destructive">
            {explainMutation.error != null ? getErrorMessage(explainMutation.error) : "Failed to generate explanation. Try again."}
          </p>
        </CardContent>
      )}
    </Card>
  );
});
