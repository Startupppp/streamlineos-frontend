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
    queryFn: () => apiClient.get("/hr/signatures/sent").then((r) => r.data),
    staleTime: 30_000,
  });
}

export function useReceivedSignatureRequests() {
  return useQuery<SignatureRequest[]>({
    queryKey: ["hr", "signatures", "received"],
    queryFn: () => apiClient.get("/hr/signatures/received").then((r) => r.data),
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
    ) => apiClient.post("/hr/signatures", data).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["hr", "signatures"] }),
  });
}

export function useSignDocument() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["hr", "signatures", "sign"],
    mutationFn: ({ id, signatureUrl }: { id: number; signatureUrl: string }) =>
      apiClient.post(`/hr/signatures/${id}/sign`, { signatureUrl }).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["hr", "signatures"] }),
  });
}

export function useVoidSignatureRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["hr", "signatures", "void"],
    mutationFn: (id: number) => apiClient.patch(`/hr/signatures/${id}/void`).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["hr", "signatures"] }),
  });
}
