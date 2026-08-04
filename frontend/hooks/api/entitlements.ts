"use client";

import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";

export type EntitlementTier = "FREE" | "PAID" | "ENTERPRISE";
export type EntitlementPlan = "FREE" | "STARTER" | "PROFESSIONAL" | "ENTERPRISE";

type LimitKey =
  | "members"
  | "projects"
  | "kbPages"
  | "chatChannels"
  | "crmLeads"
  | "crmContacts"
  | "crmDeals"
  | "supportTickets"
  | "automations"
  | "signEnvelopes"
  | "surveys"
  | "acctInvoices";

export interface EntitlementLimit {
  limit: number | null;
  used: number;
}

export interface Entitlements {
  tier: EntitlementTier;
  plan: EntitlementPlan;
  seatLimit: number | null;
  lockedModules: string[];
  features: {
    chatGroupHuddles: boolean;
    chatVoiceVideo: boolean;
    kbPublicSharing: boolean;
    hrFull: boolean;
  };
  limits: Record<LimitKey, EntitlementLimit>;
}

export function useEntitlements(enabled = true) {
  return useQuery<Entitlements, Error>({
    queryKey: queryKeys.billing.entitlements(),
    queryFn: () => apiClient.get<Entitlements>("/billing/entitlements"),
    staleTime: 900_000,
    retry: false,
    enabled,
  });
}
