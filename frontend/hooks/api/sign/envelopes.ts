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

/**
 * The Certificate of Completion, which the API has always produced and nothing
 * could fetch.
 *
 * `GET sign/envelopes/:id/certificate` sits beside `/final-pdf` on the same
 * controller, and only `/final-pdf` had a caller. So the signed document was
 * downloadable and the record of HOW it came to be signed -- the audit timeline,
 * each signer's authentication method, the per-document SHA-256 hashes, and the
 * statement that this is tamper evidence rather than a DSC or an Aadhaar eSign
 * -- was reachable only by someone typing the URL. That is the artifact a
 * counterparty asks for in a dispute, so producing it and not handing it over is
 * the whole feature missing rather than a rough edge.
 *
 * A mutation and not a query, matching its sibling: it mints a short-lived
 * signed URL, so caching it would hand back a link that has since expired.
 */
export function useDownloadSignEnvelopeCertificate(id: number) {
  return useMutation({
    mutationKey: ["signEnvelopes", "certificate", id],
    mutationFn: () => apiClient.get<{ url: string }>(`/sign/envelopes/${id}/certificate`),
  });
}
