"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { growthAndSignQueryKeys } from "@/lib/query-keys/growth-and-sign";
import type { SignAuthMethod, SignRecipient, SignRecipientType } from "@/types/sign";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";

export interface CreateSignRecipientInput {
  roleName: string;
  recipientType?: SignRecipientType;
  name: string;
  email?: string;
  phone?: string;
  routingOrder?: number;
  authMethod?: SignAuthMethod;
  accessCode?: string;
}

function invalidateEnvelope(qc: ReturnType<typeof useQueryClient>, envelopeId: number) {
  qc.invalidateQueries({ queryKey: growthAndSignQueryKeys.signEnvelopes.detail(envelopeId) });
}

export function useAddSignRecipient(envelopeId: number) {
  const qc = useQueryClient();
  return useAuthorizedMutation("sign:envelope:create", {
    mutationKey: ["signRecipients", "add", envelopeId],
    mutationFn: (input: CreateSignRecipientInput) => apiClient.post<SignRecipient>(`/sign/envelopes/${envelopeId}/recipients`, input),
    onSuccess: () => invalidateEnvelope(qc, envelopeId),
  });
}

export function useDeleteSignRecipient(envelopeId: number) {
  const qc = useQueryClient();
  return useAuthorizedMutation("sign:envelope:create", {
    mutationKey: ["signRecipients", "delete", envelopeId],
    mutationFn: (id: number) => apiClient.delete<{ success: true }>(`/sign/recipients/${id}`),
    onSuccess: () => invalidateEnvelope(qc, envelopeId),
  });
}
