"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import { getErrorMessage } from "@/lib/get-error-message";
import type {
  PayrollSummaryResponse,
  PayrollSettings,
  CreateExportBody,
  CreateExportResponse,
  ExportHistoryResponse,
  ExportRowsResponse,
} from "@/features/timesheets/payroll/types";

interface SummaryParams {
  start: string;
  end: string;
  userId?: string;
  includeExported?: boolean;
}

export function useTimesheetPayrollSummary(params: SummaryParams, enabled: boolean) {
  const queryParams: Record<string, unknown> = {
    start: params.start,
    end: params.end,
  };
  if (params.userId) queryParams.userId = params.userId;
  if (params.includeExported) queryParams.includeExported = "true";

  return useQuery({
    queryKey: queryKeys.timesheets.payroll.summary(queryParams),
    queryFn: () =>
      apiClient.get<PayrollSummaryResponse>("/timesheets/payroll/period-summary", queryParams),
    staleTime: 30_000,
    placeholderData: (prev) => prev,
    enabled,
  });
}

export function useTimesheetPayrollSettings() {
  return useQuery({
    queryKey: queryKeys.timesheets.payroll.settings(),
    queryFn: () => apiClient.get<PayrollSettings>("/timesheets/payroll/settings"),
    staleTime: 5 * 60_000,
  });
}

export function useUpdateTimesheetPayrollSettings() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["timesheets", "payroll", "updateSettings"],
    mutationFn: (data: Partial<PayrollSettings>) =>
      apiClient.patch<PayrollSettings>("/timesheets/payroll/settings", data),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.timesheets.payroll.settings() });
      toast.success("Payroll settings saved");
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  });
}

export function useCreateTimesheetPayrollExport() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["timesheets", "payroll", "createExport"],
    mutationFn: (data: CreateExportBody) =>
      apiClient.post<CreateExportResponse>("/timesheets/payroll/export", data),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: [...queryKeys.timesheets.all, "payroll", "summary"] });
      void qc.invalidateQueries({ queryKey: [...queryKeys.timesheets.all, "payroll", "exports"] });
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  });
}

export function useTimesheetPayrollExports(page: number, pageSize = 20) {
  return useQuery({
    queryKey: queryKeys.timesheets.payroll.exports(page, pageSize),
    queryFn: () =>
      apiClient.get<ExportHistoryResponse>("/timesheets/payroll/exports", { page, pageSize }),
    staleTime: 30_000,
  });
}

export function payrollExportRowsQueryOptions(exportId: number) {
  return {
    queryKey: queryKeys.timesheets.payroll.exportRows(exportId),
    queryFn: () =>
      apiClient.get<ExportRowsResponse>(`/timesheets/payroll/exports/${exportId}/rows`),
    staleTime: 5 * 60_000,
  };
}
