"use client";

import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import { useCan } from "@/hooks/api/access";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";
import type { InsightNarration } from "@/hooks/api/inv-ai-explain";

export type OpsBriefSeverity = "high" | "medium" | "low" | "none";

export interface OpsBriefSignal {
  key: string;
  label: string;
  /** Supplied by the server, so the route and the count cannot drift apart. */
  href: string;
  count: number;
  severity: OpsBriefSeverity;
}

export interface InventoryOpsBrief {
  generatedAt: string;
  totalSignals: number;
  signals: OpsBriefSignal[];
}

export interface OpsBriefNarration {
  brief: InventoryOpsBrief;
  narration: InsightNarration;
}

/**
 * INV-101. Deterministic and unpaid, so it may load with the page — the counts
 * are the same ones the reports compute. Nothing here reaches a model.
 */
export function useOpsBrief() {
  const canView = useCan("inventory:ai:read");
  return useQuery<InventoryOpsBrief, Error>({
    queryKey: queryKeys.inventory.opsBrief(),
    queryFn: ({ signal }) =>
      apiClient.get<InventoryOpsBrief>("/inventory/ai/ops-brief", undefined, signal),
    enabled: canView,
    staleTime: 60_000,
  });
}

/**
 * The narrative, which spends credits. A mutation rather than a query because
 * it must only ever happen because somebody pressed the button.
 */
export function useNarrateOpsBrief() {
  return useAuthorizedMutation<OpsBriefNarration, Error, void>("inventory:ai:read", {
    mutationKey: ["inventory", "ai", "ops-brief", "narrate"],
    mutationFn: () =>
      apiClient.post<OpsBriefNarration>("/inventory/ai/ops-brief/narrate"),
  });
}
