"use client";

import { keepPreviousData, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { lazyContract } from "@/lib/api-envelope";
import { humanResourcesQueryKeys } from "@/lib/query-keys/human-resources";
import { useCan, useModuleEnabled } from "@/hooks/api/access";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";
import type {
  HrTemplate,
  HrTemplateKind,
  HrTemplateStatus,
  RenderResponse,
  TemplateListResponse,
  TemplateVariable,
} from "@/types/hr/templates";

interface ListParams {
  kind?: HrTemplateKind;
  status?: HrTemplateStatus;
  search?: string;
  cursor?: string;
  limit?: number;
}

export function useHrTemplates(params?: ListParams) {
  const canView = useCan("hr:templates:view");
  const hrEnabled = useModuleEnabled("hr");
  return useQuery({
    queryKey: humanResourcesQueryKeys.hr.hrTemplates(params),
    queryFn: ({ signal }) =>
      apiClient.get<TemplateListResponse>("/hr/templates", params, signal, lazyContract(() => import("@/hooks/api/hr/hr-templates-schema").then(m => m.hrTemplateListContract))),
    staleTime: 60_000,
    placeholderData: keepPreviousData,
    enabled: hrEnabled && canView,
  });
}

export function useHrTemplate(templateId: number) {
  const canView = useCan("hr:templates:view");
  const hrEnabled = useModuleEnabled("hr");
  return useQuery({
    queryKey: humanResourcesQueryKeys.hr.hrTemplate(templateId),
    queryFn: ({ signal }) => apiClient.get<HrTemplate>(`/hr/templates/${templateId}`, undefined, signal, lazyContract(() => import("@/hooks/api/hr/hr-templates-schema").then(m => m.hrTemplateRowContract))),
    staleTime: 60_000,
    enabled: hrEnabled && canView && !!templateId,
  });
}

export function useHrTemplateVariables() {
  const canView = useCan("hr:templates:view");
  const hrEnabled = useModuleEnabled("hr");
  return useQuery({
    queryKey: humanResourcesQueryKeys.hr.hrTemplateVariables(),
    queryFn: ({ signal }) => apiClient.get<TemplateVariable[]>("/hr/templates/variables", undefined, signal, lazyContract(() => import("@/hooks/api/hr/hr-templates-schema").then(m => m.templateVariablesListContract))),
    staleTime: 10 * 60_000,
    enabled: hrEnabled && canView,
  });
}

interface CreateTemplateInput {
  kind: HrTemplateKind;
  name: string;
  description?: string;
  content: Record<string, unknown>;
  variablesUsed?: string[];
  letterType?: string;
}

export function useCreateHrTemplate() {
  const qc = useQueryClient();
  return useAuthorizedMutation("hr:templates:manage", {
    mutationKey: ["hr", "templates", "create"],
    mutationFn: (data: CreateTemplateInput) =>
      apiClient.post<HrTemplate>("/hr/templates", data, undefined, lazyContract(() => import("@/hooks/api/hr/hr-templates-schema").then(m => m.hrTemplateRowContract))),
    onSuccess: () => qc.invalidateQueries({ queryKey: humanResourcesQueryKeys.hr.hrTemplates() }),
  });
}

interface UpdateTemplateInput {
  templateId: number;
  name?: string;
  description?: string;
  content?: Record<string, unknown>;
  variablesUsed?: string[];
  letterType?: string;
}

export function useUpdateHrTemplate() {
  const qc = useQueryClient();
  return useAuthorizedMutation("hr:templates:manage", {
    mutationKey: ["hr", "templates", "update"],
    mutationFn: ({ templateId, ...data }: UpdateTemplateInput) =>
      apiClient.patch<HrTemplate>(`/hr/templates/${templateId}`, data, undefined, lazyContract(() => import("@/hooks/api/hr/hr-templates-schema").then(m => m.hrTemplateRowContract))),
    onSuccess: (_, { templateId }) => {
      qc.invalidateQueries({ queryKey: humanResourcesQueryKeys.hr.hrTemplates() });
      qc.invalidateQueries({ queryKey: humanResourcesQueryKeys.hr.hrTemplate(templateId) });
    },
  });
}

export function useTransitionHrTemplate() {
  const qc = useQueryClient();
  return useAuthorizedMutation("hr:templates:manage", {
    mutationKey: ["hr", "templates", "transition"],
    mutationFn: ({ templateId, to }: { templateId: number; to: HrTemplateStatus }) =>
      apiClient.post<HrTemplate>(`/hr/templates/${templateId}/transition`, { to }, undefined, lazyContract(() => import("@/hooks/api/hr/hr-templates-schema").then(m => m.hrTemplateRowContract))),
    onSuccess: (_, { templateId }) => {
      qc.invalidateQueries({ queryKey: humanResourcesQueryKeys.hr.hrTemplates() });
      qc.invalidateQueries({ queryKey: humanResourcesQueryKeys.hr.hrTemplate(templateId) });
    },
  });
}

interface RenderInput {
  employeeId?: number;
  extraContext?: Record<string, string>;
  includeSensitive?: boolean;
}

export function useRenderHrTemplate() {
  const qc = useQueryClient();
  return useAuthorizedMutation("hr:templates:view", {
    mutationKey: ["hr", "templates", "render"],
    mutationFn: ({ templateId, ...body }: RenderInput & { templateId: number }) =>
      apiClient.post<RenderResponse>(`/hr/templates/${templateId}/render`, body, undefined, lazyContract(() => import("@/hooks/api/hr/hr-templates-schema").then(m => m.hrTemplateRenderResultContract))),
    onSuccess: (_, { templateId }) => {
      qc.invalidateQueries({ queryKey: humanResourcesQueryKeys.hr.hrTemplateRenders(templateId) });
    },
  });
}

export function useSeedHrTemplateDefaults() {
  const qc = useQueryClient();
  return useAuthorizedMutation("hr:templates:manage", {
    mutationKey: ["hr", "templates", "seed"],
    mutationFn: () => apiClient.post<{ seeded: boolean; count?: number }>("/hr/templates/seed-defaults", {}, undefined, lazyContract(() => import("@/hooks/api/hr/hr-templates-schema").then(m => m.hrTemplateSeedResultContract))),
    onSuccess: () => qc.invalidateQueries({ queryKey: humanResourcesQueryKeys.hr.hrTemplates() }),
  });
}
