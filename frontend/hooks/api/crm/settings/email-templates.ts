"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import { useGatedQuery } from "@/hooks/api/gated-query";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";
import { lazyContract } from "@/lib/api-envelope";

const emailTemplatesLazy = lazyContract(() =>
  import("@/hooks/api/crm/settings/email-templates-schema").then((m) => m.emailTemplatesListContract),
);

export interface EmailTemplate {
  id: number;
  orgId: string;
  name: string;
  subject: string;
  body: string;
  createdAt: string | null;
  updatedAt: string | null;
}

interface CreateEmailTemplateInput {
  name: string;
  subject: string;
  body: string;
}

export interface UpdateEmailTemplateInput {
  id: number;
  name?: string;
  subject?: string;
  body?: string;
}

export function useEmailTemplates(params?: { limit?: number; offset?: number }) {
  return useGatedQuery("crm:email-templates:manage", {
    queryKey: queryKeys.crmSettings.emailTemplates(params as Record<string, unknown>),
    queryFn: ({ signal }) =>
      apiClient.get<EmailTemplate[]>("/crm/email-templates", params as Record<string, unknown>, signal, emailTemplatesLazy),
    staleTime: 2 * 60_000,
  });
}

export function useCreateEmailTemplate() {
  const qc = useQueryClient();
  return useAuthorizedMutation("crm:email-templates:manage", {
    mutationKey: ["crm-settings", "email-templates", "create"],
    mutationFn: (input: CreateEmailTemplateInput) =>
      apiClient.post<EmailTemplate>("/crm/email-templates", input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.crmSettings.all });
    },
  });
}

export function useUpdateEmailTemplate() {
  const qc = useQueryClient();
  return useAuthorizedMutation("crm:email-templates:manage", {
    mutationKey: ["crm-settings", "email-templates", "update"],
    mutationFn: ({ id, ...data }: UpdateEmailTemplateInput) =>
      apiClient.patch<EmailTemplate>(`/crm/email-templates/${id}`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.crmSettings.all });
    },
  });
}

export function useDeleteEmailTemplate() {
  const qc = useQueryClient();
  return useAuthorizedMutation("crm:email-templates:manage", {
    mutationKey: ["crm-settings", "email-templates", "delete"],
    mutationFn: (id: number) =>
      apiClient.delete<{ success: boolean }>(`/crm/email-templates/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.crmSettings.all });
    },
  });
}
