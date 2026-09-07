"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { lazyContract } from "@/lib/api-envelope";
import { useCan } from "@/hooks/api/access";
import { humanResourcesQueryKeys } from "@/lib/query-keys/human-resources";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/get-error-message";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";

const legalHoldListContract = lazyContract(() =>
  import("@/features/hr/governance/hooks/legal-holds-schema").then((m) => m.legalHoldListContract),
);
const legalHoldRowContract = lazyContract(() =>
  import("@/features/hr/governance/hooks/legal-holds-schema").then((m) => m.legalHoldContract),
);
const holdItemListContract = lazyContract(() =>
  import("@/features/hr/governance/hooks/legal-holds-schema").then((m) => m.holdItemListContract),
);
const holdItemRowContract = lazyContract(() =>
  import("@/features/hr/governance/hooks/legal-holds-schema").then((m) => m.holdItemContract),
);
const holdDeleteContract = lazyContract(() =>
  import("@/features/hr/governance/hooks/legal-holds-schema").then((m) => m.holdDeleteContract),
);

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

const HOLDS_KEY = ["hr", "governance", "legal-holds"] as const;

export function useLegalHolds(params?: { status?: string; subjectUserId?: string; page?: number; limit?: number }) {
  const canViewHolds = useCan("hr:legalhold:view");
  return useQuery({
    queryKey: [...humanResourcesQueryKeys.hr.hrLegalHoldsBase, params],
    queryFn: ({ signal }) => {
      const p: Record<string, unknown> = {};
      if (params?.status) p["status"] = params.status;
      if (params?.subjectUserId) p["subjectUserId"] = params.subjectUserId;
      if (params?.page) p["page"] = params.page;
      if (params?.limit) p["limit"] = params.limit;
      return apiClient.get("/hr/governance/legal-holds", p, signal, legalHoldListContract);
    },
    staleTime: 30_000,
    enabled: canViewHolds,
  });
}

export function useHoldItems(holdId: number | undefined) {
  const canViewHolds = useCan("hr:legalhold:view");
  return useQuery({
    queryKey: [...humanResourcesQueryKeys.hr.hrLegalHoldsBase, holdId, "items"],
    queryFn: ({ signal }) => apiClient.get(`/hr/governance/legal-holds/${holdId}/items`, undefined, signal, holdItemListContract),
    enabled: canViewHolds && holdId !== undefined,
    staleTime: 30_000,
  });
}

export function useCreateLegalHold() {
  const qc = useQueryClient();
  return useAuthorizedMutation<unknown, Error, { subjectUserId: string; reason: string; restrictedExport?: boolean }>("hr:legalhold:manage", {
    mutationKey: ["hr", "governance", "legal-holds", "create"],
    mutationFn: (payload) => apiClient.post("/hr/governance/legal-holds", payload, undefined, legalHoldRowContract),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: HOLDS_KEY });
      toast.success("Legal hold placed successfully");
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });
}

export function useReleaseLegalHold() {
  const qc = useQueryClient();
  return useAuthorizedMutation<unknown, Error, number>("hr:legalhold:manage", {
    mutationKey: ["hr", "governance", "legal-holds", "release"],
    mutationFn: (holdId) => apiClient.post(`/hr/governance/legal-holds/${holdId}/release`, undefined, undefined, legalHoldRowContract),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: HOLDS_KEY });
      toast.success("Legal hold released");
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });
}

export function useDeleteLegalHold() {
  const qc = useQueryClient();
  return useAuthorizedMutation<void, Error, number>("hr:legalhold:manage", {
    mutationKey: ["hr", "governance", "legal-holds", "delete"],
    mutationFn: (holdId) => apiClient.delete(`/hr/governance/legal-holds/${holdId}`, undefined, undefined, holdDeleteContract),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: HOLDS_KEY });
      toast.success("Legal hold deleted");
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });
}

export function useAttachHoldItem() {
  const qc = useQueryClient();
  return useAuthorizedMutation<unknown, Error, { holdId: number; itemType: string; itemRef: string; locked?: boolean }>("hr:legalhold:manage", {
    mutationKey: ["hr", "governance", "legal-holds", "attach-item"],
    mutationFn: ({ holdId, ...payload }) =>
      apiClient.post(`/hr/governance/legal-holds/${holdId}/items`, payload, undefined, holdItemRowContract),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: [...humanResourcesQueryKeys.hr.hrLegalHoldsBase, vars.holdId, "items"] });
      toast.success("Item attached to hold");
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });
}

export function useDetachHoldItem() {
  const qc = useQueryClient();
  return useAuthorizedMutation<void, Error, { holdId: number; itemId: number }>("hr:legalhold:manage", {
    mutationKey: ["hr", "governance", "legal-holds", "detach-item"],
    mutationFn: ({ holdId, itemId }) =>
      apiClient.delete(`/hr/governance/legal-holds/${holdId}/items/${itemId}`, undefined, undefined, holdDeleteContract),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: [...humanResourcesQueryKeys.hr.hrLegalHoldsBase, vars.holdId, "items"] });
      toast.success("Item removed from hold");
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });
}
