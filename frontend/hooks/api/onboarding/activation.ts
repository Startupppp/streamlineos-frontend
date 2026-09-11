"use client";

import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { platformCoreQueryKeys } from "@/lib/query-keys/platform-core";

export type ActivationStep =
  | "invite-a-colleague"
  | "bring-your-data"
  | "connect-a-channel"
  | "open-a-deal";

export interface ActivationReport {
  isActivated: boolean;
  completed: ActivationStep[];
  remaining: ActivationStep[];
  /** 0-100. Derived on the server, never stored. */
  percent: number;
  signals: {
    realParties: number;
    realDeals: number;
    realActivities: number;
    activeMembers: number;
    hasCompletedImport: boolean;
    hasConnectedChannel: boolean;
  };
  next: { step: ActivationStep; prompt: string } | null;
}

/**
 * How far this workspace is from first value.
 *
 * Deliberately **not** gated on a permission. Every member can see how set up
 * their own workspace is, and gating it would hide the checklist from exactly
 * the person most likely to finish it — the new colleague who was invited to
 * come and do the setting up.
 *
 * Which also means this hook is not one of the 365 surfaces ticket 26 is about:
 * a query that is never disabled cannot be mistaken for an empty one.
 */
export function useActivation() {
  return useQuery({
    queryKey: platformCoreQueryKeys.onboardingFlow.activation(),
    queryFn: ({ signal }) =>
      apiClient.get<ActivationReport>("/onboarding/activation", undefined, signal),
    // Counts move as the workspace is used, and the checklist is read while
    // somebody is actively doing the thing it asks for.
    staleTime: 30_000,
  });
}
