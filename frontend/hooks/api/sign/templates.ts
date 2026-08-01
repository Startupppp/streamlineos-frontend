"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import type { SignEnvelope, SignTemplate } from "@/types/sign";

export interface CreateSignTemplateInput {
  name: string;
  description?: string;
  category?: string;
  templateJson: Record<string, unknown>;
}

export interface CreateEnvelopeFromTemplateInput {
  title?: string;
  recipients: { roleName: string; name: string; email?: string; phone?: string }[];
  sourceModule?: string;
  sourceEntityType?: string;
  sourceEntityId?: string;
}

export interface PublishPublicFormInput {
  slug: string;
  accessCode?: string;
  maxSubmissions?: number;
  expiresAt?: string;
  completionRedirectUrl?: string;
  embedAllowed?: boolean;
}

export function useSignTemplates() {
  return useQuery({
    queryKey: queryKeys.signTemplates.list(),
    queryFn: () => apiClient.get<SignTemplate[]>("/sign/templates"),
    staleTime: 30_000,
  });
}

export function useSaveEnvelopeAsTemplate(envelopeId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["signTemplates", "save-as-template", envelopeId],
    mutationFn: (name: string) => apiClient.post<SignTemplate>(`/sign/envelopes/${envelopeId}/save-as-template`, { name }),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.signTemplates.all }),
  });
}

export function useUpdateSignTemplate(id: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["signTemplates", "update", id],
    mutationFn: (input: Partial<CreateSignTemplateInput> & { status?: "draft" | "published" | "archived" }) =>
      apiClient.patch<SignTemplate>(`/sign/templates/${id}`, input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.signTemplates.detail(id) });
      qc.invalidateQueries({ queryKey: queryKeys.signTemplates.all });
    },
  });
}

export function useDuplicateSignTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["signTemplates", "duplicate"],
    mutationFn: (id: number) => apiClient.post<SignTemplate>(`/sign/templates/${id}/duplicate`),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.signTemplates.all }),
  });
}

export function useCreateEnvelopeFromTemplate(templateId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["signTemplates", "create-envelope", templateId],
    mutationFn: (input: CreateEnvelopeFromTemplateInput) => apiClient.post<SignEnvelope>(`/sign/templates/${templateId}/create-envelope`, input),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.signEnvelopes.all }),
  });
}
