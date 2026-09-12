"use client";

import { useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { lazyContract } from "@/lib/api-envelope";
import type { OffsetPage } from "@/hooks/api/offset-page-schema";
import { growthAndSignQueryKeys } from "@/lib/query-keys/growth-and-sign";
import type { SignAuditEvent, SignEnvelope, SignEnvelopeFull } from "@/types/sign";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";
import { useGatedQuery } from "@/hooks/api/gated-query";

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

const signEnvelopesListContract = lazyContract(() =>
  import("@/hooks/api/sign/sign-schema").then((m) => m.signEnvelopesListContract),
);

const signEnvelopeFullContract = lazyContract(() =>
  import("@/hooks/api/sign/sign-schema").then((m) => m.signEnvelopeFullContract),
);

const signEnvelopeMutationContract = lazyContract(() =>
  import("@/hooks/api/sign/sign-schema").then((m) => m.signEnvelopeMutationContract),
);

const signSuccessContract = lazyContract(() =>
  import("@/hooks/api/sign/sign-schema").then((m) => m.signSuccessContract),
);

const signEnvelopeValidateContract = lazyContract(() =>
  import("@/hooks/api/sign/sign-schema").then((m) => m.signEnvelopeValidateContract),
);

const signEnvelopeResendContract = lazyContract(() =>
  import("@/hooks/api/sign/sign-schema").then((m) => m.signEnvelopeResendContract),
);

const signEnvelopeReminderContract = lazyContract(() =>
  import("@/hooks/api/sign/sign-schema").then((m) => m.signEnvelopeReminderContract),
);

const signAuditEventsListContract = lazyContract(() =>
  import("@/hooks/api/sign/sign-schema").then((m) => m.signAuditEventsListContract),
);

const signFinalPdfUrlContract = lazyContract(() =>
  import("@/hooks/api/sign/sign-schema").then((m) => m.signFinalPdfUrlContract),
);

function invalidateEnvelope(qc: ReturnType<typeof useQueryClient>, id: number) {
  qc.invalidateQueries({ queryKey: growthAndSignQueryKeys.signEnvelopes.detail(id) });
  qc.invalidateQueries({ queryKey: growthAndSignQueryKeys.signEnvelopes.all });
  qc.invalidateQueries({ queryKey: growthAndSignQueryKeys.signEnvelopes.audit(id) });
}

export function useSignEnvelopes(params?: { status?: string; page?: number; limit?: number }) {
  return useGatedQuery("sign:envelope:view", {
    queryKey: growthAndSignQueryKeys.signEnvelopes.list(params),
    queryFn: ({ signal }) =>
      apiClient.get<OffsetPage<SignEnvelope>>("/sign/envelopes", params, signal, signEnvelopesListContract),
    staleTime: 30_000,
  });
}

export function useSignEnvelope(id: number | undefined) {
  return useGatedQuery("sign:envelope:view", {
    queryKey: growthAndSignQueryKeys.signEnvelopes.detail(id ?? 0),
    queryFn: ({ signal }) => apiClient.get<SignEnvelopeFull>(`/sign/envelopes/${id}`, undefined, signal, signEnvelopeFullContract),
    enabled: id !== undefined,
    staleTime: 15_000,
  });
}

export function useCreateSignEnvelope() {
  const qc = useQueryClient();
  return useAuthorizedMutation("sign:envelope:create", {
    mutationKey: ["signEnvelopes", "create"],
    mutationFn: (input: CreateSignEnvelopeInput) => apiClient.post<SignEnvelope>("/sign/envelopes", input, undefined, signEnvelopeMutationContract),
    onSuccess: () => qc.invalidateQueries({ queryKey: growthAndSignQueryKeys.signEnvelopes.all }),
  });
}

export function useUpdateSignEnvelope(id: number) {
  const qc = useQueryClient();
  return useAuthorizedMutation("sign:envelope:create", {
    mutationKey: ["signEnvelopes", "update", id],
    mutationFn: (input: Partial<CreateSignEnvelopeInput>) => apiClient.patch<SignEnvelope>(`/sign/envelopes/${id}`, input, undefined, signEnvelopeMutationContract),
    onSuccess: () => invalidateEnvelope(qc, id),
  });
}

export function useDeleteSignEnvelope() {
  const qc = useQueryClient();
  return useAuthorizedMutation("sign:envelope:create", {
    mutationKey: ["signEnvelopes", "delete"],
    mutationFn: (id: number) => apiClient.delete<{ success: true }>(`/sign/envelopes/${id}`, undefined, undefined, signSuccessContract),
    onSuccess: () => qc.invalidateQueries({ queryKey: growthAndSignQueryKeys.signEnvelopes.all }),
  });
}

export function useValidateSignEnvelope(id: number) {
  return useAuthorizedMutation("sign:envelope:create", {
    mutationKey: ["signEnvelopes", "validate", id],
    mutationFn: () => apiClient.post<EnvelopeValidationResult>(`/sign/envelopes/${id}/validate`, undefined, undefined, signEnvelopeValidateContract),
  });
}

export function useSendSignEnvelope(id: number) {
  const qc = useQueryClient();
  return useAuthorizedMutation("sign:envelope:send", {
    mutationKey: ["signEnvelopes", "send", id],
    mutationFn: () => apiClient.post<SignEnvelope>(`/sign/envelopes/${id}/send`, undefined, undefined, signEnvelopeMutationContract),
    onSuccess: () => invalidateEnvelope(qc, id),
  });
}

export function useVoidSignEnvelope(id: number) {
  const qc = useQueryClient();
  return useAuthorizedMutation("sign:envelope:void", {
    mutationKey: ["signEnvelopes", "void", id],
    mutationFn: (reason: string) => apiClient.post<SignEnvelope>(`/sign/envelopes/${id}/void`, { reason }, undefined, signEnvelopeMutationContract),
    onSuccess: () => invalidateEnvelope(qc, id),
  });
}

export function useCorrectSignEnvelope(id: number) {
  const qc = useQueryClient();
  return useAuthorizedMutation("sign:envelope:correct", {
    mutationKey: ["signEnvelopes", "correct", id],
    mutationFn: (input: CorrectSignEnvelopeInput) => apiClient.post<SignEnvelopeFull>(`/sign/envelopes/${id}/correct`, input),
    onSuccess: () => {
      invalidateEnvelope(qc, id);
      qc.invalidateQueries({ queryKey: growthAndSignQueryKeys.signEnvelopes.audit(id) });
    },
  });
}

export function useExtendSignEnvelopeExpiration(id: number) {
  const qc = useQueryClient();
  return useAuthorizedMutation("sign:envelope:correct", {
    mutationKey: ["signEnvelopes", "extend-expiration", id],
    mutationFn: (input: ExtendSignEnvelopeExpirationInput) =>
      apiClient.post<SignEnvelope>(`/sign/envelopes/${id}/extend-expiration`, input),
    onSuccess: () => {
      invalidateEnvelope(qc, id);
      qc.invalidateQueries({ queryKey: growthAndSignQueryKeys.signEnvelopes.audit(id) });
    },
  });
}

export function useResendSignEnvelope(id: number) {
  const qc = useQueryClient();
  return useAuthorizedMutation("sign:envelope:send", {
    mutationKey: ["signEnvelopes", "resend", id],
    mutationFn: () => apiClient.post<{ resentCount: number }>(`/sign/envelopes/${id}/resend`, undefined, undefined, signEnvelopeResendContract),
    onSuccess: () => invalidateEnvelope(qc, id),
  });
}

export function useSendSignEnvelopeReminder(id: number) {
  const qc = useQueryClient();
  return useAuthorizedMutation("sign:envelope:send", {
    mutationKey: ["signEnvelopes", "send-reminder", id],
    mutationFn: () => apiClient.post<{ remindedCount: number }>(`/sign/envelopes/${id}/send-reminder`, undefined, undefined, signEnvelopeReminderContract),
    onSuccess: () => invalidateEnvelope(qc, id),
  });
}

export function useSignEnvelopeAudit(id: number | undefined) {
  return useGatedQuery("sign:audit:view", {
    queryKey: growthAndSignQueryKeys.signEnvelopes.audit(id ?? 0),
    queryFn: ({ signal }) => apiClient.get<SignAuditEvent[]>(`/sign/envelopes/${id}/audit`, undefined, signal, signAuditEventsListContract),
    enabled: id !== undefined,
    staleTime: 15_000,
  });
}

export function useDownloadSignEnvelopeFinalPdf(id: number) {
  return useAuthorizedMutation("sign:certificate:download", {
    mutationKey: ["signEnvelopes", "final-pdf", id],
    mutationFn: () => apiClient.get<{ url: string }>(`/sign/envelopes/${id}/final-pdf`, undefined, undefined, signFinalPdfUrlContract),
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
  return useAuthorizedMutation("sign:certificate:download", {
    mutationKey: ["signEnvelopes", "certificate", id],
    mutationFn: () => apiClient.get<{ url: string }>(`/sign/envelopes/${id}/certificate`),
  });
}
