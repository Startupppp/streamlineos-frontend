"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import { useCan } from "@/hooks/api/access";
import type { RecallStatus } from "@/features/inventory/lib";

/**
 * Inspections and holds live in their own modules and are re-exported here, so
 * every importer is unchanged. Recalls stay: the backend's response-shape drift
 * spec reads the `RecallImpact*` types, and the simulate call, from this file by
 * name.
 */
export * from "./quality-inspections";
export * from "./quality-holds";

interface RecallLine {
  id: number;
  productVariantId?: number | null;
  lotId?: number | null;
  serialId?: number | null;
  /**
   * INV-33. What the quarantine leg did to this line — `QUARANTINED`,
   * `NOTHING_TO_QUARANTINE` or `NOT_QUARANTINABLE`, and `OPEN` on a recall
   * raised before the outcome was recorded. Widened to `string` because the
   * column is `text` and a value this build has not heard of must render as
   * pending rather than crash a safety screen; narrow with
   * `toRecallLineQuarantine`.
   */
  status?: string | null;
}

interface AffectedShipment {
  shipmentId: number;
  shipmentNumber: string;
}

/**
 * D4. Mirrors `inv_recall_events` as `findOne` actually returns it.
 *
 * It used to declare `reason`, `severity`, `notes`, `lotNumber` and
 * `affectedCustomers` — five fields the API has never sent. Nothing failed:
 * the Severity column rendered an em dash on every row for ever, and the
 * "Reason" block rendered `undefined`. A response type that describes columns
 * the server does not have is not documentation, it is a screen that is
 * quietly always empty.
 */
