"use client";

import { keepPreviousData, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { lazyContract } from "@/lib/api-envelope";
import { payrollQueryKeys } from "@/lib/query-keys/payroll";
import { useCan } from "@/hooks/api/access";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";
import type {
  TemplateRow,
  TemplatePreviewResult,
  PaginatedResult,
} from "@/types/payroll/setup";
import { templatePreviewContract } from "@/hooks/api/payroll/setup-preview-schema";

const templateListC = lazyContract(() =>
  import("@/hooks/api/payroll/templates-schema").then((m) => m.templateListResponseContract),
);
const noContentC = lazyContract(() =>
  import("@/hooks/api/cursor-page-schema").then((m) => m.noContentContract),
);
const payrollTemplateC = lazyContract(() =>
  import("@/hooks/api/payroll/templates-schema").then((m) => m.payrollTemplateContract),
);

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
    queryKey: payrollQueryKeys.payroll.templates(params),
    queryFn: ({ signal }) =>
      apiClient.get(
        "/payroll/templates",
        params, signal, templateListC,
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
        undefined,
        templatePreviewContract,
      ),
  });
}

export function useDeleteTemplate() {
  const qc = useQueryClient();
  return useAuthorizedMutation("payroll:templates:manage", {
    mutationKey: ["payroll", "templates", "delete"],
    mutationFn: (templateId: number) =>
      apiClient.delete<void>(`/payroll/templates/${templateId}`, undefined, undefined, noContentC),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: [...payrollQueryKeys.payroll.all, "templates"] });
      void qc.invalidateQueries({ queryKey: [...payrollQueryKeys.payroll.all, "template"] });
    },
  });
}

export function useDuplicateTemplate() {
  const qc = useQueryClient();
  return useAuthorizedMutation("payroll:templates:manage", {
    mutationKey: ["payroll", "templates", "duplicate"],
    mutationFn: ({ templateId, name, description }: DuplicateInput) =>
      apiClient.post(
        `/payroll/templates/${templateId}/duplicate`,
        { name, description },
        undefined,
        payrollTemplateC,
      ),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: [...payrollQueryKeys.payroll.all, "templates"] });
    },
  });
}
