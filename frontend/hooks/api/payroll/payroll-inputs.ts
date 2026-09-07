"use client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { apiClient } from "@/lib/api-client";
import { lazyContract } from "@/lib/api-envelope";
import { payrollQueryKeys } from "@/lib/query-keys/payroll";
import { getErrorMessage } from "@/lib/get-error-message";
import { useCan } from "@/hooks/api/access";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";
import type {
  PayrollSnapshotItem,
  PayrollAdjustmentListItem as SchemaAdjustmentListItem,
  PayrollAdjustment as SchemaAdjustmentMutation,
  PayrollPeriod as SchemaPeriod,
} from "@/hooks/api/payroll/payroll-inputs-schema";

const payrollPeriodListC = lazyContract(() =>
  import("@/hooks/api/payroll/payroll-inputs-schema").then(
    (m) => m.payrollPeriodListContract,
  ),
);
const payrollPeriodC = lazyContract(() =>
  import("@/hooks/api/payroll/payroll-inputs-schema").then(
    (m) => m.payrollPeriodContract,
  ),
);
const payrollSnapshotListC = lazyContract(() =>
  import("@/hooks/api/payroll/payroll-inputs-schema").then(
    (m) => m.payrollSnapshotListContract,
  ),
);
const payrollAdjustmentListC = lazyContract(() =>
  import("@/hooks/api/payroll/payroll-inputs-schema").then(
    (m) => m.payrollAdjustmentListContract,
  ),
);
const payrollAdjustmentC = lazyContract(() =>
  import("@/hooks/api/payroll/payroll-inputs-schema").then(
    (m) => m.payrollAdjustmentContract,
  ),
);

export type HrPayrollInputStatus = "open" | "building" | "built" | "locked";

export type HrPayrollInputSection =
  | "employee_master"
  | "compensation"
  | "attendance"
  | "leave"
  | "overtime"
  | "reimbursement"
  | "deduction"
  | "lifecycle";

export type HrPayrollAdjustmentType = "arrears" | "recovery" | "correction";
export type HrPayrollAdjustmentStatus = "pending" | "approved" | "applied";

export type PayrollInputPeriod = SchemaPeriod;
export type PayrollInputSnapshot = PayrollSnapshotItem;
export type PayrollAdjustment = SchemaAdjustmentMutation;
export type PayrollAdjustmentListItem = SchemaAdjustmentListItem;

interface Pagination {
  limit: number;
  nextCursor: string | null;
  hasMore: boolean;
}

interface PaginatedPeriods {
  data: SchemaPeriod[];
  pagination: Pagination;
}

interface PaginatedSnapshots {
  data: PayrollSnapshotItem[];
  pagination: Pagination;
}

interface PaginatedAdjustments {
  data: SchemaAdjustmentListItem[];
  pagination: Pagination;
}

interface SectionParams {
  cursor?: string;
  limit?: number;
}

export function usePayrollInputPeriods(params?: {
  cursor?: string;
  limit?: number;
  status?: HrPayrollInputStatus;
}) {
  const canView = useCan("hr:payroll:view");
  return useQuery({
    queryKey: payrollQueryKeys.hrPayrollInputs.periods(
      params as Record<string, unknown> | undefined,
    ),
    queryFn: ({ signal }) =>
      apiClient.get<PaginatedPeriods>(
        "/hr/payroll-inputs/periods",
        params as Record<string, string | number> | undefined,
        signal,
        payrollPeriodListC,
      ),
    staleTime: 30_000,
    enabled: canView,
  });
}

