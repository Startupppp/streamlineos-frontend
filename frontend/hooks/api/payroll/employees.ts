"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import type { EmployeeSalaryProfile, EmployeeProfileDetail } from "@/types/payroll/runs";

export const employeeProfileKeys = {
  all: ["payroll", "employees"] as const,
  list: (params?: Record<string, string | number>) =>
    ["payroll", "employees", "list", params ?? {}] as const,
  detail: (employeeUserId: string) => ["payroll", "employees", employeeUserId] as const,
  history: (employeeUserId: string) => ["payroll", "employees", employeeUserId, "history"] as const,
};

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
    queryKey: employeeProfileKeys.list(params as Record<string, string | number> | undefined),
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
    queryKey: employeeProfileKeys.detail(employeeUserId),
    queryFn: () =>
      apiClient.get<EmployeeProfileDetail>(`/payroll/employees/${employeeUserId}`),
    staleTime: 60_000,
  });
}

export function useEmployeeProfileHistory(employeeUserId: string) {
  return useQuery({
    queryKey: employeeProfileKeys.history(employeeUserId),
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
      qc.invalidateQueries({ queryKey: employeeProfileKeys.detail(employeeUserId) });
      qc.invalidateQueries({ queryKey: employeeProfileKeys.history(employeeUserId) });
      qc.invalidateQueries({ queryKey: employeeProfileKeys.list() });
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
      qc.invalidateQueries({ queryKey: employeeProfileKeys.detail(employeeUserId) });
      qc.invalidateQueries({ queryKey: employeeProfileKeys.history(employeeUserId) });
      qc.invalidateQueries({ queryKey: employeeProfileKeys.list() });
    },
  });
}
