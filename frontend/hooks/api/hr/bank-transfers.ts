import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";

export type BankTransferStatus = "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED";

export interface BankTransferEntry {
  userId: string;
  amount: number;
  bankAccount: string;
  ifscCode: string;
  employeeName: string;
  status: "PENDING" | "COMPLETED" | "FAILED";
}

export interface BankTransfer {
  id: number;
  orgId: string;
  month: string;
  totalAmount: string;
  employeeCount: number;
  status: BankTransferStatus;
  bankFileUrl: string | null;
  referenceNo: string | null;
  processedAt: string | null;
  createdBy: string | null;
  entries: BankTransferEntry[];
  createdAt: string;
}

export interface CreateBankTransferInput {
  month: string;
  totalAmount: string;
  employeeCount: number;
  entries: BankTransferEntry[];
}

export function useBankTransfers() {
  return useQuery<BankTransfer[]>({
    queryKey: ["hr", "bank-transfers"],
    queryFn: () => apiClient.get<BankTransfer[]>("/hr/payroll/bank-transfers"),
    staleTime: 60_000,
  });
}

export function useCreateBankTransfer() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["hr", "bank-transfers", "create"],
    mutationFn: (data: CreateBankTransferInput) =>
      apiClient.post<BankTransfer>("/hr/payroll/bank-transfers", data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["hr", "bank-transfers"] }),
  });
}

export function useUpdateBankTransfer() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["hr", "bank-transfers", "update"],
    mutationFn: ({ id, ...data }: { id: number; status: string; referenceNo?: string }) =>
      apiClient.patch<BankTransfer>(`/hr/payroll/bank-transfers/${id}`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["hr", "bank-transfers"] }),
  });
}

export function useGenerateBankFile() {
  return useMutation({
    mutationKey: ["hr", "bank-transfers", "generate-file"],
    mutationFn: (id: number) =>
      apiClient.get<{ format: string; data: string; month: string }>(`/hr/payroll/bank-transfers/${id}/file`),
  });
}