interface Recall {
  id: number;
  orgId: string;
  recallNumber: string;
  title: string;
  description?: string | null;
  status: RecallStatus;
  /** The impact set this recall was executed against, if it was simulated. */
  evidenceVersion?: string | null;
  lines: RecallLine[];
  affectedShipments?: AffectedShipment[];
  closedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

type RecallListResponse = {
  items: Recall[];
  total: number;
  page: number;
  totalPages: number;
};

/**
 * D4 — the question a recall is about.
 *
 * Every supplied criterion narrows: lot ids AND a variant AND a date range is
 * the intersection, which is the reading a filter bar teaches and the only one
 * that cannot silently widen a recall.
 */
export interface RecallSelection {
  [key: string]: unknown;
  lotIds?: number[];
  productVariantIds?: number[];
  vendorId?: number;
  manufacturedFrom?: string;
  manufacturedTo?: string;
  expiryFrom?: string;
  expiryTo?: string;
}

export interface RecallImpactLot {
  lotId: number;
  lotNumber: string;
  productVariantId: number;
  variantSku: string;
  variantName: string;
  status: string;
  manufactureDate: string | null;
  expiryDate: string | null;
}

export interface RecallImpactOnHandRow {
  lotId: number;
  locationId: number;
  locationName: string;
  warehouseId: number;
  warehouseName: string;
  onHand: string;
  qualityHold: string;
}

export interface RecallImpactTransitRow {
  lotId: number;
  transferId: number;
  referenceNumber: string;
  status: string;
  quantity: string;
  fromLocationId: number;
  toLocationId: number;
}

export interface RecallImpactShippedRow {
  lotId: number;
  shipmentId: number;
  shipmentNumber: string;
  status: string;
  shippedAt: string | null;
  salesOrderId: number | null;
  salesOrderNumber: string | null;
  quantity: string;
}

export interface RecallImpactReturnedRow {
  lotId: number;
  returnId: number;
  returnNumber: string;
  status: string;
  quantity: string;
}

export interface RecallImpact {
  selection: RecallSelection;
  warehouseScope: string;
  lots: RecallImpactLot[];
  onHand: RecallImpactOnHandRow[];
  inTransit: RecallImpactTransitRow[];
  shipped: RecallImpactShippedRow[];
  returned: RecallImpactReturnedRow[];
  totals: {
    lots: number;
    onHand: string;
    onQualityHold: string;
    inTransit: string;
    shipped: string;
    returned: string;
  };
  /** Present this back on execute; a moved picture is refused, not acted on. */
  evidenceVersion: string;
}

export type CreateRecallPayload =
  | { title: string; description?: string; selection: RecallSelection; evidenceVersion: string }
  | {
      title: string;
      description?: string;
      lines: { productVariantId?: number; lotId?: number; serialId?: number }[];
    };

export type { Recall };

interface RecallsParams {
  [key: string]: unknown;
  page?: number;
  limit?: number;
}

export function useRecalls(params?: RecallsParams) {
  const canView = useCan("inventory:quality:read");
  return useQuery<RecallListResponse, Error>({
    queryKey: queryKeys.inventory.recalls(params),
    queryFn: () =>
      apiClient.get<RecallListResponse>("/inventory/quality/recalls", {
        ...(params?.page ? { page: String(params.page) } : {}),
        ...(params?.limit ? { limit: String(params.limit) } : {}),
      }),
    staleTime: 30_000,
    enabled: canView,
  });
}

export function useRecall(recallId: number) {
  const canView = useCan("inventory:quality:read");
  return useQuery<Recall, Error>({
    queryKey: queryKeys.inventory.recall(recallId),
    queryFn: () => apiClient.get<Recall>(`/inventory/quality/recalls/${recallId}`),
    staleTime: 60_000,
    enabled: canView && recallId > 0,
  });
}

/**
 * D4 — what a recall would do, before anybody does it.
 *
 * A mutation rather than a query even though it reads: the endpoint is a POST
 * because a selection does not fit in a query string, and — more to the point
 * — simulating is an act the operator takes, not something a screen should do
 * on mount while they are still typing lot numbers into it. It writes nothing
 * server-side, so it carries no `Idempotency-Key` and invalidates nothing.
 */
export function useSimulateRecall() {
  return useMutation<RecallImpact, Error, RecallSelection>({
    mutationKey: ["inventory", "quality", "recall", "simulate"],
    mutationFn: (selection) =>
      apiClient.post<RecallImpact>("/inventory/quality/recalls/simulate", { selection }),
  });
}

/**
 * D4 — execute a recall.
 *
 * `selection` + `evidenceVersion` is the simulated form: the server re-runs the
 * simulation and refuses with a 409 if the picture has moved since the operator
 * read it. `lines` is the explicit form, for a caller naming lots outright.
 *
 * The `Idempotency-Key` is minted per attempt and held by the caller across
 * retries — a recall posts stock movements, and a retry that mints a fresh key
 * raises a second recall against the same lots.
 */
export function useCreateRecall() {
  const qc = useQueryClient();
  return useMutation<Recall, Error, CreateRecallPayload & { idempotencyKey: string }>({
    mutationKey: ["inventory", "quality", "recall", "create"],
    mutationFn: ({ idempotencyKey, ...data }) =>
      apiClient.post<Recall>("/inventory/quality/recalls", data, {
        headers: { "Idempotency-Key": idempotencyKey },
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.inventory.recalls() });
      void qc.invalidateQueries({ queryKey: queryKeys.inventory.qualityHolds() });
      void qc.invalidateQueries({ queryKey: queryKeys.inventory.stockLevels() });
      void qc.invalidateQueries({ queryKey: queryKeys.inventory.lots() });
      void qc.invalidateQueries({ queryKey: queryKeys.inventory.dashboard() });
      void qc.invalidateQueries({ queryKey: queryKeys.recallSimulation.impactList });
    },
  });
}

export function useUpdateRecall() {
  const qc = useQueryClient();
  return useMutation<
    Recall,
    Error,
    { recallId: number; status?: RecallStatus; notes?: string }
  >({
    mutationKey: ["inventory", "quality", "recall", "update"],
    mutationFn: ({ recallId, ...data }) =>
      apiClient.patch<Recall>(`/inventory/quality/recalls/${recallId}`, data),
    onSuccess: (_, vars) => {
      void qc.invalidateQueries({ queryKey: queryKeys.inventory.recall(vars.recallId) });
      void qc.invalidateQueries({ queryKey: queryKeys.inventory.recalls() });
    },
  });
}
