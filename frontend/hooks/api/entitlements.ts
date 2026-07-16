"use client";

import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";

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

const ENTITLEMENTS_QUERY_KEY = ["billing", "entitlements"] as const;

export function useEntitlements() {
  return useQuery<Entitlements, Error>({
    queryKey: ENTITLEMENTS_QUERY_KEY,
    queryFn: () => apiClient.get<Entitlements>("/billing/entitlements"),
    staleTime: 60_000,
    refetchOnWindowFocus: true,
    retry: false,
  });
}
