"use client";

import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import type {
  HrTemplate,
  HrTemplateKind,
  HrTemplateRender,
  HrTemplateStatus,
  RenderResponse,
  TemplateListResponse,
  TemplateVariable,
} from "@/types/hr/templates";

interface ListParams {
  kind?: HrTemplateKind;
  status?: HrTemplateStatus;
  search?: string;
  page?: number;
  limit?: number;
}

export function useHrTemplates(params?: ListParams) {
  return useQuery({
    queryKey: queryKeys.hr.hrTemplates(params as Record<string, unknown> | undefined),
    queryFn: () =>
      apiClient.get<TemplateListResponse>("/hr/templates", params as Record<string, unknown> | undefined),
    staleTime: 60_000,
    placeholderData: keepPreviousData,
  });
}

export function useHrTemplate(id: number) {
  return useQuery({
    queryKey: queryKeys.hr.hrTemplate(id),
    queryFn: () => apiClient.get<HrTemplate>(`/hr/templates/${id}`),
    staleTime: 60_000,
    enabled: !!id,
  });
}

export function useHrTemplateVariables() {
  return useQuery({
    queryKey: queryKeys.hr.hrTemplateVariables(),
    queryFn: () => apiClient.get<TemplateVariable[]>("/hr/templates/variables"),
    staleTime: 10 * 60_000,
  });
}

export function useHrTemplateRenders(templateId: number) {
  return useQuery({
    queryKey: queryKeys.hr.hrTemplateRenders(templateId),
    queryFn: () => apiClient.get<HrTemplateRender[]>(`/hr/templates/${templateId}/renders`),
    staleTime: 30_000,
    enabled: !!templateId,
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
  return useMutation({
    mutationKey: ["hr", "templates", "create"],
    mutationFn: (data: CreateTemplateInput) =>
      apiClient.post<HrTemplate>("/hr/templates", data),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.hr.hrTemplates() }),
  });
}

interface UpdateTemplateInput {
  id: number;
  name?: string;
  description?: string;
  content?: Record<string, unknown>;
  variablesUsed?: string[];
  letterType?: string;
}

export function useUpdateHrTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["hr", "templates", "update"],
    mutationFn: ({ id, ...data }: UpdateTemplateInput) =>
      apiClient.patch<HrTemplate>(`/hr/templates/${id}`, data),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: queryKeys.hr.hrTemplates() });
      qc.invalidateQueries({ queryKey: queryKeys.hr.hrTemplate(id) });
    },
  });
}

export function useTransitionHrTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["hr", "templates", "transition"],
    mutationFn: ({ id, to }: { id: number; to: HrTemplateStatus }) =>
      apiClient.post<HrTemplate>(`/hr/templates/${id}/transition`, { to }),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: queryKeys.hr.hrTemplates() });
      qc.invalidateQueries({ queryKey: queryKeys.hr.hrTemplate(id) });
    },
  });
}

export function useCreateHrTemplateVersion() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["hr", "templates", "version"],
    mutationFn: (templateId: number) =>
      apiClient.post<HrTemplate>(`/hr/templates/${templateId}/versions`, {}),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.hr.hrTemplates() }),
  });
}

interface RenderInput {
  employeeId?: number;
  extraContext?: Record<string, string>;
  includeSensitive?: boolean;
}

export function useRenderHrTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["hr", "templates", "render"],
    mutationFn: ({ templateId, ...body }: RenderInput & { templateId: number }) =>
      apiClient.post<RenderResponse>(`/hr/templates/${templateId}/render`, body),
    onSuccess: (_, { templateId }) => {
      qc.invalidateQueries({ queryKey: queryKeys.hr.hrTemplateRenders(templateId) });
    },
  });
}

export function useSeedHrTemplateDefaults() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["hr", "templates", "seed"],
    mutationFn: () => apiClient.post<{ seeded: boolean; count?: number }>("/hr/templates/seed-defaults", {}),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.hr.hrTemplates() }),
  });
}
