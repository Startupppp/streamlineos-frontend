"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import { useCan } from "@/hooks/api/access";
import type { PayslipTemplate, PayslipLayout, PayslipTemplateConfig } from "@/types/payroll";

export function usePayslipTemplates() {
  const canView = useCan("payroll:payslips:view");
  return useQuery<PayslipTemplate[]>({
    queryKey: queryKeys.payroll.payslipTemplates(),
    queryFn: () => apiClient.get<PayslipTemplate[]>("/payroll/payslip-templates"),
    staleTime: 2 * 60_000,
    enabled: canView,
  });
}

export function usePreviewPayslipTemplate() {
  return useMutation<
    { html: string },
    Error,
    { layout: PayslipLayout; config: PayslipTemplateConfig }
  >({
    mutationKey: ["payroll", "preview-template"],
    mutationFn: (body) =>
      apiClient.post<{ html: string }>("/payroll/payslip-templates/preview", body),
  });
}

export function useCreatePayslipTemplate() {
  const qc = useQueryClient();
  return useMutation<
    PayslipTemplate,
    Error,
    {
      name: string;
      layout: PayslipLayout;
      config: PayslipTemplateConfig;
      isDefault?: boolean;
    }
  >({
    mutationKey: ["payroll", "create-template"],
    mutationFn: (body) =>
      apiClient.post<PayslipTemplate>("/payroll/payslip-templates", body),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.payroll.payslipTemplates() });
    },
  });
}

export function useUpdatePayslipTemplate() {
  const qc = useQueryClient();
  return useMutation<
    PayslipTemplate,
    Error,
    {
      templateId: number;
      name?: string;
      layout?: PayslipLayout;
      config?: Partial<PayslipTemplateConfig>;
      isDefault?: boolean;
    }
  >({
    mutationKey: ["payroll", "update-template"],
    mutationFn: ({ templateId, ...body }) =>
      apiClient.patch<PayslipTemplate>(`/payroll/payslip-templates/${templateId}`, body),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.payroll.payslipTemplates() });
    },
  });
}

export function useDeletePayslipTemplate() {
  const qc = useQueryClient();
  return useMutation<void, Error, { templateId: number }>({
    mutationKey: ["payroll", "delete-template"],
    mutationFn: ({ templateId }) =>
      apiClient.delete<void>(`/payroll/payslip-templates/${templateId}`),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.payroll.payslipTemplates() });
    },
  });
}
