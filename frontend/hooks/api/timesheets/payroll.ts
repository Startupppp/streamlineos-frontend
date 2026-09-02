"use client";

import { useInfiniteQuery, useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import { getErrorMessage } from "@/lib/get-error-message";
import { useCan } from "@/hooks/api/access";
import type {
  PayrollSummaryResponse,
  PayrollSettings,
  CreateExportBody,
  CreateExportResponse,
  ExportHistoryResponse,
  ExportRowsResponse,
  AckExportResponse,
  TimesheetExportDto,
} from "@/features/timesheets/payroll/types";
import type { AckExportInput } from "@/features/timesheets/payroll/ack-export-schema";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";

interface SummaryParams {
  start: string;
  end: string;
  userId?: string;
  includeExported?: boolean;
}

export function useTimesheetPayrollSummary(params: SummaryParams, enabled: boolean) {
  const canView = useCan("timesheets:payroll:view");
  const queryParams: Record<string, unknown> = {
    start: params.start,
    end: params.end,
  };
  if (params.userId) queryParams.userId = params.userId;
  if (params.includeExported) queryParams.includeExported = "true";

  return useQuery({
    queryKey: queryKeys.timesheets.payroll.summary(queryParams),
    queryFn: ({ signal }) =>
      apiClient.get<PayrollSummaryResponse>("/timesheets/payroll/period-summary", queryParams, signal),
    staleTime: 30_000,
    placeholderData: (prev) => prev,
    enabled: enabled && canView,
  });
}

export function useTimesheetPayrollSettings() {
  const canView = useCan("timesheets:payroll:view");
  return useQuery({
    queryKey: queryKeys.timesheets.payroll.settings(),
    queryFn: ({ signal }) => apiClient.get<PayrollSettings>("/timesheets/payroll/settings", undefined, signal),
    staleTime: 5 * 60_000,
    enabled: canView,
  });
}

export function useUpdateTimesheetPayrollSettings() {
  const qc = useQueryClient();
  return useAuthorizedMutation("timesheets:payroll:export", {
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
  return useAuthorizedMutation("timesheets:payroll:export", {
    mutationKey: ["timesheets", "payroll", "createExport"],
    mutationFn: (data: CreateExportBody) =>
      apiClient.post<CreateExportResponse>("/timesheets/payroll/export", data),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.timesheets.payroll.all });
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  });
}

export function useTimesheetPayrollExports(limit = 20) {
  const canView = useCan("timesheets:payroll:view");
  return useInfiniteQuery<ExportHistoryResponse>({
    queryKey: queryKeys.timesheets.payroll.exports(limit),
    queryFn: ({ pageParam , signal }) => {
      const params: Record<string, unknown> = { limit };
      if (typeof pageParam === "string") params.cursor = pageParam;
      return apiClient.get<ExportHistoryResponse>("/timesheets/payroll/exports", params, signal);
    },
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.pagination.nextCursor ?? undefined,
    staleTime: 30_000,
    enabled: canView,
  });
}

export function useAckPayrollExport() {
  const qc = useQueryClient();
  return useAuthorizedMutation("timesheets:payroll:export", {
    mutationKey: ["timesheets", "payroll", "ackExport"],
    mutationFn: ({ exportId, data }: { exportId: number; data: AckExportInput }) =>
      apiClient.patch<AckExportResponse>(`/timesheets/payroll/exports/${exportId}/ack`, data),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: [...queryKeys.timesheets.all, "payroll", "exports"] });
      toast.success("Acknowledgement recorded");
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  });
}

export function payrollExportRowsQueryOptions(exportId: number) {
  return {
    queryKey: queryKeys.timesheets.payroll.exportRows(exportId),
    queryFn: ({ signal }: { signal?: AbortSignal }) =>
      apiClient.get<ExportRowsResponse>(`/timesheets/payroll/exports/${exportId}/rows`, undefined, signal),
    staleTime: 5 * 60_000,
  };
}
