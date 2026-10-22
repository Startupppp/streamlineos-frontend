"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import { useGatedQuery } from "@/hooks/api/gated-query";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";
import type {
  ConsentChannel,
  ConsentLegalBasis,
  ConsentStatus,
} from "@/lib/renderer/crm/contact-consent-layout";

export interface ContactConsentRow {
  id: string;
  contactId: number;
  channel: ConsentChannel;
  status: ConsentStatus;
  legalBasis: ConsentLegalBasis | null;
  source: "USER_ENTRY" | "IMPORT" | "API" | "ENRICHMENT" | "UNSUBSCRIBE_LINK" | "WEB_FORM";
  sourceDetail: string | null;
  capturedAt: string;
  expiresAt: string | null;
  recordedByUserId: string | null;
}

export function useContactConsent(contactId: number) {
  return useGatedQuery("crm:contacts:view", {
    queryKey: queryKeys.contactConsent.list(contactId),
    queryFn: ({ signal }) =>
      apiClient.get<ContactConsentRow[]>(`/crm/consent/contacts/${contactId}`, undefined, signal),
    staleTime: 2 * 60_000,
    enabled: contactId > 0,
  });
}

export function useMissingConsentCount(channel: ConsentChannel, enabled = true) {
  return useGatedQuery("crm:contacts:view", {
    queryKey: queryKeys.contactConsent.missing(channel),
    queryFn: ({ signal }) =>
      apiClient.get<{ channel: string; count: number }>(
        "/crm/consent/missing",
        { channel },
        signal,
      ),
    staleTime: 5 * 60_000,
    enabled,
  });
}

export interface ContactConsentEvent {
  id: string;
  contactId: number;
  channel: ConsentChannel;
  fromStatus: ConsentStatus | null;
  toStatus: ConsentStatus;
  legalBasis: ConsentLegalBasis | null;
  source: "USER_ENTRY" | "IMPORT" | "API" | "ENRICHMENT" | "UNSUBSCRIBE_LINK" | "WEB_FORM";
  sourceDetail: string | null;
  recordedByUserId: string | null;
  recordedByName: string | null;
  createdAt: string;
}

export const CONSENT_EVENTS_LIMIT = 20;

export function useContactConsentEvents(contactId: number, enabled: boolean) {
  return useGatedQuery("crm:contacts:view", {
    queryKey: queryKeys.contactConsent.events(contactId, CONSENT_EVENTS_LIMIT),
    queryFn: ({ signal }) =>
      apiClient.get<ContactConsentEvent[]>(
        `/crm/consent/contacts/${contactId}/events`,
        { limit: CONSENT_EVENTS_LIMIT },
        signal,
      ),
    staleTime: 2 * 60_000,
    enabled: enabled && contactId > 0,
  });
}

export interface RecordConsentInput {
  channel: ConsentChannel;
  status: ConsentStatus;
  legalBasis?: ConsentLegalBasis;
  sourceDetail?: string;
  expiresAt?: string | null;
}

export function useRecordConsent() {
  const qc = useQueryClient();
  return useAuthorizedMutation("crm:contacts:manage", {
    mutationKey: ["contactConsent", "record"] as const,
    mutationFn: ({ contactId, input }: { contactId: number; input: RecordConsentInput }) =>
      apiClient.post<{ success: boolean }>(`/crm/consent/contacts/${contactId}`, {
        ...input,
        source: "USER_ENTRY",
      }),
    onSuccess: (_result, variables) => {
      void qc.invalidateQueries({ queryKey: queryKeys.contactConsent.list(variables.contactId) });
      void qc.invalidateQueries({ queryKey: queryKeys.contactConsent.all });
    },
  });
}

export function usePublicUnsubscribe(token: string) {
  return useMutation({
    mutationKey: ["crmConsent", "unsubscribe", token] as const,
    mutationFn: () =>
      apiClient.post<{ success: boolean }>("/crm/consent/unsubscribe", { token }),
  });
}
