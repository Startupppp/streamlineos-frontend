"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import { useGatedQuery } from "@/hooks/api/gated-query";
import type { ConsentChannel } from "@/lib/renderer/crm/contact-consent-layout";

export interface ContactConsentRow {
  id: number;
  contactId: number;
  channel: ConsentChannel;
  status: "OPTED_IN" | "OPTED_OUT" | "UNKNOWN";
  legalBasis: "CONSENT" | "CONTRACT" | "LEGITIMATE_INTEREST" | "LEGAL_OBLIGATION" | null;
  source: "USER_ENTRY" | "IMPORT" | "API" | "ENRICHMENT" | "UNSUBSCRIBE_LINK" | "WEB_FORM";
  sourceDetail: string | null;
  capturedAt: string;
  expiresAt: string | null;
  recordedByUserId: string | null;
}

/**
 * What this contact has agreed to, per channel.
 *
 * `/crm/consent/**` had no caller anywhere in this repository — not on this
 * branch and not on any other; the only mention of the path outside the backend
 * was the generated `openapi.json`. Consent capture and unsubscribe are DPDP
 * obligations rather than conveniences, so a backend with no way to reach it is
 * the whole feature missing, not a rough edge.
 */
export function useContactConsent(contactId: number) {
  return useGatedQuery("crm:contacts:view", {
    queryKey: queryKeys.contactConsent.list(contactId),
    queryFn: () => apiClient.get<ContactConsentRow[]>(`/crm/consent/contacts/${contactId}`),
    staleTime: 2 * 60_000,
    enabled: contactId > 0,
  });
}

/**
 * How many contacts have no consent row at all for a channel.
 *
 * A separate question from any one contact's history, and the one a compliance
 * review opens with.
 */
export function useMissingConsentCount(channel: ConsentChannel, enabled = true) {
  return useGatedQuery("crm:contacts:view", {
    queryKey: queryKeys.contactConsent.missing(channel),
    queryFn: () =>
      apiClient.get<{ channel: string; count: number }>("/crm/consent/missing", { channel }),
    staleTime: 5 * 60_000,
    enabled,
  });
}

export interface RecordConsentInput {
  channel: ConsentChannel;
  status: "OPTED_IN" | "OPTED_OUT" | "UNKNOWN";
  legalBasis?: "CONSENT" | "CONTRACT" | "LEGITIMATE_INTEREST" | "LEGAL_OBLIGATION";
  sourceDetail?: string;
  expiresAt?: string | null;
}

/**
 * `source` is not a parameter, and that is the point.
 *
 * The API accepts four sources from an authenticated operator and reserves
 * `UNSUBSCRIBE_LINK` and `WEB_FORM` for the system, because provenance is the
 * field an audit leans on. An operator recording consent on this screen is
 * `USER_ENTRY` and can be nothing else, so the hook states it rather than
 * offering a choice the caller could get wrong — or forge.
 */
export function useRecordConsent() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["contactConsent", "record"] as const,
    mutationFn: ({ contactId, input }: { contactId: number; input: RecordConsentInput }) =>
      apiClient.post<{ success: boolean }>(`/crm/consent/contacts/${contactId}`, {
        ...input,
        source: "USER_ENTRY",
      }),
    onSuccess: (_result, variables) => {
      void qc.invalidateQueries({ queryKey: queryKeys.contactConsent.list(variables.contactId) });
      /* The org-wide gap count moves when any contact gains its first row. */
      void qc.invalidateQueries({ queryKey: queryKeys.contactConsent.all });
    },
  });
}
