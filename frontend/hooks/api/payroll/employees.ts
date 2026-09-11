"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { lazyContract } from "@/lib/api-envelope";
import { payrollQueryKeys } from "@/lib/query-keys/payroll";
import { useCan } from "@/hooks/api/access";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";
const profileListC = lazyContract(() =>
  import("@/hooks/api/payroll/employees-schema").then((m) => m.profileListResponseContract),
);
const profileDetailC = lazyContract(() =>
  import("@/hooks/api/payroll/employees-schema").then((m) => m.profileDetailResponseContract),
);
const profileHistoryC = lazyContract(() =>
  import("@/hooks/api/payroll/employees-schema").then((m) => m.profileHistoryResponseContract),
);
const profileCreateC = lazyContract(() =>
  import("@/hooks/api/payroll/employees-schema").then((m) => m.profileCreateResponseContract),
);
const idResponseC = lazyContract(() =>
  import("@/hooks/api/payroll/employees-schema").then((m) => m.idResponseContract),
);
const okResponseC = lazyContract(() =>
  import("@/hooks/api/payroll/employees-schema").then((m) => m.okResponseContract),
);

interface CreateProfileBody {
  effectiveFrom: string;
  annualCtc: string;
  workerType?: string;
  currency?: string;
  taxRegime?: string;
  costCenter?: string;
  components?: {
    componentId: number;
    calcMethodOverride?: string;
    amount?: string;
    percent?: string;
  }[];
}

export function useEmployeeProfiles(params?: {
  page?: number;
  limit?: number;
  search?: string;
  workerType?: string;
  status?: string;
}) {
  const canView = useCan("payroll:salaries:view");
  return useQuery({
    queryKey: payrollQueryKeys.payroll.employees(params),
    queryFn: ({ signal }) =>
      apiClient.get(
        "/payroll/employees",
        params, signal, profileListC,
      ),
    staleTime: 60_000,
    enabled: canView,
  });
}

export function useEmployeeProfile(employeeUserId: string) {
  const canView = useCan("payroll:salaries:view");
  return useQuery({
    queryKey: payrollQueryKeys.payroll.employee(employeeUserId),
    queryFn: ({ signal }) =>
      apiClient.get(`/payroll/employees/${employeeUserId}`, undefined, signal, profileDetailC),
    staleTime: 60_000,
    enabled: canView && !!employeeUserId,
  });
}

export function useEmployeeProfileHistory(employeeUserId: string) {
  const canView = useCan("payroll:salaries:view");
  return useQuery({
    queryKey: payrollQueryKeys.payroll.employeeHistory(employeeUserId),
    queryFn: ({ signal }) =>
      apiClient.get(`/payroll/employees/${employeeUserId}/history`, undefined, signal, profileHistoryC),
    staleTime: 60_000,
    enabled: canView && !!employeeUserId,
  });
}

export function useCreateWorkerProfile(workerId: string) {
  const qc = useQueryClient();
  return useAuthorizedMutation("payroll:salaries:update", {
    mutationKey: ["payroll", "workers", workerId, "create-profile"],
    mutationFn: (body: CreateProfileBody) =>
      apiClient.post<{ profileId: number }>(`/payroll/workers/${workerId}/profiles`, body, undefined, profileCreateC),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: payrollQueryKeys.payroll.worker(workerId) });
      void qc.invalidateQueries({ queryKey: [...payrollQueryKeys.payroll.all, "employees"] });
    },
  });
}

export function usePatchWorkerProfile(workerId: string) {
  const qc = useQueryClient();
  return useAuthorizedMutation("payroll:salaries:update", {
    mutationKey: ["payroll", "workers", workerId, "patch-profile"],
    mutationFn: ({ profileId, body }: { profileId: number; body: Partial<CreateProfileBody> }) =>
      apiClient.patch<{ ok: boolean }>(
        `/payroll/workers/${workerId}/profiles/${profileId}`,
        body, undefined, okResponseC,
      ),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: payrollQueryKeys.payroll.worker(workerId) });
      void qc.invalidateQueries({ queryKey: [...payrollQueryKeys.payroll.all, "employees"] });
    },
  });
}

export function useWorkerProfile(workerId: string) {
  const canView = useCan("payroll:salaries:view");
  return useQuery({
    queryKey: payrollQueryKeys.payroll.worker(workerId),
    queryFn: ({ signal }) =>
      apiClient.get(`/payroll/workers/${workerId}`, undefined, signal, profileDetailC),
    staleTime: 60_000,
    enabled: canView && !!workerId,
  });
}

export function useWorkerProfileHistory(workerId: string) {
  const canView = useCan("payroll:salaries:view");
  return useQuery({
    queryKey: [...payrollQueryKeys.payroll.worker(workerId), "history"],
    queryFn: ({ signal }) =>
      apiClient.get(`/payroll/workers/${workerId}/history`, undefined, signal, profileHistoryC),
    staleTime: 60_000,
    enabled: canView && !!workerId,
  });
}

export function useCreateProfile(employeeUserId: string) {
  const qc = useQueryClient();
  return useAuthorizedMutation("payroll:salaries:update", {
    mutationKey: ["payroll", "employees", employeeUserId, "create-profile"],
    mutationFn: (body: CreateProfileBody) =>
      apiClient.post<{ id: number }>(`/payroll/employees/${employeeUserId}/profiles`, body, undefined, idResponseC),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: payrollQueryKeys.payroll.employee(employeeUserId) });
      void qc.invalidateQueries({ queryKey: payrollQueryKeys.payroll.employeeHistory(employeeUserId) });
      void qc.invalidateQueries({ queryKey: [...payrollQueryKeys.payroll.all, "employees"] });
    },
  });
}

export function usePatchProfile(employeeUserId: string) {
  const qc = useQueryClient();
  return useAuthorizedMutation("payroll:salaries:update", {
    mutationKey: ["payroll", "employees", employeeUserId, "patch-profile"],
    mutationFn: ({ profileId, body }: { profileId: number; body: Partial<CreateProfileBody> }) =>
      apiClient.patch<{ ok: boolean }>(
        `/payroll/employees/${employeeUserId}/profiles/${profileId}`,
        body, undefined, okResponseC,
      ),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: payrollQueryKeys.payroll.employee(employeeUserId) });
      void qc.invalidateQueries({ queryKey: payrollQueryKeys.payroll.employeeHistory(employeeUserId) });
      void qc.invalidateQueries({ queryKey: [...payrollQueryKeys.payroll.all, "employees"] });
    },
  });
}
