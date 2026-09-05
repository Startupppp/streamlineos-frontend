"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { payrollQueryKeys } from "@/lib/query-keys/payroll";
import { useCan } from "@/hooks/api/access";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";
import type { EmployeeSalaryProfile, EmployeeProfileDetail } from "@/types/payroll/runs";

interface PaginatedProfiles {
  data: EmployeeSalaryProfile[];
  total: number;
  page: number;
  limit: number;
}

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
    queryKey: payrollQueryKeys.payroll.employees(params as Record<string, unknown> | undefined),
    queryFn: ({ signal }) =>
      apiClient.get<PaginatedProfiles>(
        "/payroll/employees",
        params as Record<string, string | number> | undefined, signal,
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
      apiClient.get<EmployeeProfileDetail>(`/payroll/employees/${employeeUserId}`, undefined, signal),
    staleTime: 60_000,
    enabled: canView && !!employeeUserId,
  });
}

export function useEmployeeProfileHistory(employeeUserId: string) {
  const canView = useCan("payroll:salaries:view");
  return useQuery({
    queryKey: payrollQueryKeys.payroll.employeeHistory(employeeUserId),
    queryFn: ({ signal }) =>
      apiClient.get<EmployeeSalaryProfile[]>(`/payroll/employees/${employeeUserId}/history`, undefined, signal),
    staleTime: 60_000,
    enabled: canView && !!employeeUserId,
  });
}

export function useCreateWorkerProfile(workerId: string) {
  const qc = useQueryClient();
  return useAuthorizedMutation("payroll:salaries:update", {
    mutationKey: ["payroll", "workers", workerId, "create-profile"],
    mutationFn: (body: CreateProfileBody) =>
      apiClient.post<{ profileId: number }>(`/payroll/workers/${workerId}/profiles`, body),
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
        body,
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
      apiClient.get<EmployeeProfileDetail>(`/payroll/workers/${workerId}`, undefined, signal),
    staleTime: 60_000,
    enabled: canView && !!workerId,
  });
}

export function useWorkerProfileHistory(workerId: string) {
  const canView = useCan("payroll:salaries:view");
  return useQuery({
    queryKey: [...payrollQueryKeys.payroll.worker(workerId), "history"],
    queryFn: ({ signal }) =>
      apiClient.get<EmployeeSalaryProfile[]>(`/payroll/workers/${workerId}/history`, undefined, signal),
    staleTime: 60_000,
    enabled: canView && !!workerId,
  });
}

export function useCreateProfile(employeeUserId: string) {
  const qc = useQueryClient();
  return useAuthorizedMutation("payroll:salaries:update", {
    mutationKey: ["payroll", "employees", employeeUserId, "create-profile"],
    mutationFn: (body: CreateProfileBody) =>
      apiClient.post<{ id: number }>(`/payroll/employees/${employeeUserId}/profiles`, body),
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
        body,
      ),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: payrollQueryKeys.payroll.employee(employeeUserId) });
      void qc.invalidateQueries({ queryKey: payrollQueryKeys.payroll.employeeHistory(employeeUserId) });
      void qc.invalidateQueries({ queryKey: [...payrollQueryKeys.payroll.all, "employees"] });
    },
  });
}
