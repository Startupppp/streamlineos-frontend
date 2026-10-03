"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { INLINE_READ_ERROR } from "@/lib/query-error-policy";
import { payrollQueryKeys } from "@/lib/query-keys/payroll";
import { useCan } from "@/hooks/api/access";
import { salaryPreviewContract, type SalaryPreview } from "@/hooks/api/payroll/salary-preview-schema";

export const SALARY_PREVIEW_CTC = /^\d{1,12}(\.\d{1,2})?$/;

export type SalaryPreviewParams = {
  annualCtc: string;
  regime?: "OLD" | "NEW";
  workerType?: "EMPLOYEE" | "CONTRACTOR" | "CONSULTANT" | "INTERN" | "EOR";
};

export function useSalaryPreview(params: SalaryPreviewParams) {
  const canView = useCan("payroll:salaries:view");
  const validCtc = SALARY_PREVIEW_CTC.test(params.annualCtc) && Number(params.annualCtc) > 0;
  return useQuery({
    queryKey: [...payrollQueryKeys.payroll.components(), "salary-preview", params],
    queryFn: ({ signal }) =>
      apiClient.post<SalaryPreview>("/payroll/salary-preview", params, { signal }, salaryPreviewContract),
    enabled: canView && validCtc,
    staleTime: 60_000,
    placeholderData: keepPreviousData,
    ...INLINE_READ_ERROR,
  });
}
