"use client";

import type { z } from "zod";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { platformCoreQueryKeys } from "@/lib/query-keys/platform-core";
import { useCan } from "@/hooks/api/access";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";
import {
  paymentManualMethodListContract,
  paymentManualMethodContract,
} from "@/hooks/api/payments-schema";

export type ManualMethodType = "bank_transfer" | "upi" | "cheque" | "cash" | "other";
export type ManualMethodStatus = "enabled" | "missing_instructions" | "disabled";

export type PaymentManualMethod = z.infer<typeof paymentManualMethodContract>;

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
  const canView = useCan("payments:providers:view");
  return useQuery({
    queryKey: [...platformCoreQueryKeys.payments.all, "manual-methods"],
    queryFn: ({ signal }) => apiClient.get("/payments/manual-methods", undefined, signal, paymentManualMethodListContract),
    staleTime: 30_000,
    enabled: canView,
  });
}

export function useSaveManualMethod() {
  const qc = useQueryClient();
  return useAuthorizedMutation("payments:manual-methods:manage", {
    mutationKey: ["save", "manual", "method"],
    mutationFn: (payload: SaveManualMethodPayload) =>
      apiClient.post("/payments/manual-methods", payload, undefined, paymentManualMethodContract),
    onSuccess: () => qc.invalidateQueries({ queryKey: [...platformCoreQueryKeys.payments.all, "manual-methods"] }),
  });
}

export function useDisableManualMethod() {
  const qc = useQueryClient();
  return useAuthorizedMutation("payments:manual-methods:manage", {
    mutationKey: ["disable", "manual", "method"],
    mutationFn: (id: number) => apiClient.post(`/payments/manual-methods/${id}/disable`, {}, undefined, paymentManualMethodContract),
    onSuccess: () => qc.invalidateQueries({ queryKey: [...platformCoreQueryKeys.payments.all, "manual-methods"] }),
  });
}
