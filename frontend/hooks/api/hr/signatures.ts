import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";

export interface SignatureSigner {
  userId: string;
  order: number;
  signedAt?: string;
  signatureUrl?: string;
  status: string;
}

export interface AuditEntry {
  action: string;
  userId: string;
  timestamp: string;
}

export interface SignatureRequest {
  id: number;
  orgId: string;
  title: string;
  documentType: string;
  documentUrl: string;
  requestedBy: string;
  signers: SignatureSigner[];
  status: "PENDING" | "IN_PROGRESS" | "COMPLETED" | "VOIDED";
  expiresAt?: string;
  completedAt?: string;
  auditTrail: AuditEntry[];
  createdAt: string;
}

export function useSentSignatureRequests() {
  return useQuery<SignatureRequest[]>({
    queryKey: ["hr", "signatures", "sent"],
    queryFn: () => apiClient.get<SignatureRequest[]>("/hr/signatures/sent"),
    staleTime: 30_000,
  });
}

export function useReceivedSignatureRequests() {
  return useQuery<SignatureRequest[]>({
    queryKey: ["hr", "signatures", "received"],
    queryFn: () => apiClient.get<SignatureRequest[]>("/hr/signatures/received"),
    staleTime: 30_000,
  });
}

export function useCreateSignatureRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["hr", "signatures", "create"],
    mutationFn: (
      data: Omit<
        SignatureRequest,
        "id" | "orgId" | "requestedBy" | "status" | "completedAt" | "auditTrail" | "createdAt"
      >,
    ) => apiClient.post<SignatureRequest>("/hr/signatures", data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["hr", "signatures"] }),
  });
}

export function useSignDocument() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["hr", "signatures", "sign"],
    mutationFn: ({ id, signatureUrl }: { id: number; signatureUrl: string }) =>
      apiClient.post<SignatureRequest>(`/hr/signatures/${id}/sign`, { signatureUrl }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["hr", "signatures"] }),
  });
}

export function useVoidSignatureRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["hr", "signatures", "void"],
    mutationFn: (id: number) => apiClient.patch<SignatureRequest>(`/hr/signatures/${id}/void`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["hr", "signatures"] }),
  });
}
