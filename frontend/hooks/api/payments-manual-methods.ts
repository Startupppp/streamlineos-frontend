"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";

export type ManualMethodType = "bank_transfer" | "upi" | "cheque" | "cash" | "other";
export type ManualMethodStatus = "enabled" | "missing_instructions" | "disabled";

export type PaymentManualMethod = {
  id: number;
  methodType: ManualMethodType;
  displayName: string;
  instructions: string | null;
  bankName: string | null;
  accountHolder: string | null;
  maskedAccountNumber: string | null;
  ifscSwiftIban: string | null;
  upiId: string | null;
  paymentReferenceInstructions: string | null;
  requireManualApproval: boolean;
  status: ManualMethodStatus;
};

export type SaveManualMethodPayload = {
  methodType: ManualMethodType;
  displayName: string;
  instructions?: string;
  bankName?: string;
  accountHolder?: string;
  maskedAccountNumber?: string;
  ifscSwiftIban?: string;
  upiId?: string;
  paymentReferenceInstructions?: string;
  requireManualApproval?: boolean;
};

export function useManualMethods() {
  return useQuery({
    queryKey: [...queryKeys.payments.all, "manual-methods"],
    queryFn: () => apiClient.get<PaymentManualMethod[]>("/payments/manual-methods"),
    staleTime: 30_000,
  });
}

export function useSaveManualMethod() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["save", "manual", "method"],
    mutationFn: (payload: SaveManualMethodPayload) =>
      apiClient.post<PaymentManualMethod>("/payments/manual-methods", payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: [...queryKeys.payments.all, "manual-methods"] }),
  });
}

export function useDisableManualMethod() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["disable", "manual", "method"],
    mutationFn: (id: number) => apiClient.post(`/payments/manual-methods/${id}/disable`, {}),
    onSuccess: () => qc.invalidateQueries({ queryKey: [...queryKeys.payments.all, "manual-methods"] }),
  });
}
