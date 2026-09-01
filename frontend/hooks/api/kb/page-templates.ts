"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import { useCan } from "@/hooks/api/access";

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

export function useKbPageTemplates() {
  const canViewPages = useCan("kb:pages:view");
  return useQuery({
    queryKey: queryKeys.kb.pageTemplates(),
    queryFn: ({ signal }) => apiClient.get<KbPageTemplate[]>("/kb/page-templates", undefined, signal),
    enabled: canViewPages,
    staleTime: 300_000,
  });
}

export function useCreateKbPageTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["kb", "pageTemplates", "create"],
    mutationFn: (input: CreateKbPageTemplateInput) =>
      apiClient.post<KbPageTemplate>("/kb/page-templates", input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.kb.pageTemplates() });
    },
  });
}

export function useDeleteKbPageTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["kb", "pageTemplates", "delete"],
    mutationFn: (templateId: number) =>
      apiClient.delete<void>(`/kb/page-templates/${templateId}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.kb.pageTemplates() });
    },
  });
}
