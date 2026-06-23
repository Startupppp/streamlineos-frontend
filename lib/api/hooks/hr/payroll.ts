"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import type {
  Payroll,
  PayrollWithUser,
  SalaryStructure,
  EmployeePayslip,
  GeneratePayrollInput,
  CreateSalaryStructureInput,
  GetEmployeePayslipsInput,
  GetAllPayrollsInput,
  GenerateEmployeePayslipInput,
  ApprovePayrollInput,
  MarkPayrollPaidInput,
} from "@/types/hr";

export function useHrPayrolls() {
  return useQuery({
    queryKey: queryKeys.hr.payrolls(),
    queryFn: () => apiClient.get<Payroll[]>("/hr/payrolls"),
    staleTime: 2 * 60_000,
  });
}

export function useGeneratePayroll() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: GeneratePayrollInput) =>
      apiClient.post<{ generated: number }>("/hr/payrolls", data),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: queryKeys.hr.payrolls() }),
  });
}

export function useHrSalaryStructures(userId?: string) {
  return useQuery({
    queryKey: queryKeys.hr.salaryStructures(userId),
    queryFn: () =>
      apiClient.get<SalaryStructure[]>("/hr/salary-structures", userId ? { userId } : undefined),
    staleTime: 2 * 60_000,
    enabled: true,
  });
}

export function useCreateSalaryStructure() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateSalaryStructureInput) =>
      apiClient.post<SalaryStructure>("/hr/salary-structures", data),
    onSuccess: (_result, variables) =>
      qc.invalidateQueries({
        queryKey: queryKeys.hr.salaryStructures(variables.userId),
      }),
  });
}

export function useHrEmployeePayslips(params?: GetEmployeePayslipsInput) {
  return useQuery({
    queryKey: queryKeys.hr.employeePayslips(params?.userId),
    queryFn: () =>
      apiClient.get<EmployeePayslip[]>(
        "/hr/payslips",
        params as Record<string, unknown> | undefined
      ),
    staleTime: 2 * 60_000,
  });
}

export function useHrAllPayrolls(params: GetAllPayrollsInput) {
  return useQuery({
    queryKey: queryKeys.hr.payrolls(params),
    queryFn: () => {
      const qs: Record<string, string> = {};
      if (params.month) qs.month = params.month;
      if (params.year) qs.year = params.year;
      return apiClient.get<PayrollWithUser[]>("/hr/payrolls/all", qs);
    },
    staleTime: 2 * 60_000,
    enabled: !!(params.month || params.year),
  });
}

export function useGenerateEmployeePayslip() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: GenerateEmployeePayslipInput) =>
      apiClient.post<{ success: boolean }>("/hr/payrolls/generate", data),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: queryKeys.hr.payrolls() }),
  });
}

export function useApprovePayroll() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ payrollId }: ApprovePayrollInput) =>
      apiClient.patch<{ success: boolean }>(`/hr/payrolls/${payrollId}/approve`),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: queryKeys.hr.payrolls() }),
  });
}

export function useMarkPayrollPaid() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ payrollId }: MarkPayrollPaidInput) =>
      apiClient.patch<{ success: boolean }>(`/hr/payrolls/${payrollId}/paid`),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: queryKeys.hr.payrolls() }),
  });
}
