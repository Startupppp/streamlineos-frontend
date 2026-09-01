"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";

export interface AccessRequest {
  id: string;
  orgId: string;
  employeeId: string;
  systemName: string;
  accessLevel: string;
  status: "requested" | "granted" | "revoked";
  grantedBy: string | null;
  revokedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateAccessRequestInput {
  employeeId: string;
  systemName: string;
  accessLevel: string;
}

export interface PatchAccessRequestInput {
  status: "requested" | "granted" | "revoked";
  grantedBy?: string;
}

const AR_KEY = ["streamlineos", "hr", "access-requests"] as const;

export function useAccessRequests(employeeId?: string) {
  return useQuery<AccessRequest[]>({
    queryKey: [...AR_KEY, { employeeId }],
    queryFn: ({ signal }) =>
      apiClient.get<AccessRequest[]>("/hr/access-requests", employeeId ? { employeeId } : undefined, signal),
    staleTime: 60_000,
  });
}

export function useCreateAccessRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: [...AR_KEY, "create"],
    mutationFn: (data: CreateAccessRequestInput) =>
      apiClient.post<AccessRequest>("/hr/access-requests", data),
    onSuccess: () => qc.invalidateQueries({ queryKey: AR_KEY }),
  });
}

export function useUpdateAccessRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: [...AR_KEY, "update"],
    mutationFn: ({ id, ...data }: PatchAccessRequestInput & { id: string }) =>
      apiClient.patch<AccessRequest>(`/hr/access-requests/${id}`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: AR_KEY }),
  });
}
