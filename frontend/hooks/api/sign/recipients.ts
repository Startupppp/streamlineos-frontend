"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import type { SignAuthMethod, SignRecipient, SignRecipientType } from "@/types/sign";

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
  qc.invalidateQueries({ queryKey: queryKeys.signEnvelopes.detail(envelopeId) });
}

export function useAddSignRecipient(envelopeId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["signRecipients", "add", envelopeId],
    mutationFn: (input: CreateSignRecipientInput) => apiClient.post<SignRecipient>(`/sign/envelopes/${envelopeId}/recipients`, input),
    onSuccess: () => invalidateEnvelope(qc, envelopeId),
  });
}

export function useUpdateSignRecipient(envelopeId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["signRecipients", "update", envelopeId],
    mutationFn: ({ id, input }: { id: number; input: Partial<CreateSignRecipientInput> }) =>
      apiClient.patch<SignRecipient>(`/sign/recipients/${id}`, input),
    onSuccess: () => invalidateEnvelope(qc, envelopeId),
  });
}

export function useDeleteSignRecipient(envelopeId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["signRecipients", "delete", envelopeId],
    mutationFn: (id: number) => apiClient.delete<{ success: true }>(`/sign/recipients/${id}`),
    onSuccess: () => invalidateEnvelope(qc, envelopeId),
  });
}
