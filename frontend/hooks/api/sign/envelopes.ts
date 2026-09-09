"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import type { SignAuditEvent, SignEnvelope, SignEnvelopeFull } from "@/types/sign";

export interface CreateSignEnvelopeInput {
  title: string;
  subject?: string;
  message?: string;
  routingMode?: "parallel" | "sequential" | "mixed";
  ccTiming?: "on_send" | "on_complete";
  allowDecline?: boolean;
  sourceModule?: string;
  sourceEntityType?: string;
  sourceEntityId?: string;
  expiresAt?: string;
  reminderEnabled?: boolean;
  reminderFirstAfterDays?: number;
  reminderRepeatDays?: number;
  reminderMaxCount?: number;
}

export interface EnvelopeValidationResult {
  valid: boolean;
  errors: string[];
}

export interface CorrectSignEnvelopeInput {
  reason?: string;
  recipients?: { id: number; name?: string; email?: string; phone?: string }[];
}

export interface ExtendSignEnvelopeExpirationInput {
  expiresAt: string;
}

function invalidateEnvelope(qc: ReturnType<typeof useQueryClient>, id: number) {
  qc.invalidateQueries({ queryKey: queryKeys.signEnvelopes.detail(id) });
  qc.invalidateQueries({ queryKey: queryKeys.signEnvelopes.all });
}

export function useSignEnvelopes(params?: { status?: string; page?: number; limit?: number }) {
  return useQuery({
    queryKey: queryKeys.signEnvelopes.list(params),
    queryFn: () => apiClient.get<SignEnvelope[]>("/sign/envelopes", params),
    staleTime: 30_000,
  });
}

export function useSignEnvelope(id: number | undefined) {
  return useQuery({
    queryKey: queryKeys.signEnvelopes.detail(id ?? 0),
    queryFn: () => apiClient.get<SignEnvelopeFull>(`/sign/envelopes/${id}`),
    enabled: id !== undefined,
    staleTime: 15_000,
  });
}

export function useCreateSignEnvelope() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["signEnvelopes", "create"],
    mutationFn: (input: CreateSignEnvelopeInput) => apiClient.post<SignEnvelope>("/sign/envelopes", input),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.signEnvelopes.all }),
  });
}

export function useUpdateSignEnvelope(id: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["signEnvelopes", "update", id],
    mutationFn: (input: Partial<CreateSignEnvelopeInput>) => apiClient.patch<SignEnvelope>(`/sign/envelopes/${id}`, input),
    onSuccess: () => invalidateEnvelope(qc, id),
  });
}

export function useDeleteSignEnvelope() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["signEnvelopes", "delete"],
    mutationFn: (id: number) => apiClient.delete<{ success: true }>(`/sign/envelopes/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.signEnvelopes.all }),
  });
}

export function useValidateSignEnvelope(id: number) {
  return useMutation({
    mutationKey: ["signEnvelopes", "validate", id],
    mutationFn: () => apiClient.post<EnvelopeValidationResult>(`/sign/envelopes/${id}/validate`),
  });
}

export function useSendSignEnvelope(id: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["signEnvelopes", "send", id],
    mutationFn: () => apiClient.post<SignEnvelope>(`/sign/envelopes/${id}/send`),
    onSuccess: () => invalidateEnvelope(qc, id),
  });
}

export function useVoidSignEnvelope(id: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["signEnvelopes", "void", id],
    mutationFn: (reason: string) => apiClient.post<SignEnvelope>(`/sign/envelopes/${id}/void`, { reason }),
    onSuccess: () => invalidateEnvelope(qc, id),
  });
}

export function useCorrectSignEnvelope(id: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["signEnvelopes", "correct", id],
    mutationFn: (input: CorrectSignEnvelopeInput) => apiClient.post<SignEnvelopeFull>(`/sign/envelopes/${id}/correct`, input),
    onSuccess: () => {
      invalidateEnvelope(qc, id);
      qc.invalidateQueries({ queryKey: queryKeys.signEnvelopes.audit(id) });
    },
  });
}

export function useExtendSignEnvelopeExpiration(id: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["signEnvelopes", "extend-expiration", id],
    mutationFn: (input: ExtendSignEnvelopeExpirationInput) =>
      apiClient.post<SignEnvelope>(`/sign/envelopes/${id}/extend-expiration`, input),
    onSuccess: () => {
      invalidateEnvelope(qc, id);
      qc.invalidateQueries({ queryKey: queryKeys.signEnvelopes.audit(id) });
    },
  });
}

export function useResendSignEnvelope(id: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["signEnvelopes", "resend", id],
    mutationFn: () => apiClient.post<{ resentCount: number }>(`/sign/envelopes/${id}/resend`),
    onSuccess: () => invalidateEnvelope(qc, id),
  });
}

export function useSendSignEnvelopeReminder(id: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["signEnvelopes", "send-reminder", id],
    mutationFn: () => apiClient.post<{ remindedCount: number }>(`/sign/envelopes/${id}/send-reminder`),
    onSuccess: () => invalidateEnvelope(qc, id),
  });
}

export function useSignEnvelopeAudit(id: number | undefined) {
  return useQuery({
    queryKey: queryKeys.signEnvelopes.audit(id ?? 0),
    queryFn: () => apiClient.get<SignAuditEvent[]>(`/sign/envelopes/${id}/audit`),
    enabled: id !== undefined,
    staleTime: 15_000,
  });
}

export function useDownloadSignEnvelopeFinalPdf(id: number) {
  return useMutation({
    mutationKey: ["signEnvelopes", "final-pdf", id],
    mutationFn: () => apiClient.get<{ url: string }>(`/sign/envelopes/${id}/final-pdf`),
  });
}
