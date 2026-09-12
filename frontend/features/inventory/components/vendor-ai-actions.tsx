"use client";

import { useMemo } from "react";
import { AiActionsMenu, type AiAction } from "@/components/ai";
import { useCan } from "@/hooks/api/access";
import { apiClient } from "@/lib/api-client";
import type { SupplierDelayBriefing } from "@/hooks/api/inv-ai-explain";
import type { ScorecardRate } from "@/types/inventory-vendor-performance";

interface VendorAiActionsProps {
  vendorId: number;
  vendorName: string;
}

function rateLine(rate: ScorecardRate, unit: string): string {
  if (rate.percent === null) return `not measured (no ${unit})`;
  return `${rate.percent}% over ${rate.sampleSize} ${unit}`;
}

function briefingToText(briefing: SupplierDelayBriefing): string {
  const parts: string[] = [];

  if (briefing.narration) {
    parts.push(`AI Briefing:\n${briefing.narration}`);
  }

  if (briefing.vendors.length === 0) {
    parts.push("No supplier delays detected for this vendor.");
    return parts.join("\n\n");
  }

  for (const v of briefing.vendors) {
    const p = v.performance;
    // C4. Copied out verbatim, sample size included. A rate with no sample
    // beside it is the shape that lets somebody quote "50% rejected" from two
    // receipts, and this text is what a buyer pastes into an email.
    const metrics = [
      `• On-Time Rate: ${rateLine(p.onTime, "orders")}`,
      `• Line Fill Rate: ${rateLine(p.lineFill, "lines")}`,
      `• Lead Time p90: ${p.leadTime.observations === 0 ? "not measured" : `${p.leadTime.p90Days} days over ${p.leadTime.observations} receipts`}`,
      `• Return Rate: ${rateLine(p.returns, "returned lines")}`,
      `• Open POs: ${p.openPoCount}`,
      `• Delay Insights: ${v.insightCount}`,
    ].join("\n");

    parts.push(`${v.vendorName} Performance Evidence:\n${metrics}`);
  }

  return parts.join("\n\n");
}

export function VendorAiActions({ vendorId, vendorName }: VendorAiActionsProps) {
  const canAi = useCan("inventory:ai:read");

  const actions = useMemo<AiAction[]>(
    () => [
      {
        key: "supplier-delay",
        label: "Supplier-delay briefing",
        description: "AI narrates delivery performance evidence",
        run: async (signal?: AbortSignal) => {
          const briefing = await apiClient.get<SupplierDelayBriefing>(
            "/inventory/ai/supplier-delay",
            { vendorId: String(vendorId) },
            signal,
          );
          return { text: briefingToText(briefing) };
        },
      },
    ],
    [vendorId],
  );

  if (!canAi) return null;

  return (
    <AiActionsMenu
      actions={actions}
      triggerLabel="AI"
      menuLabel={`${vendorName} AI`}
      align="end"
    />
  );
}
