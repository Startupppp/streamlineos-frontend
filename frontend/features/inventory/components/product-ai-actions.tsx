"use client";

import { useMemo } from "react";
import { AiActionsMenu, type AiAction } from "@/components/ai";
import { useCan } from "@/hooks/api/access";
import { apiClient } from "@/lib/api-client";
import { lazyContract } from "@/lib/api-envelope";

const listInsightsContract = lazyContract(() =>
  import("@/hooks/api/inventory/ai-schema").then((m) => m.listInsightsContract),
);
const explainInsightContract = lazyContract(() =>
  import("@/hooks/api/inventory/ai-schema").then((m) => m.explainInsightContract),
);
import type { ReorderProposalResponse } from "@/hooks/api/inv-ai-explain";

const reorderProposalContract = lazyContract(() =>
  import("@/hooks/api/inventory/ai-schema").then((m) => m.reorderProposalContract),
);
import type { InsightNarration } from "@/hooks/api/inv-ai-explain";
import type { AiInsight } from "@/hooks/api/inventory/reports";
import type { InvProductShape } from "@/hooks/api/inventory/products-schema";

interface ProductAiActionsProps {
  product: InvProductShape;
}

interface NarrationInput {
  explanation: string;
  factors: { label: string; value: string; isFactual: boolean }[];
  suggestedActions: string[];
}

function narrationToText(narration: NarrationInput): string {
  const factual = narration.factors.filter((f) => f.isFactual);
  const suggestions = narration.factors.filter((f) => !f.isFactual);

  const parts: string[] = [];

  if (factual.length > 0) {
    parts.push(
      "Evidence:\n" +
        factual.map((f) => `• ${f.label}: ${f.value}`).join("\n"),
    );
  }

  parts.push(`AI Narration:\n${narration.explanation}`);

  if (suggestions.length > 0) {
    parts.push(
      "Operational Notes:\n" +
        suggestions.map((f) => `• ${f.label}: ${f.value}`).join("\n"),
    );
  }

  if (narration.suggestedActions.length > 0) {
    parts.push(
      "Suggested Actions:\n" +
        narration.suggestedActions.map((a, i) => `${i + 1}. ${a}`).join("\n"),
    );
  }

  return parts.join("\n\n");
}

export function ProductAiActions({ product }: ProductAiActionsProps) {
  const canAi = useCan("inventory:reports:read");

  const actions = useMemo<AiAction[]>(() => {
    const result: AiAction[] = [];

    const firstVariant = product.variants?.[0];

    if (firstVariant) {
      result.push({
        key: "stock-risk",
        label: "Explain stock risk",
        description: "AI narrates deterministic stock health evidence",
        run: async (signal?: AbortSignal) => {
          const insights = await apiClient.get<{
            items: AiInsight[];
          }>("/inventory/ai/insights", { type: "LOW_STOCK", limit: "20" }, signal, listInsightsContract);

          const variantSku = firstVariant.sku;
          const matching = insights.items.find(
            (ins) =>
              ins.title.includes(variantSku) ||
              ins.body.includes(variantSku) ||
              ins.title.includes(product.name) ||
              ins.body.includes(product.name),
          );

          if (!matching) {
            return {
              text: `No active stock-risk insights found for ${product.name} (${variantSku}).\n\nCurrent data shows no flagged low-stock or risk condition for this product. Generate insights from the dashboard to get AI-powered analysis.`,
            };
          }

          const narration = await apiClient.post<InsightNarration>(
            `/inventory/ai/insights/${matching.id}/explain`,
            undefined,
            { signal },
            explainInsightContract,
          );

          return { text: narrationToText(narration) };
        },
      });

      result.push({
        key: "reorder-proposal",
        label: "Reorder proposal",
        description: "Draft PO based on deterministic reorder evidence",
        run: async (signal?: AbortSignal) => {
          const response = await apiClient.post<ReorderProposalResponse>(
            "/inventory/ai/reorder-proposal",
            { variantId: String(firstVariant.id) },
            { signal },
            reorderProposalContract,
          );

          const ev = response.evidence;
          const evidenceText = [
            `Evidence (Deterministic):`,
            `• Current On-Hand: ${ev.currentOnHand}`,
            `• Forecasted Stock: ${ev.forecastedQty}`,
            `• Suggested Reorder Qty: ${ev.suggestedOrderQty}`,
            `• Lead Time: ${ev.leadTimeDays} days`,
            `• Expected Arrival: ${ev.expectedDeliveryDate}`,
            `• Reason: ${ev.reorderReason}`,
          ].join("\n");

          const narration = narrationToText(response.explanation);

          const draftNote = `\n\nDraft PO: Proposal ${String(response.proposal.proposalId).slice(0, 8)}… expires ${new Date(response.proposal.expiresAt).toLocaleString()}. Open the Replenishment view to confirm and create the draft purchase order.`;

          return { text: `${evidenceText}\n\n${narration}${draftNote}` };
        },
      });
    }

    return result;
  }, [product]);

  if (!canAi || actions.length === 0) return null;

  return (
    <AiActionsMenu
      actions={actions}
      triggerLabel="AI"
      menuLabel="Inventory AI"
      align="end"
    />
  );
}
