"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import { useCan } from "@/hooks/api/access";
import { useIdempotentMutation } from "@/hooks/api/inventory/use-idempotent-mutation";

/**
 * NEO-2 / NEO-3 - platform purchase orders, ASNs and fill rate.
 *
 * Quantities stay decimal **strings** end to end. A fill rate is quoted back to
 * a platform and argued over; the one thing it must not be is a float that
 * disagrees with the arithmetic somebody did by hand.
 */
export type QuickCommerceProvider = "BLINKIT" | "INSTAMART" | "ZEPTO";
export type PlatformPoStatus = "RECEIVED" | "REJECTED" | "ACCEPTED" | "CANCELLED";
export type AsnStatus = "DRAFT" | "CONFIRMED" | "IN_TRANSIT" | "ARRIVED" | "CLOSED" | "CANCELLED";

export interface PlatformPoSummary {
  id: number;
  provider: QuickCommerceProvider;
  providerPoNumber: string;
  status: PlatformPoStatus;
  destinationRef: string | null;
  expectedDeliveryDate: string | null;
  poId: number | null;
  rejectionReason: string | null;
  createdAt: string;
}

export interface PlatformPoLine {
  id: number;
  lineOrder: number;
  providerSku: string | null;
  ean: string | null;
  mrpPaise: number | null;
  packSize: number | null;
  quantityOrdered: string;
  unitCost: string | null;
  productVariantId: number | null;
  validationError: string | null;
}

export interface PlatformPoDetail extends PlatformPoSummary {
  channelId: number | null;
  warehouseId: number | null;
  currency: string;
  lines: PlatformPoLine[];
}

export interface AsnSummary {
  id: number;
  asnNumber: string;
  poId: number;
  platformPoId: number | null;
  warehouseId: number | null;
  status: AsnStatus;
  carrierName: string | null;
  appointmentStart: string | null;
  appointmentEnd: string | null;
  expectedArrival: string | null;
  createdAt: string;
}

export interface FillRateLine {
  platformPoLineId: number;
  productVariantId: number | null;
  providerSku: string | null;
  ean: string | null;
  orderedQty: string;
  receivedQty: string;
  shippedQty: string;
  returnedQty: string;
  acceptedQty: string;
  fillRatePct: string;
  payoutQty: string;
  payoutAmountPaise: number;
  payoutVariance: string | null;
}

export interface FillRateReport {
  platformPoId: number;
  provider: QuickCommerceProvider;
  providerPoNumber: string;
  status: PlatformPoStatus;
  warehouseId: number | null;
  orderedQty: string;
  acceptedQty: string;
  fillRatePct: string;
  lines: FillRateLine[];
  unmatchedPayoutLines: Array<{
    id: number;
    payoutRef: string;
    providerPoNumber: string | null;
    providerSku: string | null;
    ean: string | null;
    quantity: string;
    amountPaise: number;
    unmatchedReason: string | null;
  }>;
}

interface IngestPlatformPoInput {
  provider: QuickCommerceProvider;
  payload: unknown;
  warehouseId?: number;
}

interface AcceptPlatformPoInput {
  platformPoId: number;
  vendorId: number;
  warehouseId: number;
  orderDate: string;
  reserveIntoChannelPool?: boolean;
}

export function usePlatformPurchaseOrders(filters?: {
  provider?: QuickCommerceProvider;
  status?: PlatformPoStatus;
}) {
  const canView = useCan("inventory:channels:manage");
  return useQuery<PlatformPoSummary[], Error>({
    queryKey: queryKeys.inventory.platformPurchaseOrders(filters),
    queryFn: () =>
      apiClient.get<PlatformPoSummary[]>("/inventory/quick-commerce/purchase-orders", {
        ...(filters?.provider ? { provider: filters.provider } : {}),
        ...(filters?.status ? { status: filters.status } : {}),
      }),
    enabled: canView,
    staleTime: 30_000,
  });
}

