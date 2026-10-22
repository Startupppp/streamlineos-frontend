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
