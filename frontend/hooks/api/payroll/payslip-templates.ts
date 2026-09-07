"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { lazyContract } from "@/lib/api-envelope";
import { payrollQueryKeys } from "@/lib/query-keys/payroll";
import { useCan } from "@/hooks/api/access";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";
import type { PayslipTemplate, PayslipLayout, PayslipTemplateConfig } from "@/types/payroll";

const payslipTemplateListC = lazyContract(() =>
  import("@/hooks/api/payroll/payslip-templates-schema").then((m) => m.payslipTemplateListContract),
);
const previewTemplateC = lazyContract(() =>
  import("@/hooks/api/payroll/payslip-templates-schema").then((m) => m.previewTemplateResponseContract),
);
const payslipTemplateC = lazyContract(() =>
  import("@/hooks/api/payroll/payslip-templates-schema").then((m) => m.payslipTemplateContract),
);

export function usePayslipTemplates() {
  const canView = useCan("payroll:payslips:view");
  return useQuery<PayslipTemplate[]>({
    queryKey: payrollQueryKeys.payroll.payslipTemplates(),
    queryFn: ({ signal }) => apiClient.get<PayslipTemplate[]>("/payroll/payslip-templates", undefined, signal, payslipTemplateListC),
    staleTime: 2 * 60_000,
    enabled: canView,
  });
}

export function usePreviewPayslipTemplate() {
  return useAuthorizedMutation<
    { html: string },
    Error,
    { layout: PayslipLayout; config: PayslipTemplateConfig }
  >("payroll:payslips:manage", {
    mutationKey: ["payroll", "preview-template"],
    mutationFn: (body) =>
      apiClient.post<{ html: string }>("/payroll/payslip-templates/preview", body, undefined, previewTemplateC),
  });
}

export function useCreatePayslipTemplate() {
  const qc = useQueryClient();
  return useAuthorizedMutation<
    PayslipTemplate,
    Error,
    {
      name: string;
      layout: PayslipLayout;
      config: PayslipTemplateConfig;
      isDefault?: boolean;
    }
  >("payroll:payslips:manage", {
    mutationKey: ["payroll", "create-template"],
    mutationFn: (body) =>
      apiClient.post<PayslipTemplate>("/payroll/payslip-templates", body, undefined, payslipTemplateC),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: payrollQueryKeys.payroll.payslipTemplates() });
    },
  });
}

export function useUpdatePayslipTemplate() {
  const qc = useQueryClient();
  return useAuthorizedMutation<
    PayslipTemplate,
    Error,
    {
      templateId: number;
      name?: string;
      layout?: PayslipLayout;
      config?: Partial<PayslipTemplateConfig>;
      isDefault?: boolean;
    }
  >("payroll:payslips:manage", {
    mutationKey: ["payroll", "update-template"],
    mutationFn: ({ templateId, ...body }) =>
      apiClient.patch<PayslipTemplate>(`/payroll/payslip-templates/${templateId}`, body, undefined, payslipTemplateC),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: payrollQueryKeys.payroll.payslipTemplates() });
    },
  });
}

export function useDeletePayslipTemplate() {
  const qc = useQueryClient();
  return useAuthorizedMutation<void, Error, { templateId: number }>("payroll:payslips:manage", {
    mutationKey: ["payroll", "delete-template"],
    mutationFn: ({ templateId }) =>
      apiClient.delete<void>(`/payroll/payslip-templates/${templateId}`, undefined, undefined, undefined),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: payrollQueryKeys.payroll.payslipTemplates() });
    },
  });
}