export function useCreatePayrollInputPeriod() {
  const qc = useQueryClient();
  return useAuthorizedMutation("hr:payroll:generate", {
    mutationKey: ["hr-payroll-inputs", "periods", "create"],
    mutationFn: (data: { periodKey: string; cutoffDate?: string }) =>
      apiClient.post<PayrollInputPeriod>(
        "/hr/payroll-inputs/periods",
        data,
        undefined,
        payrollPeriodC,
      ),
    onSuccess: () => {
      void qc.invalidateQueries({
        queryKey: payrollQueryKeys.hrPayrollInputs.periods(),
      });
      toast.success("Period created");
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });
}

export function useBuildPayrollInputPeriod() {
  const qc = useQueryClient();
  return useAuthorizedMutation("hr:payroll:generate", {
    mutationKey: ["hr-payroll-inputs", "periods", "build"],
    mutationFn: (periodId: number) =>
      apiClient.post<PayrollInputPeriod>(
        `/hr/payroll-inputs/periods/${periodId}/build`,
        undefined,
        undefined,
        payrollPeriodC,
      ),
    onSuccess: (_, periodId) => {
      void qc.invalidateQueries({
        queryKey: payrollQueryKeys.hrPayrollInputs.period(periodId),
      });
      void qc.invalidateQueries({
        queryKey: payrollQueryKeys.hrPayrollInputs.periods(),
      });
      toast.success("Period built — snapshots captured");
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });
}

export function useLockPayrollInputPeriod() {
  const qc = useQueryClient();
  return useAuthorizedMutation("hr:payroll:lock", {
    mutationKey: ["hr-payroll-inputs", "periods", "lock"],
    mutationFn: (periodId: number) =>
      apiClient.post<PayrollInputPeriod>(
        `/hr/payroll-inputs/periods/${periodId}/lock`,
        undefined,
        undefined,
        payrollPeriodC,
      ),
    onSuccess: (_, periodId) => {
      void qc.invalidateQueries({
        queryKey: payrollQueryKeys.hrPayrollInputs.period(periodId),
      });
      void qc.invalidateQueries({
        queryKey: payrollQueryKeys.hrPayrollInputs.periods(),
      });
      toast.success("Period locked");
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });
}

export function useUnlockPayrollInputPeriod() {
  const qc = useQueryClient();
  return useAuthorizedMutation("hr:payroll:reopen", {
    mutationKey: ["hr-payroll-inputs", "periods", "unlock"],
    mutationFn: (periodId: number) =>
      apiClient.post<PayrollInputPeriod>(
        `/hr/payroll-inputs/periods/${periodId}/unlock`,
        undefined,
        undefined,
        payrollPeriodC,
      ),
    onSuccess: (_, periodId) => {
      void qc.invalidateQueries({
        queryKey: payrollQueryKeys.hrPayrollInputs.period(periodId),
      });
      void qc.invalidateQueries({
        queryKey: payrollQueryKeys.hrPayrollInputs.periods(),
      });
      toast.success("Period unlocked");
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });
}

function makeSectionHook(section: string) {
  return function useSectionSnapshot(
    periodId: number,
    params?: SectionParams,
    enabled = true,
  ) {
    const canView = useCan("hr:payroll:view");
    const queryParams = {
      ...(params?.cursor !== undefined && { cursor: params.cursor }),
      ...(params?.limit !== undefined && { limit: params.limit }),
    };
    return useQuery({
      queryKey: payrollQueryKeys.hrPayrollInputs.section(
        periodId,
        section,
        queryParams,
      ),
      queryFn: ({ signal }) =>
        apiClient.get<PaginatedSnapshots>(
          `/hr/payroll-inputs/periods/${periodId}/${section}`,
          queryParams as Record<string, string | number>,
          signal,
          payrollSnapshotListC,
        ),
      staleTime: 60_000,
      enabled: enabled && periodId > 0 && canView,
    });
  };
}

export const useAttendanceSnapshot = makeSectionHook("attendance");
export const useLeaveSnapshot = makeSectionHook("leaves");
export const useOvertimeSnapshot = makeSectionHook("overtime");
export const useReimbursementSnapshot = makeSectionHook("reimbursements");

export function usePayrollAdjustments(
  periodId: number,
  params?: { cursor?: string; limit?: number },
) {
  const canView = useCan("hr:payroll:view");
  return useQuery({
    queryKey: payrollQueryKeys.hrPayrollInputs.adjustments(
      periodId,
      params as Record<string, unknown> | undefined,
    ),
    queryFn: ({ signal }) =>
      apiClient.get<PaginatedAdjustments>(
        `/hr/payroll-inputs/periods/${periodId}/adjustments`,
        params as Record<string, string | number> | undefined,
        signal,
        payrollAdjustmentListC,
      ),
    staleTime: 30_000,
    enabled: canView && periodId > 0,
  });
}

export function useCreatePayrollAdjustment() {
  const qc = useQueryClient();
  return useAuthorizedMutation("hr:payroll:generate", {
    mutationKey: ["hr-payroll-inputs", "adjustments", "create"],
    mutationFn: (data: {
      periodId?: number;
      userId: string;
      adjustmentType: HrPayrollAdjustmentType;
      section: HrPayrollInputSection;
      amountCents?: number;
      days?: number;
      reason: string;
      sourceChangeRef?: Record<string, unknown>;
    }) =>
      apiClient.post<PayrollAdjustment>("/hr/payroll-inputs/adjustments", data, undefined, payrollAdjustmentC),
    onSuccess: (_, vars) => {
      if (vars.periodId) {
        void qc.invalidateQueries({
          queryKey: payrollQueryKeys.hrPayrollInputs.adjustments(vars.periodId),
        });
      }
      void qc.invalidateQueries({
        queryKey: payrollQueryKeys.hrPayrollInputs.all,
      });
      toast.success("Adjustment created");
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });
}

export function useApprovePayrollAdjustment() {
  const qc = useQueryClient();
  return useAuthorizedMutation("hr:payroll:approve", {
    mutationKey: ["hr-payroll-inputs", "adjustments", "approve"],
    mutationFn: (adjustmentId: number) =>
      apiClient.patch<PayrollAdjustment>(
        `/hr/payroll-inputs/adjustments/${adjustmentId}/approve`,
        undefined,
        undefined,
        payrollAdjustmentC,
      ),
    onSuccess: () => {
      void qc.invalidateQueries({
        queryKey: payrollQueryKeys.hrPayrollInputs.all,
      });
      toast.success("Adjustment approved");
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });
}
