"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/get-error-message";

export interface LegalHold {
  id: number;
  orgId: string;
  subjectUserId: string | null;
  reason: string;
  status: "active" | "released";
  placedBy: string | null;
  placedAt: string;
  releasedBy: string | null;
  releasedAt: string | null;
  restrictedExport: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface HoldItem {
  id: number;
  holdId: number;
  orgId: string;
  itemType: "employee_profile" | "document" | "case_evidence";
  itemRef: string;
  locked: boolean;
  createdAt: string;
}

export interface LegalHoldsListResponse {
  data: LegalHold[];
  total: number;
  page: number;
  limit: number;
}

const HOLDS_KEY = ["hr", "governance", "legal-holds"] as const;

export function useLegalHolds(params?: { status?: string; subjectUserId?: string; page?: number; limit?: number }) {
  return useQuery<LegalHoldsListResponse>({
    queryKey: [...HOLDS_KEY, params],
    queryFn: () => {
      const p: Record<string, unknown> = {};
      if (params?.status) p["status"] = params.status;
      if (params?.subjectUserId) p["subjectUserId"] = params.subjectUserId;
      if (params?.page) p["page"] = params.page;
      if (params?.limit) p["limit"] = params.limit;
      return apiClient.get<LegalHoldsListResponse>("/hr/governance/legal-holds", p);
    },
    staleTime: 30_000,
  });
}

export function useHoldItems(holdId: number | undefined) {
  return useQuery<HoldItem[]>({
    queryKey: [...HOLDS_KEY, holdId, "items"],
    queryFn: () => apiClient.get<HoldItem[]>(`/hr/governance/legal-holds/${holdId}/items`),
    enabled: holdId !== undefined,
    staleTime: 30_000,
  });
}

export function useCreateLegalHold() {
  const qc = useQueryClient();
  return useMutation<LegalHold, Error, { subjectUserId: string; reason: string; restrictedExport?: boolean }>({
    mutationKey: ["hr", "governance", "legal-holds", "create"],
    mutationFn: (payload) => apiClient.post<LegalHold>("/hr/governance/legal-holds", payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: HOLDS_KEY });
      toast.success("Legal hold placed successfully");
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });
}

export function useReleaseLegalHold() {
  const qc = useQueryClient();
  return useMutation<LegalHold, Error, number>({
    mutationKey: ["hr", "governance", "legal-holds", "release"],
    mutationFn: (holdId) => apiClient.post<LegalHold>(`/hr/governance/legal-holds/${holdId}/release`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: HOLDS_KEY });
      toast.success("Legal hold released");
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });
}

export function useDeleteLegalHold() {
  const qc = useQueryClient();
  return useMutation<void, Error, number>({
    mutationKey: ["hr", "governance", "legal-holds", "delete"],
    mutationFn: (holdId) => apiClient.delete<void>(`/hr/governance/legal-holds/${holdId}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: HOLDS_KEY });
      toast.success("Legal hold deleted");
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });
}

export function useAttachHoldItem() {
  const qc = useQueryClient();
  return useMutation<HoldItem, Error, { holdId: number; itemType: string; itemRef: string; locked?: boolean }>({
    mutationKey: ["hr", "governance", "legal-holds", "attach-item"],
    mutationFn: ({ holdId, ...payload }) =>
      apiClient.post<HoldItem>(`/hr/governance/legal-holds/${holdId}/items`, payload),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: [...HOLDS_KEY, vars.holdId, "items"] });
      toast.success("Item attached to hold");
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });
}

export function useDetachHoldItem() {
  const qc = useQueryClient();
  return useMutation<void, Error, { holdId: number; itemId: number }>({
    mutationKey: ["hr", "governance", "legal-holds", "detach-item"],
    mutationFn: ({ holdId, itemId }) =>
      apiClient.delete<void>(`/hr/governance/legal-holds/${holdId}/items/${itemId}`),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: [...HOLDS_KEY, vars.holdId, "items"] });
      toast.success("Item removed from hold");
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });
}
