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

export function useNarrateOpsBrief() {
  return useAuthorizedMutation<OpsBriefNarration, Error, void>("inventory:ai:read", {
    mutationKey: ["inventory", "ai", "ops-brief", "narrate"],
    mutationFn: () =>
      apiClient.post<OpsBriefNarration>("/inventory/ai/ops-brief/narrate"),
  });
}
