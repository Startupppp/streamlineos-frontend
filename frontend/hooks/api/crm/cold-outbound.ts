"use client";

import { useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import { useGatedQuery } from "@/hooks/api/gated-query";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";
import { useAuthorizedIdempotentMutation } from "@/hooks/api/inventory/use-idempotent-mutation";
import type {
  ColdOutboundOverview,
  SendingDomain,
  SendingDomainPurpose,
} from "@/types/crm/autonomy";

/**
 * The cold track's operator controls.
 *
 * Its own file rather than a section of `autonomy.ts`, because these are the
 * only autonomy endpoints that read under `crm:autonomy:manage` rather than
 * `:view` — the overview carries the DNS token that proves domain ownership and
 * the reason the send path halted itself, neither of which belongs to the
 * salesperson watching the decision feed.
 */

/** Nothing here is optimistic: every answer is a fact about DNS or the server's own state. */
function useColdOutboundInvalidate() {
  const queryClient = useQueryClient();
  return () =>
    void queryClient.invalidateQueries({ queryKey: queryKeys.crm.autonomyColdOutbound() });
}

export function useColdOutbound() {
  return useGatedQuery("crm:autonomy:manage", {
    queryKey: queryKeys.crm.autonomyColdOutbound(),
    queryFn: ({ signal }) =>
      apiClient.get<ColdOutboundOverview>("/crm/autonomy/cold-outbound", undefined, signal),
    staleTime: 30_000,
  });
}

/**
 * A stable idempotency key per domain, rather than the per-request one the API
 * client mints.
 *
 * Registering is guarded by two unique indexes, so a retried timeout would come
 * back as a 409 on a domain the operator did in fact register. Keyed on what is
 * being claimed, a retry replays the original answer instead — and there is no
 * un-register, so a second registration of the same domain is a duplicate in
 * every case, never a new intent.
 */
export function useRegisterSendingDomain() {
  const invalidate = useColdOutboundInvalidate();

  return useAuthorizedMutation("crm:autonomy:manage", {
    mutationKey: ["crm", "autonomy", "cold-outbound", "register-domain"],
    mutationFn: (input: { domain: string; purpose: SendingDomainPurpose }) =>
      apiClient.post<SendingDomain>("/crm/autonomy/cold-outbound/domains", input, {
        headers: { "Idempotency-Key": `cold-domain:${input.purpose}:${input.domain}` },
      }),
    onSuccess: invalidate,
  });
}

/**
 * Ask the server to read DNS again.
 *
 * Deliberately not idempotency-keyed: re-checking a domain whose TXT record has
 * just propagated is the normal way to use this, and replaying the first
 * "not published yet" would strand the operator on an answer that is no longer
 * true.
 */
export function useVerifySendingDomain() {
  const invalidate = useColdOutboundInvalidate();

  return useAuthorizedMutation("crm:autonomy:manage", {
    mutationKey: ["crm", "autonomy", "cold-outbound", "verify-domain"],
    mutationFn: (sendingDomainId: string) =>
      apiClient.post<{ verified: boolean; verifiedAt: string }>(
        `/crm/autonomy/cold-outbound/domains/${sendingDomainId}/verify`,
        {},
      ),
    onSuccess: invalidate,
  });
}

export function useStartDomainWarmup() {
  const invalidate = useColdOutboundInvalidate();

  return useAuthorizedIdempotentMutation<{ warmupStartedAt: string }, Error, string>(
    "crm:autonomy:manage",
    {
      mutationKey: ["crm", "autonomy", "cold-outbound", "start-warmup"],
      mutationFn: (sendingDomainId, idempotencyKey) =>
        apiClient.post<{ warmupStartedAt: string }>(
          `/crm/autonomy/cold-outbound/domains/${sendingDomainId}/warmup`,
          {},
          { headers: { "Idempotency-Key": idempotencyKey } },
        ),
      onSuccess: invalidate,
    },
  );
}

export function useSetColdTrack() {
  const invalidate = useColdOutboundInvalidate();

  return useAuthorizedIdempotentMutation<{ enabled: boolean }, Error, boolean>(
    "crm:autonomy:manage",
    {
      mutationKey: ["crm", "autonomy", "cold-outbound", "set-track"],
      mutationFn: (enabled, idempotencyKey) =>
        apiClient.post<{ enabled: boolean }>(
          "/crm/autonomy/cold-outbound/track",
          { enabled },
          { headers: { "Idempotency-Key": idempotencyKey } },
        ),
      onSuccess: invalidate,
    },
  );
}

/** Clearing a halt the send path imposed on itself, which nothing else clears. */
export function useResumeColdTrack() {
  const invalidate = useColdOutboundInvalidate();

  return useAuthorizedIdempotentMutation<{ resumed: boolean }, Error, void>(
    "crm:autonomy:manage",
    {
      mutationKey: ["crm", "autonomy", "cold-outbound", "resume"],
      mutationFn: (_input, idempotencyKey) =>
        apiClient.post<{ resumed: boolean }>(
          "/crm/autonomy/cold-outbound/resume",
          {},
          { headers: { "Idempotency-Key": idempotencyKey } },
        ),
      onSuccess: invalidate,
    },
  );
}
