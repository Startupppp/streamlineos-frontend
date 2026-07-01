import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";

export interface AllowanceType {
  id: number;
  orgId: string;
  name: string;
  category: "ALLOWANCE" | "DEDUCTION";
  formulaType: "FIXED" | "PERCENTAGE";
  value: string | null;
  cap: string | null;
  isTaxable: boolean;
  isActive: boolean;
  createdAt: string;
}

export type CreateAllowanceInput = Omit<AllowanceType, "id" | "orgId" | "createdAt">;

export function useAllowances() {
  return useQuery<AllowanceType[]>({
    queryKey: ["hr", "allowances"],
    queryFn: () => apiClient.get<AllowanceType[]>("/hr/payroll/allowances"),
    staleTime: 120_000,
  });
}

export function useCreateAllowance() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["hr", "allowances", "create"],
    mutationFn: (data: CreateAllowanceInput) =>
      apiClient.post<AllowanceType>("/hr/payroll/allowances", data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["hr", "allowances"] }),
  });
}

export function useUpdateAllowance() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["hr", "allowances", "update"],
    mutationFn: ({ id, ...data }: Partial<CreateAllowanceInput> & { id: number }) =>
      apiClient.patch<AllowanceType>(`/hr/payroll/allowances/${id}`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["hr", "allowances"] }),
  });
}

export function useDeleteAllowance() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["hr", "allowances", "delete"],
    mutationFn: (id: number) =>
      apiClient.delete<void>(`/hr/payroll/allowances/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["hr", "allowances"] }),
  });
}
