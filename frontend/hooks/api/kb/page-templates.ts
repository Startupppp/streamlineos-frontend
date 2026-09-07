"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { lazyContract } from "@/lib/api-envelope";
import { knowledgeAndSurveysQueryKeys } from "@/lib/query-keys/knowledge-and-surveys";
import { useCan } from "@/hooks/api/access";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";

export type KbPageTemplate = {
  id: number;
  orgId: string;
  name: string;
  icon: string | null;
  description: string | null;
  content: Record<string, unknown> | null;
  createdById: string | null;
  createdAt: string;
  updatedAt: string;
};

export type CreateKbPageTemplateInput = {
  fromPageId: number;
  name: string;
  description?: string;
};

const kbPageTemplateListContract = lazyContract(() =>
  import("@/hooks/api/kb/kb-templates-schema").then((m) => m.kbPageTemplateListContract),
);

const kbPageTemplateSingleContract = lazyContract(() =>
  import("@/hooks/api/kb/kb-templates-schema").then((m) => m.kbPageTemplateSingleContract),
);

const kbPageTemplateSuccessContract = lazyContract(() =>
  import("@/hooks/api/kb/kb-templates-schema").then((m) => m.kbPageTemplateSuccessContract),
);

export function useKbPageTemplates() {
  const canViewPages = useCan("kb:pages:view");
  return useQuery({
    queryKey: knowledgeAndSurveysQueryKeys.kb.pageTemplates(),
    queryFn: ({ signal }) => apiClient.get<KbPageTemplate[]>("/kb/page-templates", undefined, signal, kbPageTemplateListContract),
    enabled: canViewPages,
    staleTime: 300_000,
  });
}

export function useCreateKbPageTemplate() {
  const qc = useQueryClient();
  return useAuthorizedMutation("kb:templates:manage", {
    mutationKey: ["kb", "pageTemplates", "create"],
    mutationFn: (input: CreateKbPageTemplateInput) =>
      apiClient.post<KbPageTemplate>("/kb/page-templates", input, undefined, kbPageTemplateSingleContract),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: knowledgeAndSurveysQueryKeys.kb.pageTemplates() });
    },
  });
}

export function useDeleteKbPageTemplate() {
  const qc = useQueryClient();
  return useAuthorizedMutation("kb:templates:manage", {
    mutationKey: ["kb", "pageTemplates", "delete"],
    mutationFn: (templateId: number) =>
      apiClient.delete<{ success: boolean }>(`/kb/page-templates/${templateId}`, undefined, undefined, kbPageTemplateSuccessContract),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: knowledgeAndSurveysQueryKeys.kb.pageTemplates() });
    },
  });
}
