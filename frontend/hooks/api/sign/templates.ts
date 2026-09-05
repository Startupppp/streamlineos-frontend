"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { growthAndSignQueryKeys } from "@/lib/query-keys/growth-and-sign";
import type { SignEnvelope, SignTemplate } from "@/types/sign";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";
import { useGatedQuery } from "@/hooks/api/gated-query";

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

export function useSignTemplates() {
  return useGatedQuery("sign:template:manage", {
    queryKey: growthAndSignQueryKeys.signTemplates.list(),
    queryFn: ({ signal }) => apiClient.get<SignTemplate[]>("/sign/templates", undefined, signal),
    staleTime: 30_000,
  });
}

export function useSaveEnvelopeAsTemplate(envelopeId: number) {
  const qc = useQueryClient();
  return useAuthorizedMutation("sign:template:manage", {
    mutationKey: ["signTemplates", "save-as-template", envelopeId],
    mutationFn: (name: string) => apiClient.post<SignTemplate>(`/sign/envelopes/${envelopeId}/save-as-template`, { name }),
    onSuccess: () => qc.invalidateQueries({ queryKey: growthAndSignQueryKeys.signTemplates.all }),
  });
}

export function useUpdateSignTemplate(id: number) {
  const qc = useQueryClient();
  return useAuthorizedMutation("sign:template:manage", {
    mutationKey: ["signTemplates", "update", id],
    mutationFn: (input: Partial<CreateSignTemplateInput> & { status?: "draft" | "published" | "archived" }) =>
      apiClient.patch<SignTemplate>(`/sign/templates/${id}`, input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: growthAndSignQueryKeys.signTemplates.detail(id) });
      qc.invalidateQueries({ queryKey: growthAndSignQueryKeys.signTemplates.all });
    },
  });
}

export function useDuplicateSignTemplate() {
  const qc = useQueryClient();
  return useAuthorizedMutation("sign:template:manage", {
    mutationKey: ["signTemplates", "duplicate"],
    mutationFn: (id: number) => apiClient.post<SignTemplate>(`/sign/templates/${id}/duplicate`),
    onSuccess: () => qc.invalidateQueries({ queryKey: growthAndSignQueryKeys.signTemplates.all }),
  });
}

export function useCreateEnvelopeFromTemplate(templateId: number) {
  const qc = useQueryClient();
  return useAuthorizedMutation("sign:envelope:create", {
    mutationKey: ["signTemplates", "create-envelope", templateId],
    mutationFn: (input: CreateEnvelopeFromTemplateInput) => apiClient.post<SignEnvelope>(`/sign/templates/${templateId}/create-envelope`, input),
    onSuccess: () => qc.invalidateQueries({ queryKey: growthAndSignQueryKeys.signEnvelopes.all }),
  });
}
