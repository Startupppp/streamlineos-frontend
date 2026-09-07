"use client";

import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import type { UseMutationOptions, UseQueryOptions } from "@tanstack/react-query";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";
import { useSession } from "next-auth/react";
import { apiClient } from "@/lib/api-client";
import { lazyContract } from "@/lib/api-envelope";
import { useCan } from "@/hooks/api/access";
import { humanResourcesQueryKeys } from "@/lib/query-keys/human-resources";

const emailTemplateLazy = lazyContract(() =>
  import("@/hooks/api/hr/email-templates-schema").then((m) => m.emailTemplateContract),
);
const emailTemplateListLazy = lazyContract(() =>
  import("@/hooks/api/hr/email-templates-schema").then((m) => m.emailTemplateListContract),
);
const emailTemplateAiLazy = lazyContract(() =>
  import("@/hooks/api/hr/email-templates-schema").then((m) => m.emailTemplateAiContract),
);

export interface EmailTemplate {
  id: number;
  name: string;
  subject: string;
  body: string;
  category: string | null;
  variables: string[] | null;
  createdAt: string | null;
}

export interface AiGenerateResult {
  subject: string;
  body: string;
}

export interface CreateEmailTemplateInput {
  name: string;
  subject: string;
  body: string;
  category?: string;
}

export interface UpdateEmailTemplateInput {
  id: number;
  name: string;
  subject: string;
  body: string;
  category?: string;
}

export interface GenerateAiEmailTemplateInput {
  name: string;
  subject?: string;
  category?: string;
}

export function useEmailTemplates(
  options?: Omit<UseQueryOptions<EmailTemplate[], Error>, "queryKey" | "queryFn">,
) {
  const { data: session } = useSession();
  const orgId = session?.orgId ?? "";
  const canManage = useCan("hr:email-templates:manage");
  return useQuery<EmailTemplate[], Error>({
    queryKey: humanResourcesQueryKeys.hr.emailTemplatesList(),
    queryFn: ({ signal }) =>
      apiClient.get<EmailTemplate[]>("/hr/email-templates", undefined, signal, emailTemplateListLazy),
    staleTime: 60_000,
    ...options,
    enabled: canManage && !!orgId && (options?.enabled ?? true),
  });
}

export function useCreateEmailTemplate(
  options?: UseMutationOptions<EmailTemplate, Error, CreateEmailTemplateInput>,
) {
  const qc = useQueryClient();
  return useAuthorizedMutation<EmailTemplate, Error, CreateEmailTemplateInput>("hr:email-templates:manage", {
    mutationKey: ["hr", "email-templates", "create"],
    mutationFn: (data: CreateEmailTemplateInput) =>
      apiClient.post<EmailTemplate>("/hr/email-templates", data, undefined, emailTemplateLazy),
    ...options,
    onSuccess: (data, variables, context, mutFnCtx) => {
      void qc.invalidateQueries({ queryKey: humanResourcesQueryKeys.hr.emailTemplatesList() });
      options?.onSuccess?.(data, variables, context, mutFnCtx);
    },
  });
}

export function useUpdateEmailTemplate(
  options?: UseMutationOptions<EmailTemplate, Error, UpdateEmailTemplateInput>,
) {
  const qc = useQueryClient();
  return useAuthorizedMutation<EmailTemplate, Error, UpdateEmailTemplateInput>("hr:email-templates:manage", {
    mutationKey: ["hr", "email-templates", "update"],
    mutationFn: ({ id, ...data }: UpdateEmailTemplateInput) =>
      apiClient.patch<EmailTemplate>(`/hr/email-templates/${id}`, data, undefined, emailTemplateLazy),
    ...options,
    onSuccess: (data, variables, context, mutFnCtx) => {
      void qc.invalidateQueries({ queryKey: humanResourcesQueryKeys.hr.emailTemplatesList() });
      options?.onSuccess?.(data, variables, context, mutFnCtx);
    },
  });
}

export function useDeleteEmailTemplate(
  options?: UseMutationOptions<{ success: boolean }, Error, number>,
) {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["hr", "email-templates", "delete"],
    mutationFn: (id: number) =>
      apiClient.delete<{ success: boolean }>(`/hr/email-templates/${id}`),
    ...options,
    onSuccess: (data, variables, context, mutFnCtx) => {
      void qc.invalidateQueries({ queryKey: humanResourcesQueryKeys.hr.emailTemplatesList() });
      options?.onSuccess?.(data, variables, context, mutFnCtx);
    },
  });
}

export function useGenerateAiEmailTemplate(
  options?: UseMutationOptions<AiGenerateResult, Error, GenerateAiEmailTemplateInput>,
) {
  return useAuthorizedMutation<AiGenerateResult, Error, GenerateAiEmailTemplateInput>("hr:email-templates:manage", {
    mutationKey: ["hr", "email-templates", "generate-ai"],
    mutationFn: (data: GenerateAiEmailTemplateInput) =>
      apiClient.post<AiGenerateResult>("/hr/email-templates/generate-ai", data, undefined, emailTemplateAiLazy),
    ...options,
  });
}
