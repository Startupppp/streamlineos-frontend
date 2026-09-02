"use client";

import { useMemo } from "react";
import { AiActionsMenu, type AiAction } from "@/components/ai";
import { useCan } from "@/hooks/api/access";
import { apiClient } from "@/lib/api-client";
import type { SupplierDelayBriefing } from "@/hooks/api/inv-ai-explain";

interface VendorAiActionsProps {
  vendorId: number;
  vendorName: string;
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
    const metrics = [
      `• On-Time Rate: ${(p.onTimeRate * 100).toFixed(1)}%`,
      `• Fill Rate: ${(p.fillRate * 100).toFixed(1)}%`,
      `• Avg Lead Time: ${p.avgLeadTimeDays} days`,
      `• Return Rate: ${(p.returnRate * 100).toFixed(1)}%`,
      `• Open POs: ${p.openPoCount}`,
      `• Delay Insights: ${v.insightCount}`,
    ].join("\n");

    parts.push(`${v.vendorName} Performance Evidence:\n${metrics}`);
  }

  return parts.join("\n\n");
}

export function VendorAiActions({ vendorId, vendorName }: VendorAiActionsProps) {
  const canAi = useCan("inventory:reports:read");

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
