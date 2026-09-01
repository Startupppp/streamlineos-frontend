"use client";

import { keepPreviousData, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import { useCan } from "@/hooks/api/access";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";
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
  const canView = useCan("payroll:templates:view");
  return useQuery({
    queryKey: queryKeys.payroll.templates(params as Record<string, unknown> | undefined),
    queryFn: ({ signal }) =>
      apiClient.get<PaginatedResult<TemplateRow>>(
        "/payroll/templates",
        params as Record<string, unknown> | undefined,
      ),
    staleTime: 5 * 60_000,
    placeholderData: keepPreviousData,
    enabled: canView,
  });
}

export function usePreviewTemplate() {
  return useAuthorizedMutation("payroll:templates:view", {
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
  return useAuthorizedMutation("payroll:templates:manage", {
    mutationKey: ["payroll", "templates", "delete"],
    mutationFn: (templateId: number) =>
      apiClient.delete<void>(`/payroll/templates/${templateId}`),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: [...queryKeys.payroll.all, "templates"] });
      void qc.invalidateQueries({ queryKey: [...queryKeys.payroll.all, "template"] });
    },
  });
}

export function useDuplicateTemplate() {
  const qc = useQueryClient();
  return useAuthorizedMutation("payroll:templates:manage", {
    mutationKey: ["payroll", "templates", "duplicate"],
    mutationFn: ({ templateId, name, description }: DuplicateInput) =>
      apiClient.post<TemplateRow>(
        `/payroll/templates/${templateId}/duplicate`,
        { name, description },
      ),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: [...queryKeys.payroll.all, "templates"] });
    },
  });
}