export function usePlatformPurchaseOrder(platformPoId: number | null) {
  const canView = useCan("inventory:channels:manage");
  return useQuery<PlatformPoDetail, Error>({
    queryKey: queryKeys.inventory.platformPurchaseOrder(platformPoId ?? 0),
    queryFn: () =>
      apiClient.get<PlatformPoDetail>(`/inventory/quick-commerce/purchase-orders/${platformPoId}`),
    enabled: canView && (platformPoId ?? 0) > 0,
    staleTime: 30_000,
  });
}

export function useIngestPlatformPo() {
  const qc = useQueryClient();
  return useIdempotentMutation<PlatformPoDetail, Error, IngestPlatformPoInput>({
    mutationKey: ["inventory", "quick-commerce", "ingest"],
    mutationFn: (data, idempotencyKey) =>
      apiClient.post<PlatformPoDetail>("/inventory/quick-commerce/purchase-orders/ingest", data, { headers: { "Idempotency-Key": idempotencyKey } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.inventory.platformPurchaseOrdersList });
    },
  });
}

export function useAcceptPlatformPo() {
  const qc = useQueryClient();
  return useIdempotentMutation<PlatformPoDetail, Error, AcceptPlatformPoInput>({
    mutationKey: ["inventory", "quick-commerce", "accept"],
    mutationFn: ({ platformPoId, ...data }, idempotencyKey) =>
      apiClient.post<PlatformPoDetail>(
        `/inventory/quick-commerce/purchase-orders/${platformPoId}/accept`,
        data, { headers: { "Idempotency-Key": idempotencyKey } },
      ),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: queryKeys.inventory.platformPurchaseOrdersList });
      qc.invalidateQueries({ queryKey: queryKeys.inventory.platformPurchaseOrder(vars.platformPoId) });
      // Accepting claims stock for the channel, so every availability figure on
      // screen is now stale.
      qc.invalidateQueries({ queryKey: queryKeys.inventory.channelPoolsAll });
      qc.invalidateQueries({ queryKey: queryKeys.inventory.purchaseOrdersList });
    },
  });
}

export function useAsns(filters?: { poId?: number; status?: AsnStatus }) {
  const canView = useCan("inventory:purchase-orders:read");
  return useQuery<AsnSummary[], Error>({
    queryKey: queryKeys.inventory.asns(filters),
    queryFn: () =>
      apiClient.get<AsnSummary[]>("/inventory/quick-commerce/asns", {
        ...(filters?.poId ? { poId: String(filters.poId) } : {}),
        ...(filters?.status ? { status: filters.status } : {}),
      }),
    enabled: canView,
    staleTime: 30_000,
  });
}

export function useFillRate(platformPoId: number | null) {
  const canView = useCan("inventory:reports:read");
  return useQuery<FillRateReport, Error>({
    queryKey: queryKeys.inventory.platformFillRate(platformPoId ?? 0),
    queryFn: () =>
      apiClient.get<FillRateReport>("/inventory/quick-commerce/fill-rate", {
        platformPoId: String(platformPoId ?? 0),
      }),
    enabled: canView && (platformPoId ?? 0) > 0,
    staleTime: 30_000,
  });
}

interface UploadPayoutInput {
  provider: QuickCommerceProvider;
  payoutRef: string;
  settledOn?: string;
  lines: Array<{
    providerPoNumber?: string;
    providerSku?: string;
    ean?: string;
    quantity: string;
    amountPaise: number;
  }>;
}

export function useUploadPayout() {
  const qc = useQueryClient();
  return useIdempotentMutation<
    { payoutRef: string; submitted: number; stored: number; duplicatesIgnored: number; unmatched: number },
    Error,
    UploadPayoutInput
  >({
    mutationKey: ["inventory", "quick-commerce", "payout"],
    mutationFn: (data, idempotencyKey) =>
      apiClient.post("/inventory/quick-commerce/payouts", data, {
        headers: { "Idempotency-Key": idempotencyKey },
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.inventory.platformFillRateAll });
    },
  });
}
