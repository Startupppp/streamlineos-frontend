"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";
import { apiClient } from "@/lib/api-client";
import { lazyContract } from "@/lib/api-envelope";
import { humanResourcesQueryKeys } from "@/lib/query-keys/human-resources";
import { useCan, useModuleEnabled } from "@/hooks/api/access";

const documentTemplateLazy = lazyContract(() =>
  import("@/hooks/api/hr/document-templates-schema").then((m) => m.documentTemplateContract),
);
const documentTemplateListLazy = lazyContract(() =>
  import("@/hooks/api/hr/document-templates-schema").then((m) => m.documentTemplateListContract),
);
const successBoolLazy = lazyContract(() =>
  import("@/hooks/api/hr/document-templates-schema").then((m) => m.successBoolContract),
);


export interface DocumentTemplate {
  id: number;
  orgId: string;
  title: string;
  type: string;
  htmlContent: string;
  variables: string[];
  version: number;
  isActive: boolean;
  isDefault: boolean;
  createdBy: string;
  createdAt: string | null;
  updatedAt: string | null;
}

export interface CreateDocumentTemplateInput {
  title: string;
  type: string;
  htmlContent: string;
  variables?: string[];
}

export interface UpdateDocumentTemplateInput {
  title?: string;
  type?: string;
  htmlContent?: string;
  variables?: string[];
}


export function useDocumentTemplates(type?: string) {
  const canView = useCan("hr:documents:view");
  const hrEnabled = useModuleEnabled("hr");
  const params = type ? { type } : undefined;
  return useQuery({
    queryKey: humanResourcesQueryKeys.hr.documentTemplates(params as Record<string, unknown> | undefined),
    queryFn: ({ signal }) =>
      apiClient.get<DocumentTemplate[]>(
        "/hr/documents/templates",
        params as Record<string, unknown> | undefined,
        signal,
        documentTemplateListLazy,
      ),
    staleTime: 2 * 60_000,
    enabled: hrEnabled && canView,
  });
}

export function useDocumentTemplate(templateId: number) {
  const canView = useCan("hr:documents:view");
  const hrEnabled = useModuleEnabled("hr");
  return useQuery({
    queryKey: humanResourcesQueryKeys.hr.documentTemplate(templateId),
    queryFn: ({ signal }) =>
      apiClient.get<DocumentTemplate>(`/hr/documents/templates/${templateId}`, undefined, signal, documentTemplateLazy),
    staleTime: 2 * 60_000,
    enabled: hrEnabled && templateId > 0 && canView,
  });
}

export function useCreateDocumentTemplate() {
  const qc = useQueryClient();
  return useAuthorizedMutation("hr:documents:manage", {
    mutationKey: ["hr", "document-templates", "create"],
    mutationFn: (data: CreateDocumentTemplateInput) =>
      apiClient.post<DocumentTemplate>("/hr/documents/templates", data, undefined, documentTemplateLazy),
    onSuccess: () => qc.invalidateQueries({ queryKey: humanResourcesQueryKeys.hr.documentTemplates() }),
  });
}

export function useUpdateDocumentTemplate() {
  const qc = useQueryClient();
  return useAuthorizedMutation("hr:documents:manage", {
    mutationKey: ["hr", "document-templates", "update"],
    mutationFn: ({ templateId, ...data }: UpdateDocumentTemplateInput & { templateId: number }) =>
      apiClient.put<DocumentTemplate>(`/hr/documents/templates/${templateId}`, data, undefined, documentTemplateLazy),
    onSuccess: (_, variables) => {
      qc.invalidateQueries({ queryKey: humanResourcesQueryKeys.hr.documentTemplates() });
      qc.invalidateQueries({ queryKey: humanResourcesQueryKeys.hr.documentTemplate(variables.templateId) });
    },
  });
}

export function useDeleteDocumentTemplate() {
  const qc = useQueryClient();
  return useAuthorizedMutation("hr:documents:manage", {
    mutationKey: ["hr", "document-templates", "delete"],
    mutationFn: (templateId: number) =>
      apiClient.delete<{ success: boolean }>(`/hr/documents/templates/${templateId}`, undefined, undefined, successBoolLazy),
    onSuccess: () => qc.invalidateQueries({ queryKey: humanResourcesQueryKeys.hr.documentTemplates() }),
  });
}

export function useSetDocumentTemplateDefault() {
  const qc = useQueryClient();
  return useAuthorizedMutation("hr:documents:manage", {
    mutationKey: ["hr", "document-templates", "set-default"],
    mutationFn: ({ templateId, isDefault }: { templateId: number; isDefault: boolean }) =>
      apiClient.patch<DocumentTemplate>(`/hr/documents/templates/${templateId}`, { isDefault }, undefined, documentTemplateLazy),
    onSuccess: () => qc.invalidateQueries({ queryKey: humanResourcesQueryKeys.hr.documentTemplates() }),
  });
}

export function useDocumentTemplateVersions(templateId: number) {
  const canView = useCan("hr:documents:view");
  const hrEnabled = useModuleEnabled("hr");
  return useQuery({
    queryKey: [...humanResourcesQueryKeys.hr.documentTemplate(templateId), "versions"],
    queryFn: ({ signal }) =>
      apiClient.get<DocumentTemplate[]>(
        `/hr/documents/templates/${templateId}/versions`,
        undefined,
        signal,
        documentTemplateListLazy,
      ),
    staleTime: 2 * 60_000,
    enabled: hrEnabled && !!templateId && canView,
  });
}

