"use client";

import { useMemo } from "react";
import { AiActionsMenu, type AiAction } from "@/components/ai";
import { useCan } from "@/hooks/api/access";
import { apiClient } from "@/lib/api-client";
import type {
  InsightNarration,
  ReorderProposalResponse,
} from "@/hooks/api/inv-ai-explain";
import type { AiInsight } from "@/hooks/api/inventory/reports";
import type { InventoryProduct } from "@/types/inventory";

interface ProductAiActionsProps {
  product: InventoryProduct;
}

function narrationToText(narration: InsightNarration): string {
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

  if (narration.actions.length > 0) {
    parts.push(
      "Suggested Actions:\n" +
        narration.actions
          .map((a, i) => `${i + 1}. ${a.label} — ${a.rationale}`)
          .join("\n"),
    );
  }

  return parts.join("\n\n");
}

export function ProductAiActions({ product }: ProductAiActionsProps) {
  const canAi = useCan("inventory:ai:read");
  const canPropose = useCan("inventory:ai:propose");

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
          }>("/inventory/ai/insights", { type: "LOW_STOCK", limit: "20" }, signal);

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
          );

          return { text: narrationToText(narration) };
        },
      });

      if (canPropose)
        result.push({
          key: "reorder-proposal",
          label: "Reorder proposal",
          description: "Draft PO based on deterministic reorder evidence",
          run: async (signal?: AbortSignal) => {
            // F4. The response is the persisted C2 proposal: the quantity is
            // the one the server would order, as an exact decimal string, and
            // `blocked` means it declined to propose at all.
            const response = await apiClient.post<ReorderProposalResponse>(
              "/inventory/ai/reorder-proposal",
              { variantId: firstVariant.id },
              { signal },
            );

            const ev = response.evidence;
            const evidenceText = [
              `Evidence (Deterministic):`,
              `• SKU: ${ev.variantSku}`,
              `• Order Quantity: ${ev.suggestedQuantity}`,
              `• Reorder Point: ${ev.reorderPoint ?? "—"}`,
              `• Supplier: ${ev.vendorName ?? "—"}`,
              `• Warehouse: ${ev.warehouseName ?? "Organisation-wide"}`,
              `• Unit Cost: ${ev.unitCost}`,
            ].join("\n");

            if (response.status === "blocked" || response.proposal === null) {
              const reason =
                response.blockedReason ??
                "This item cannot be ordered from here right now.";
              return { text: `${evidenceText}\n\n${reason}` };
            }

            const narration = response.explanation
              ? narrationToText(response.explanation)
              : "";

            const draftNote = `\n\nDraft PO: Proposal ${response.proposal.proposalId} expires ${new Date(response.proposal.expiresAt).toLocaleString()}. Open the Replenishment view to confirm and create the draft purchase order.`;

            return { text: `${evidenceText}\n\n${narration}${draftNote}` };
          },
        });
    }

    return result;
  }, [product, canPropose]);

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
