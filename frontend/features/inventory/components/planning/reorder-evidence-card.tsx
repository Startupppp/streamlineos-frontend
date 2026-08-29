"use client";

import { memo } from "react";
import { Badge } from "@/components/ui/badge";
import { AiGeneratedLabel } from "@/components/ai/ai-generated-label";
import type {
  ReorderEvidence,
  ReorderForecast,
  ReorderProposalResponse,
} from "@/hooks/api/inv-ai-explain";
import { AiSuggestedActions } from "../ai-suggested-actions";

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("en-IN", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

interface EvidenceGridProps {
  evidence: ReorderEvidence;
  forecast: ReorderForecast;
}

/**
 * F4. Quantities arrive as exact decimal strings and are rendered as they
 * arrived. `Number(...)` on one of these would put an 18,4 ledger figure through
 * a float on its way to a cell a buyer reads before signing an order.
 */
const EvidenceGrid = memo(function EvidenceGrid({ evidence, forecast }: EvidenceGridProps) {
  const fields: Array<{ label: string; value: string }> = [
    { label: "SKU", value: evidence.variantSku },
    { label: "Order Quantity", value: evidence.suggestedQuantity },
    { label: "Reorder Point", value: evidence.reorderPoint ?? "—" },
    { label: "Safety Stock", value: forecast.safetyStock ?? "—" },
    { label: "Supplier", value: evidence.vendorName ?? "—" },
    { label: "Warehouse", value: evidence.warehouseName ?? "Organisation-wide" },
    { label: "Unit Cost", value: evidence.unitCost },
    { label: "Lead Time", value: `${forecast.leadTimeWeeks} weeks` },
    { label: "Forecast Generated", value: formatDate(evidence.generatedAt) },
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
      <p className="mt-2 text-dense text-muted-foreground">
        <span className="font-medium text-foreground">Forecast: </span>
        {forecast.method ?? "no method committed"} over {forecast.demandCategory} demand
        {" "}(mean {forecast.demandMean}, sd {forecast.demandStdDev}) at service level{" "}
        {forecast.serviceLevel}
        {forecast.stockoutCensored ? ", adjusted for stockout censoring" : ""}.
      </p>
      {forecast.refusalReason && (
        <p className="mt-1 text-dense text-muted-foreground">
          <span className="font-medium text-foreground">Caveat: </span>
          {forecast.refusalReason}
        </p>
      )}
    </div>
  );
});

interface AiNarrationSectionProps {
  explanation: NonNullable<ReorderProposalResponse["explanation"]>;
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

      <AiSuggestedActions actions={explanation.actions} />
    </div>
  );
});

interface ReorderEvidenceCardProps {
  evidence: ReorderEvidence;
  forecast: ReorderForecast;
  explanation: ReorderProposalResponse["explanation"];
}

export const ReorderEvidenceCard = memo(function ReorderEvidenceCard({
  evidence,
  forecast,
  explanation,
}: ReorderEvidenceCardProps) {
  return (
    <div className="space-y-4">
      <EvidenceGrid evidence={evidence} forecast={forecast} />
      {/* Null whenever the server declined to propose: there is no narration to
          show, and an empty AI panel would read as a model with nothing to say
          rather than as a proposal that was never made. */}
      {explanation && <AiNarrationSection explanation={explanation} />}
    </div>
  );
});
