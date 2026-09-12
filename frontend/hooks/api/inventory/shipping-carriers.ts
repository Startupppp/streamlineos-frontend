"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import { useCan } from "@/hooks/api/access";
import { useIdempotentMutation } from "@/hooks/api/inventory/use-idempotent-mutation";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";

export interface Carrier {
  id: number;
  orgId: string;
  name: string;
  code: string;
  trackingUrlTemplate?: string | null;
  transport?: string | null;
  apiBaseUrl?: string | null;
  apiCredentialHint?: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export function useCarriers() {
  const canView = useCan("inventory:shipments:manage");
  return useQuery<Carrier[], Error>({
    queryKey: queryKeys.inventory.carriers(),
    queryFn: ({ signal }) => apiClient.get<Carrier[]>("/inventory/carriers", undefined, signal),
    staleTime: 30_000,
    enabled: canView,
  });
}

export function useCreateCarrier() {
  const qc = useQueryClient();
  return useIdempotentMutation<
    Carrier,
    Error,
    { name: string; code: string; trackingUrlTemplate?: string; isActive?: boolean }
  >({
    mutationKey: ["inventory", "carrier", "create"],
    mutationFn: (data, idempotencyKey) => apiClient.post<Carrier>("/inventory/carriers", data, { headers: { "Idempotency-Key": idempotencyKey } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.inventory.carriers() });
    },
  });
}

export function useUpdateCarrier() {
  const qc = useQueryClient();
  return useAuthorizedMutation<
    Carrier,
    Error,
    { carrierId: number; name?: string; code?: string; trackingUrlTemplate?: string; isActive?: boolean }
  >("inventory:shipments:manage", {
    mutationKey: ["inventory", "carrier", "update"],
    mutationFn: ({ carrierId, ...data }) =>
      apiClient.patch<Carrier>(`/inventory/carriers/${carrierId}`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.inventory.carriers() });
    },
  });
}

export interface SetCarrierCredentialsData {
  carrierId: number;
  transport?: string | null;
  apiBaseUrl?: string | null;
  apiCredential?: string | null;
  webhookSecret?: string | null;
}

export interface SetCarrierCredentialsResult {
  carrierId: number;
  apiCredentialHint: string | null;
  webhookSecretSet: boolean;
}

export function useSetCarrierCredentials() {
  const qc = useQueryClient();
  return useAuthorizedMutation<
    SetCarrierCredentialsResult,
    Error,
    SetCarrierCredentialsData
  >("inventory:shipments:manage", {
    mutationKey: ["inventory", "carrier", "setCredentials"],
    mutationFn: ({ carrierId, ...data }) =>
      apiClient.put<SetCarrierCredentialsResult>(`/inventory/carriers/${carrierId}/credentials`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.inventory.carriers() });
    },
  });
}

