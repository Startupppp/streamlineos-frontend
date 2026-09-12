"use client";

import { useQueryClient, type UseQueryOptions } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { growthAndSignQueryKeys } from "@/lib/query-keys/growth-and-sign";
import { useGatedQuery } from "@/hooks/api/gated-query";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";
import type { SignCertificate, SignCertificateResponse } from "@/types/sign";

export function useSignEnvelopeCertificate(
  envelopeId: number | undefined,
  options?: Omit<UseQueryOptions<SignCertificateResponse, Error>, "queryKey" | "queryFn">,
) {
  return useGatedQuery("sign:certificate:download", {
    queryKey: growthAndSignQueryKeys.signEnvelopes.certificate(envelopeId ?? 0),
    queryFn: () => apiClient.get<SignCertificateResponse>(`/sign/envelopes/${envelopeId}/certificate`),
    staleTime: 60_000,
    ...options,
    enabled: envelopeId !== undefined && (options?.enabled ?? true),
  });
}

export function useRegenerateSignCertificate(envelopeId: number) {
  const qc = useQueryClient();
  return useAuthorizedMutation("sign:admin:manage", {
    mutationKey: ["signCertificates", "regenerate", envelopeId],
    mutationFn: () => apiClient.post<SignCertificate>(`/sign/envelopes/${envelopeId}/regenerate-certificate`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: growthAndSignQueryKeys.signEnvelopes.certificate(envelopeId) });
      qc.invalidateQueries({ queryKey: growthAndSignQueryKeys.signEnvelopes.audit(envelopeId) });
    },
  });
}
