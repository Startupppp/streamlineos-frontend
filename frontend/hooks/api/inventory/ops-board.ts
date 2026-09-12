"use client";

import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import { useCan } from "@/hooks/api/access";

/**
 * B2 — the operations board.
 *
 * Quantities arrive as **strings** and are converted here, once. The API sends
 * decimals as text on purpose: a quantity that leaves Postgres as `numeric` and
 * arrives as a JSON float has already been through a binary double, and
 * `0.1 + 0.2` is a discrepancy no stock count will ever explain. Converting at
 * the seam means the rest of the UI can use numbers for display without any
 * component having to remember why.
 */
function num(value: string | number | null | undefined): number {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

export type AttentionSeverity = "critical" | "warning" | "info";

export interface AttentionItem {
  key: string;
  severity: AttentionSeverity;
  title: string;
  detail: string;
  count: number;
  href: string;
  actionLabel: string | null;
}

export interface OpsQuantities {
  onHand: number;
  available: number;
  reserved: number;
  damaged: number;
  quarantined: number;
  picked: number;
  inTransit: number;
  onOrder: number;
}

export interface OpsSummary {
  quantities: OpsQuantities;
  skuCount: number;
  stockValue: number;
  facilities: { total: number; darkStores: number; zones: number };
}

export interface DarkStoreRow {
  warehouseId: number;
  name: string;
  code: string;
  facilityType: "DARK_STORE" | "WAREHOUSE" | "YARD" | "SITE_STORE";
  zone: string | null;
  zoneLabel: string | null;
  city: string | null;
  deliveryPromiseMinutes: number | null;
  isActive: boolean;
  skuCount: number;
  onHand: number;
  reserved: number;
  damaged: number;
  quarantined: number;
  picked: number;
  inTransit: number;
  available: number;
  stockValue: number;
  outOfStockSkus: number;
}

interface RawSummary {
  quantities: Record<keyof OpsQuantities, string>;
  skuCount: number;
  stockValue: string;
  facilities: { total: number; darkStores: number; zones: number };
}

interface RawDarkStore extends Omit<DarkStoreRow, "onHand" | "reserved" | "damaged" | "quarantined" | "picked" | "inTransit" | "available" | "stockValue"> {
  onHand: string; reserved: string; damaged: string; quarantined: string;
  picked: string; inTransit: string; available: string; stockValue: string;
}

/** Refreshed on a short interval: this is the screen a store lead leaves open. */
const BOARD_STALE_MS = 30_000;

export function useOpsSummary() {
  const canView = useCan("inventory:stock:read");
  return useQuery<OpsSummary, Error>({
    queryKey: queryKeys.inventoryOpsBoard.summary,
    queryFn: async ({ signal }) => {
      const r = await apiClient.get<RawSummary>("/inventory/ops/summary", undefined, signal);
      return {
        quantities: {
          onHand: num(r.quantities.onHand),
          available: num(r.quantities.available),
          reserved: num(r.quantities.reserved),
          damaged: num(r.quantities.damaged),
          quarantined: num(r.quantities.quarantined),
          picked: num(r.quantities.picked),
          inTransit: num(r.quantities.inTransit),
          onOrder: num(r.quantities.onOrder),
        },
        skuCount: r.skuCount,
        stockValue: num(r.stockValue),
        facilities: r.facilities,
      };
    },
    staleTime: BOARD_STALE_MS,
    enabled: canView,
  });
}

export function useAttentionBoard() {
  const canView = useCan("inventory:stock:read");
  return useQuery<{ items: AttentionItem[]; generatedAt: string }, Error>({
    queryKey: queryKeys.inventoryOpsBoard.attention,
    queryFn: ({ signal }) =>
      apiClient.get<{ items: AttentionItem[]; generatedAt: string }>(
        "/inventory/ops/attention",
        undefined,
        signal,
      ),
    staleTime: BOARD_STALE_MS,
    enabled: canView,
  });
}

export function useDarkStores() {
  const canView = useCan("inventory:stock:read");
  return useQuery<DarkStoreRow[], Error>({
    queryKey: queryKeys.inventoryOpsBoard.zones,
    queryFn: async ({ signal }) => {
      const rows = await apiClient.get<RawDarkStore[]>("/inventory/ops/zones", undefined, signal);
      return rows.map((r) => ({
        ...r,
        onHand: num(r.onHand),
        reserved: num(r.reserved),
        damaged: num(r.damaged),
        quarantined: num(r.quarantined),
        picked: num(r.picked),
        inTransit: num(r.inTransit),
        available: num(r.available),
        stockValue: num(r.stockValue),
      }));
    },
    staleTime: BOARD_STALE_MS,
    enabled: canView,
  });
}
