"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import { useGatedQuery } from "@/hooks/api/gated-query";
import type { ConsentChannel } from "@/lib/renderer/crm/contact-consent-layout";

export interface ContactConsentRow {
  /* A uuid. An earlier version of this interface said `number` and was wrong. */
  id: string;
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

export interface ContactConsentEvent {
  id: string;
  contactId: number;
  channel: ConsentChannel;
  /* Null on the first event for a channel: there was no previous position. */
  fromStatus: "OPTED_IN" | "OPTED_OUT" | "UNKNOWN" | null;
  toStatus: "OPTED_IN" | "OPTED_OUT" | "UNKNOWN";
  legalBasis: "CONSENT" | "CONTRACT" | "LEGITIMATE_INTEREST" | "LEGAL_OBLIGATION" | null;
  source: "USER_ENTRY" | "IMPORT" | "API" | "ENRICHMENT" | "UNSUBSCRIBE_LINK" | "WEB_FORM";
  sourceDetail: string | null;
  recordedByUserId: string | null;
  /* Null for a system event, and null for a colleague who has since left. */
  recordedByName: string | null;
  createdAt: string;
}

/** Matches the API default; the API caps it at 100. */
export const CONSENT_EVENTS_LIMIT = 20;

/**
 * The evidence trail: every change, not the current position.
 *
 * `useContactConsent` above answers "what may we send them now" — at most one
 * row per channel, because the unique index allows one and the write upserts.
 * This answers "when did that become true, on what basis, at whose hand", which
 * is the question a DPDP or GDPR review actually asks. The rows were being
 * written on every change from the beginning and no service method or route
 * read them, so the product held the evidence and could not produce it.
 *
 * Not fetched until the history is opened: the trail is unbounded and most
 * visits to a contact never ask for it.
 */
export function useContactConsentEvents(contactId: number, enabled: boolean) {
  return useGatedQuery("crm:contacts:view", {
    queryKey: queryKeys.contactConsent.events(contactId, CONSENT_EVENTS_LIMIT),
    queryFn: () =>
      apiClient.get<ContactConsentEvent[]>(`/crm/consent/contacts/${contactId}/events`, {
        limit: CONSENT_EVENTS_LIMIT,
      }),
    staleTime: 2 * 60_000,
    enabled: enabled && contactId > 0,
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
