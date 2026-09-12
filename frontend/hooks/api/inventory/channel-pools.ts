"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { useIdempotentMutation } from "./use-idempotent-mutation";
import { queryKeys } from "@/lib/query-keys";
import { useCan } from "@/hooks/api/access";

/**
 * NEO-1 — what each sales channel is holding back from everyone else.
 *
 * Quantities are decimal **strings** all the way from `numeric(18,4)`. Parsing
 * them to `number` here would put a float round-trip on the one figure the whole
 * feature exists to keep exact; format at the point of display instead.
 */
export interface ChannelPool {
  id: number;
  channelId: number;
  channelName: string;
  warehouseId: number | null;
  productVariantId: number;
  reservedQty: string;
  publishedQty: string;
  updatedAt: string;
}

export interface ChannelAvailability {
  productVariantId: number;
  warehouseId: number | null;
  available: string;
  reservedByOthers: string;
  reservedForChannel: string;
  netAvailable: string;
}

interface AllocateChannelPoolInput {
  channelId: number;
  productVariantId: number;
  warehouseId?: number | null;
  /** Signed: positive claims stock for the channel, negative gives it back. */
  deltaQty: string;
}

/**
 * Gated on `inventory:stock:read`, matching the server: "why does this SKU show
 * 10 on hand and 4 available" is a stock question, and a supervisor who cannot
 * administer marketplace connections still has to be able to answer it.
 */
export function useVariantChannelPools(productVariantId: number | null, warehouseId?: number | null) {
  const canView = useCan("inventory:stock:read");
  return useQuery<ChannelPool[], Error>({
    queryKey: queryKeys.inventory.channelPoolsByVariant(productVariantId ?? 0, warehouseId ?? null),
    queryFn: ({ signal }) =>
      apiClient.get<ChannelPool[]>("/inventory/channels/pools/by-variant", {
        productVariantId: String(productVariantId ?? 0),
        ...(warehouseId != null ? { warehouseId: String(warehouseId) } : {}),
      }, signal),
    enabled: canView && (productVariantId ?? 0) > 0,
    staleTime: 30_000,
  });
}

export function useChannelPoolAvailability(
  productVariantId: number | null,
  options?: { warehouseId?: number | null; forChannelId?: number | null },
) {
  const canView = useCan("inventory:stock:read");
  return useQuery<ChannelAvailability, Error>({
    queryKey: queryKeys.inventory.channelPoolAvailability(
      productVariantId ?? 0,
      options?.warehouseId ?? null,
      options?.forChannelId ?? null,
    ),
    queryFn: ({ signal }) =>
      apiClient.get<ChannelAvailability>("/inventory/channels/pools/availability", {
        productVariantId: String(productVariantId ?? 0),
        ...(options?.warehouseId != null ? { warehouseId: String(options.warehouseId) } : {}),
        ...(options?.forChannelId != null ? { forChannelId: String(options.forChannelId) } : {}),
      }, signal),
    enabled: canView && (productVariantId ?? 0) > 0,
    staleTime: 30_000,
  });
}

export function useChannelPools(channelId: number | null) {
  const canManage = useCan("inventory:channels:manage");
  return useQuery<ChannelPool[], Error>({
    queryKey: queryKeys.inventory.channelPools(channelId ?? 0),
    queryFn: ({ signal }) =>
      apiClient.get<ChannelPool[]>(
        `/inventory/channels/pools/channel/${channelId}`,
        undefined,
        signal,
      ),
    enabled: canManage && (channelId ?? 0) > 0,
    staleTime: 30_000,
  });
}

export function useAllocateChannelPool() {
  const qc = useQueryClient();
  return useIdempotentMutation<ChannelPool, Error, AllocateChannelPoolInput>({
    mutationKey: ["inventory", "channel-pool", "allocate"],
    // `apiClient` mints the `Idempotency-Key` for every mutating request, and the
    // server refuses this command without one — a retried allocation must not be
    // able to claim the units a second time.
    mutationFn: (data, idempotencyKey) => apiClient.post<ChannelPool>("/inventory/channels/pools/allocate", data, { headers: { "Idempotency-Key": idempotencyKey } }),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: queryKeys.inventory.channelPools(vars.channelId) });
      qc.invalidateQueries({ queryKey: queryKeys.inventory.channelPoolsAll });
      // A claim changes what may be promised, so every availability figure on
      // screen is now stale — including the stock list's.
      qc.invalidateQueries({ queryKey: queryKeys.inventory.stockLevelsList });
    },
  });
}
