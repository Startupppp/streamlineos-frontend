"use client";

import { useInfiniteQuery, useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { apiClient } from "@/lib/api-client";
import { lazyContract } from "@/lib/api-envelope";
import { usersAndCommerceQueryKeys } from "@/lib/query-keys/users-and-commerce";
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
import { useAuthorizedIdempotentMutation } from "@/hooks/api/inventory/use-idempotent-mutation";
import { NO_CURSOR_YET } from "@/hooks/api/cursor-page-param";

const periodSummaryC = lazyContract(() =>
  import("@/hooks/api/timesheets/payroll-schema").then((m) => m.payrollPeriodSummaryResponseContract),
);
const payrollSettingsC = lazyContract(() =>
  import("@/hooks/api/timesheets/payroll-schema").then((m) => m.payrollSettingsResponseContract),
);
const runExportC = lazyContract(() =>
  import("@/hooks/api/timesheets/payroll-schema").then((m) => m.payrollRunExportResponseContract),
);
const exportListC = lazyContract(() =>
  import("@/hooks/api/timesheets/payroll-schema").then((m) => m.payrollExportListResponseContract),
);
const ackExportC = lazyContract(() =>
  import("@/hooks/api/timesheets/payroll-schema").then((m) => m.payrollAckExportResponseContract),
);
const exportRowsC = lazyContract(() =>
  import("@/hooks/api/timesheets/payroll-schema").then((m) => m.payrollExportRowsResponseContract),
);

interface SummaryParams {
  start: string;
  end: string;
  userId?: string;
  includeExported?: boolean;
}

interface ExportHistoryQueryParams {
  limit: number;
  cursor?: string;
}

type SummaryQueryParams = {
  start: string;
  end: string;
  userId?: string;
  includeExported?: "true";
};

export function useTimesheetPayrollSummary(params: SummaryParams, enabled: boolean) {
  const canView = useCan("timesheets:payroll:view");
  const queryParams: SummaryQueryParams = {
    start: params.start,
    end: params.end,
    userId: params.userId ? params.userId : undefined,
    includeExported: params.includeExported ? "true" : undefined,
  };

  return useQuery({
    queryKey: usersAndCommerceQueryKeys.timesheets.payroll.summary(queryParams),
    queryFn: ({ signal }) =>
      apiClient.get<PayrollSummaryResponse>("/timesheets/payroll/period-summary", queryParams, signal, periodSummaryC),
    staleTime: 30_000,
    placeholderData: (prev) => prev,
    enabled: enabled && canView,
  });
}

export function useTimesheetPayrollSettings() {
  const canView = useCan("timesheets:payroll:view");
  return useQuery({
    queryKey: usersAndCommerceQueryKeys.timesheets.payroll.settings(),
    queryFn: ({ signal }) => apiClient.get<PayrollSettings>("/timesheets/payroll/settings", undefined, signal, payrollSettingsC),
    staleTime: 5 * 60_000,
    enabled: canView,
  });
}

export function useUpdateTimesheetPayrollSettings() {
  const qc = useQueryClient();
  return useAuthorizedMutation("timesheets:payroll:export", {
    mutationKey: ["timesheets", "payroll", "updateSettings"],
    mutationFn: (data: Partial<PayrollSettings>) =>
      apiClient.patch<PayrollSettings>("/timesheets/payroll/settings", data, undefined, payrollSettingsC),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: usersAndCommerceQueryKeys.timesheets.payroll.settings() });
      toast.success("Payroll settings saved");
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  });
}

export function useCreateTimesheetPayrollExport() {
  const qc = useQueryClient();
  return useAuthorizedIdempotentMutation<CreateExportResponse, Error, CreateExportBody>("timesheets:payroll:export", {
    mutationKey: ["timesheets", "payroll", "createExport"],
    mutationFn: (data, idempotencyKey) =>
      apiClient.post<CreateExportResponse>(
        "/timesheets/payroll/export",
        data,
        { headers: { "Idempotency-Key": idempotencyKey } },
        runExportC,
      ),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: usersAndCommerceQueryKeys.timesheets.payroll.all });
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  });
}

export function useTimesheetPayrollExports(limit = 20) {
  const canView = useCan("timesheets:payroll:view");
  return useInfiniteQuery<ExportHistoryResponse>({
    queryKey: usersAndCommerceQueryKeys.timesheets.payroll.exports(limit),
    queryFn: ({ pageParam , signal }) => {
      const params: ExportHistoryQueryParams = { limit };
      if (typeof pageParam === "string") params.cursor = pageParam;
      return apiClient.get<ExportHistoryResponse>("/timesheets/payroll/exports", params, signal, exportListC);
    },
    initialPageParam: NO_CURSOR_YET,
    getNextPageParam: (lastPage) => lastPage.pagination.nextCursor ?? undefined,
    staleTime: 30_000,
    enabled: canView,
  });
}

export function useAckPayrollExport() {
  const qc = useQueryClient();
  return useAuthorizedIdempotentMutation<AckExportResponse, Error, { exportId: number; data: AckExportInput }>(
    "timesheets:payroll:export",
    {
      mutationKey: ["timesheets", "payroll", "ackExport"],
      mutationFn: ({ exportId, data }, idempotencyKey) =>
        apiClient.patch<AckExportResponse>(
          `/timesheets/payroll/exports/${exportId}/ack`,
          data,
          { headers: { "Idempotency-Key": idempotencyKey } },
          ackExportC,
        ),
      onSuccess: () => {
        void qc.invalidateQueries({ queryKey: usersAndCommerceQueryKeys.timesheets.payroll.exports() });
        toast.success("Acknowledgement recorded");
      },
      onError: (error) => toast.error(getErrorMessage(error)),
    },
  );
}

export function payrollExportRowsQueryOptions(exportId: number) {
  return {
    queryKey: usersAndCommerceQueryKeys.timesheets.payroll.exportRows(exportId),
    queryFn: ({ signal }: { signal?: AbortSignal }) =>
      apiClient.get<ExportRowsResponse>(`/timesheets/payroll/exports/${exportId}/rows`, undefined, signal, exportRowsC),
    staleTime: 5 * 60_000,
  };
}
