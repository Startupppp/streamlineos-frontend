"use client";

import { memo } from "react";
import { Badge } from "@/components/ui/badge";
import { AiGeneratedLabel } from "@/components/ai/ai-generated-label";
import { formatShortDate } from "@/lib/date-utils";
import type { ReorderEvidence, ReorderProposalResponse } from "@/hooks/api/inv-ai-explain";

interface EvidenceGridProps {
  evidence: ReorderEvidence;
}

const EvidenceGrid = memo(function EvidenceGrid({ evidence }: EvidenceGridProps) {
  const fields: Array<{ label: string; value: string }> = [
    { label: "Current On-Hand", value: String(evidence.currentOnHand) },
    { label: "Forecasted Stock", value: String(evidence.forecastedQty) },
    { label: "Suggested Reorder Qty", value: String(evidence.suggestedOrderQty) },
    { label: "Lead Time", value: `${evidence.leadTimeDays} days` },
    { label: "Expected Arrival", value: formatShortDate(evidence.expectedDeliveryDate) || "—" },
    { label: "SKU", value: evidence.variantSku },
  ];

  return (
    <div>
      <p className="text-micro font-semibold uppercase tracking-wide text-muted-foreground mb-1.5">
        Evidence (Deterministic)
      </p>
      <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3">
        {fields.map((f) => (
          <div
            key={f.label}
            className="flex flex-col gap-0.5 rounded-md border border-border bg-muted/40 px-2 py-1.5"
          >
            <span className="text-micro text-muted-foreground">{f.label}</span>
            <span className="text-xs font-semibold text-foreground">{f.value}</span>
          </div>
        ))}
      </div>
      {evidence.reorderReason && (
        <p className="mt-2 text-dense text-muted-foreground">
          <span className="font-medium text-foreground">Reason: </span>
          {evidence.reorderReason}
        </p>
      )}
    </div>
  );
});

interface AiNarrationSectionProps {
  explanation: ReorderProposalResponse["explanation"];
}

export const AiNarrationSection = memo(function AiNarrationSection({
  explanation,
}: AiNarrationSectionProps) {
  const factual = explanation.factors.filter((f) => f.isFactual);
  const nonFactual = explanation.factors.filter((f) => !f.isFactual);

  return (
    <div className="space-y-3">
      <div>
        <div className="flex items-center gap-2 mb-1.5">
          <p className="text-micro font-semibold uppercase tracking-wide text-muted-foreground">
            AI Narration
          </p>
          <AiGeneratedLabel />
        </div>
        <p className="text-xs text-muted-foreground leading-relaxed">{explanation.explanation}</p>
      </div>

      {factual.length > 0 && (
        <div className="grid grid-cols-2 gap-1.5">
          {factual.map((f, i) => (
            <div
              key={i}
              className="flex flex-col gap-0.5 rounded-md border border-border bg-muted/40 px-2 py-1.5"
            >
              <span className="text-micro text-muted-foreground">{f.label}</span>
              <span className="text-xs font-semibold text-foreground">{f.value}</span>
            </div>
          ))}
        </div>
      )}

      {nonFactual.length > 0 && (
        <div>
          <p className="text-micro font-semibold uppercase tracking-wide text-muted-foreground mb-1.5">
            Operational Notes
          </p>
          <div className="space-y-1">
            {nonFactual.map((f, i) => (
              <div key={i} className="flex items-start gap-1.5">
                <Badge
                  variant="outline"
                  className="text-micro h-4 px-1 shrink-0 mt-0.5 bg-primary/5 border-primary/20 text-primary"
                >
                  {f.label}
                </Badge>
                <span className="text-dense text-muted-foreground">{f.value}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {explanation.suggestedActions.length > 0 && (
        <div>
          <p className="text-micro font-semibold uppercase tracking-wide text-muted-foreground mb-1.5">
            Suggested Actions
          </p>
          <ul className="space-y-1">
            {explanation.suggestedActions.map((action, i) => (
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

interface ReorderEvidenceCardProps {
  evidence: ReorderEvidence;
  explanation: ReorderProposalResponse["explanation"];
}

export const ReorderEvidenceCard = memo(function ReorderEvidenceCard({
  evidence,
  explanation,
}: ReorderEvidenceCardProps) {
  return (
    <div className="space-y-4">
      <EvidenceGrid evidence={evidence} />
      <AiNarrationSection explanation={explanation} />
    </div>
  );
});
