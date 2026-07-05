"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import type {
  TemplateRow,
  TemplatePreviewResult,
  PaginatedResult,
} from "@/types/payroll/setup";

type TemplateListParams = {
  country?: string;
  category?: string;
  complexity?: string;
  search?: string;
  page?: number;
  pageSize?: number;
};

type DuplicateInput = {
  templateId: number;
  name: string;
  description?: string;
};

type PreviewInput = {
  templateId: number;
  annualCtc: string;
  toggleOverrides?: Record<string, boolean>;
};

export function usePayrollTemplates(params?: TemplateListParams) {
  return useQuery({
    queryKey: queryKeys.payroll.templates(params as Record<string, unknown> | undefined),
    queryFn: () =>
      apiClient.get<PaginatedResult<TemplateRow>>(
        "/payroll/templates",
        params as Record<string, unknown> | undefined,
      ),
    staleTime: 5 * 60_000,
  });
}

export function usePreviewTemplate() {
  return useMutation({
    mutationKey: ["payroll", "templates", "preview"],
    mutationFn: ({ templateId, annualCtc, toggleOverrides }: PreviewInput) =>
      apiClient.post<TemplatePreviewResult>(
        `/payroll/templates/${templateId}/preview`,
        { annualCtc, toggleOverrides },
      ),
  });
}

export function useDeleteTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["payroll", "templates", "delete"],
    mutationFn: (templateId: number) =>
      apiClient.delete<void>(`/payroll/templates/${templateId}`),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: queryKeys.payroll.all }),
  });
}

export function useDuplicateTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["payroll", "templates", "duplicate"],
    mutationFn: ({ templateId, name, description }: DuplicateInput) =>
      apiClient.post<TemplateRow>(
        `/payroll/templates/${templateId}/duplicate`,
        { name, description },
      ),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: queryKeys.payroll.all }),
  });
}
