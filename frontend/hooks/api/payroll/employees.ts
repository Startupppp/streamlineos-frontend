"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
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
  return useQuery({
    queryKey: queryKeys.payroll.employees(params as Record<string, unknown> | undefined),
    queryFn: () =>
      apiClient.get<PaginatedProfiles>(
        "/payroll/employees",
        params as Record<string, string | number> | undefined,
      ),
    staleTime: 60_000,
  });
}

export function useEmployeeProfile(employeeUserId: string) {
  return useQuery({
    queryKey: queryKeys.payroll.employee(employeeUserId),
    queryFn: () =>
      apiClient.get<EmployeeProfileDetail>(`/payroll/employees/${employeeUserId}`),
    staleTime: 60_000,
  });
}

export function useEmployeeProfileHistory(employeeUserId: string) {
  return useQuery({
    queryKey: queryKeys.payroll.employeeHistory(employeeUserId),
    queryFn: () =>
      apiClient.get<EmployeeSalaryProfile[]>(`/payroll/employees/${employeeUserId}/history`),
    staleTime: 60_000,
  });
}

export function useCreateProfile(employeeUserId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["payroll", "employees", employeeUserId, "create-profile"],
    mutationFn: (body: CreateProfileBody) =>
      apiClient.post<{ id: number }>(`/payroll/employees/${employeeUserId}/profiles`, body),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.payroll.employee(employeeUserId) });
      void qc.invalidateQueries({ queryKey: queryKeys.payroll.employeeHistory(employeeUserId) });
      void qc.invalidateQueries({ queryKey: [...queryKeys.payroll.all, "employees"] });
    },
  });
}

export function usePatchProfile(employeeUserId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["payroll", "employees", employeeUserId, "patch-profile"],
    mutationFn: ({ profileId, body }: { profileId: number; body: Partial<CreateProfileBody> }) =>
      apiClient.patch<{ ok: boolean }>(
        `/payroll/employees/${employeeUserId}/profiles/${profileId}`,
        body,
      ),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.payroll.employee(employeeUserId) });
      void qc.invalidateQueries({ queryKey: queryKeys.payroll.employeeHistory(employeeUserId) });
      void qc.invalidateQueries({ queryKey: [...queryKeys.payroll.all, "employees"] });
    },
  });
}
