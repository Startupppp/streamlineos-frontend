"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import { useCan } from "@/hooks/api/access";
import type { InspectionStatus, QualityHoldStatus, RecallStatus } from "@/features/inventory/lib";

interface InspectionFilters {
  [key: string]: unknown;
  status?: InspectionStatus;
  source?: string;
  variantId?: number;
  page?: number;
  limit?: number;
}

interface InspectionLine {
  id: number;
  variantId: number;
  variantName: string;
  lotId?: number | null;
  serialId?: number | null;
  qty: number;
  disposition?: string | null;
  /** D3. What this inspection is holding out of ATP right now. */
  heldQuantity?: string | null;
  /** How many units the governing plan requires be opened. */
  sampleQuantity?: string | null;
  locationId?: number | null;
  planVersionId?: number | null;
}

interface TimelineEntry {
  status: InspectionStatus;
  at: string;
}

interface Inspection {
  id: number;
  orgId: string;
  status: InspectionStatus;
  source: string | null;
  lines: InspectionLine[];
  statusTimeline?: TimelineEntry[];
  /** Set on a compensating correction; the original stays untouched. */
  correctsInspectionId?: number | null;
  correctionReason?: string | null;
  createdAt: string;
  updatedAt: string;
}

interface InspectionDetail extends Inspection {
  statusTimeline: TimelineEntry[];
}

type InspectionListResponse = {
  items: Inspection[];
  total: number;
  page: number;
  totalPages: number;
};

interface QualityHold {
  id: number;
  orgId: string;
  status: QualityHoldStatus;
  productVariantId: number;
  locationId?: number | null;
  lotId?: number | null;
  serialId?: number | null;
  quantity: string;
  reason: string;
  releasedBy?: string | null;
  releasedAt?: string | null;
  createdBy?: string | null;
  createdAt: string;
  updatedAt: string;
  variantName?: string;
  variantSku?: string;
  productName?: string;
}

type HoldListResponse = {
  items: QualityHold[];
  total: number;
  page: number;
  totalPages: number;
};

interface RecallLine {
  id: number;
  productVariantId?: number | null;
  lotId?: number | null;
  serialId?: number | null;
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

export type { Inspection, InspectionLine, QualityHold, Recall };

export function useQualityInspections(filters?: InspectionFilters) {
  const canView = useCan("inventory:quality:read");
  return useQuery<InspectionListResponse, Error>({
    queryKey: queryKeys.inventory.qualityInspections(filters),
    queryFn: () =>
      apiClient.get<InspectionListResponse>("/inventory/quality/inspections", {
        ...(filters?.status ? { status: filters.status } : {}),
        ...(filters?.source ? { source: filters.source } : {}),
        ...(filters?.variantId ? { variantId: String(filters.variantId) } : {}),
        ...(filters?.page ? { page: String(filters.page) } : {}),
        ...(filters?.limit ? { limit: String(filters.limit) } : {}),
      }),
    staleTime: 30_000,
    enabled: canView,
  });
}

export function useQualityInspection(inspectionId: number) {
  const canView = useCan("inventory:quality:read");
  return useQuery<InspectionDetail, Error>({
    queryKey: queryKeys.inventory.qualityInspection(inspectionId),
    queryFn: () =>
      apiClient.get<InspectionDetail>(`/inventory/quality/inspections/${inspectionId}`),
    staleTime: 60_000,
    enabled: canView && inspectionId > 0,
  });
}

export function useCreateInspection() {
  const qc = useQueryClient();
  return useMutation<
    Inspection,
    Error,
    { source?: string; lines: { variantId: number; lotId?: number; serialId?: number; qty: number }[] }
  >({
    mutationKey: ["inventory", "quality", "inspection", "create"],
    mutationFn: (data) =>
      apiClient.post<Inspection>("/inventory/quality/inspections", data),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.inventory.qualityInspections() });
    },
  });
}

export function useStartInspection() {
  const qc = useQueryClient();
  return useMutation<Inspection, Error, number>({
    mutationKey: ["inventory", "quality", "inspection", "start"],
    mutationFn: (inspectionId) =>
      apiClient.post<Inspection>(`/inventory/quality/inspections/${inspectionId}/start`),
    onSuccess: (_, inspectionId) => {
      void qc.invalidateQueries({ queryKey: queryKeys.inventory.qualityInspection(inspectionId) });
      void qc.invalidateQueries({ queryKey: queryKeys.inventory.qualityInspections() });
    },
  });
}

export function usePassInspection() {
  const qc = useQueryClient();
  return useMutation<Inspection, Error, number>({
    mutationKey: ["inventory", "quality", "inspection", "pass"],
    mutationFn: (inspectionId) =>
      apiClient.post<Inspection>(
        `/inventory/quality/inspections/${inspectionId}/pass`,
        undefined,
      ),
    onSuccess: (_, inspectionId) => {
      void qc.invalidateQueries({ queryKey: queryKeys.inventory.qualityInspection(inspectionId) });
      void qc.invalidateQueries({ queryKey: queryKeys.inventory.qualityInspections() });
      void qc.invalidateQueries({ queryKey: queryKeys.inventory.stockLevels() });
      void qc.invalidateQueries({ queryKey: queryKeys.inventory.dashboard() });
    },
  });
}

export function useFailInspection() {
  const qc = useQueryClient();
  return useMutation<
    Inspection,
    Error,
    {
      inspectionId: number;
      lines: { lineId: number; disposition: "RELEASE_TO_AVAILABLE" | "QUARANTINE" | "RETURN_TO_VENDOR" | "SCRAP" }[];
    }
  >({
    mutationKey: ["inventory", "quality", "inspection", "fail"],
    mutationFn: ({ inspectionId, lines }) =>
      apiClient.post<Inspection>(`/inventory/quality/inspections/${inspectionId}/fail`, { lines }),
    onSuccess: (_, vars) => {
      void qc.invalidateQueries({ queryKey: queryKeys.inventory.qualityInspection(vars.inspectionId) });
      void qc.invalidateQueries({ queryKey: queryKeys.inventory.qualityInspections() });
      void qc.invalidateQueries({ queryKey: queryKeys.inventory.stockLevels() });
      void qc.invalidateQueries({ queryKey: queryKeys.inventory.dashboard() });
    },
  });
}

export function useDisposeInspection() {
  const qc = useQueryClient();
  return useMutation<
    Inspection,
    Error,
    { inspectionId: number; lineId?: number }
  >({
    mutationKey: ["inventory", "quality", "inspection", "dispose"],
    mutationFn: ({ inspectionId, lineId }) =>
      apiClient.post<Inspection>(
        `/inventory/quality/inspections/${inspectionId}/dispose`,
        lineId !== undefined ? { lineId } : {},
      ),
    onSuccess: (_, vars) => {
      void qc.invalidateQueries({ queryKey: queryKeys.inventory.qualityInspection(vars.inspectionId) });
      void qc.invalidateQueries({ queryKey: queryKeys.inventory.qualityInspections() });
      void qc.invalidateQueries({ queryKey: queryKeys.inventory.stockLevels() });
      void qc.invalidateQueries({ queryKey: queryKeys.inventory.dashboard() });
    },
  });
}

/**
 * D3. Cancelling hands back whatever the inspection was holding, so it moves
 * stock — hence the idempotency key and the stock invalidations, neither of
 * which it needed while a cancel was a pure status flip.
 */
export function useCancelInspection() {
  const qc = useQueryClient();
  return useMutation<Inspection, Error, number>({
    mutationKey: ["inventory", "quality", "inspection", "cancel"],
    mutationFn: (inspectionId) =>
      apiClient.post<Inspection>(
        `/inventory/quality/inspections/${inspectionId}/cancel`,
        undefined,
      ),
    onSuccess: (_, inspectionId) => {
      void qc.invalidateQueries({ queryKey: queryKeys.inventory.qualityInspection(inspectionId) });
      void qc.invalidateQueries({ queryKey: queryKeys.inventory.qualityInspections() });
      void qc.invalidateQueries({ queryKey: queryKeys.inventory.stockLevels() });
      void qc.invalidateQueries({ queryKey: queryKeys.inventory.dashboard() });
    },
  });
}

/**
 * D3. A completed result is evidence and is never edited — correcting one raises
 * a fresh inspection that names what it supersedes, and both stay readable.
 */
export function useCorrectInspection() {
  const qc = useQueryClient();
  return useMutation<Inspection, Error, { inspectionId: number; reason: string }>({
    mutationKey: ["inventory", "quality", "inspection", "correct"],
    mutationFn: ({ inspectionId, reason }) =>
      apiClient.post<Inspection>(
        `/inventory/quality/inspections/${inspectionId}/correct`,
        { reason },
      ),
    onSuccess: (_, variables) => {
      void qc.invalidateQueries({
        queryKey: queryKeys.inventory.qualityInspection(variables.inspectionId),
      });
      void qc.invalidateQueries({ queryKey: queryKeys.inventory.qualityInspections() });
    },
  });
}

interface QualityHoldsParams {
  [key: string]: unknown;
  page?: number;
  limit?: number;
  status?: QualityHoldStatus;
}

export function useQualityHolds(params?: QualityHoldsParams) {
  const canView = useCan("inventory:quality:read");
  return useQuery<HoldListResponse, Error>({
    queryKey: queryKeys.inventory.qualityHolds(params),
    queryFn: () =>
      apiClient.get<HoldListResponse>("/inventory/quality/holds", {
        ...(params?.status ? { status: params.status } : {}),
        ...(params?.page ? { page: String(params.page) } : {}),
        ...(params?.limit ? { limit: String(params.limit) } : {}),
      }),
    staleTime: 30_000,
    enabled: canView,
  });
}

export function useQualityHold(holdId: number) {
  const canView = useCan("inventory:quality:read");
  return useQuery<QualityHold, Error>({
    queryKey: queryKeys.inventory.qualityHold(holdId),
    queryFn: () => apiClient.get<QualityHold>(`/inventory/quality/holds/${holdId}`),
    staleTime: 60_000,
    enabled: canView && holdId > 0,
  });
}

export function useCreateQualityHold() {
  const qc = useQueryClient();
  return useMutation<
    QualityHold,
    Error,
    { productVariantId: number; locationId: number; lotId?: number; serialId?: number; quantity: number; reason: string }
  >({
    mutationKey: ["inventory", "quality", "hold", "create"],
    mutationFn: ({ quantity, ...rest }) =>
      apiClient.post<QualityHold>(
        "/inventory/quality/holds",
        { ...rest, quantity: String(quantity) },
      ),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.inventory.qualityHolds() });
      void qc.invalidateQueries({ queryKey: queryKeys.inventory.stockLevels() });
      void qc.invalidateQueries({ queryKey: queryKeys.inventory.dashboard() });
    },
  });
}

export function useReleaseQualityHold() {
  const qc = useQueryClient();
  return useMutation<QualityHold, Error, number>({
    mutationKey: ["inventory", "quality", "hold", "release"],
    mutationFn: (holdId) =>
      apiClient.post<QualityHold>(
        `/inventory/quality/holds/${holdId}/release`,
        undefined,
      ),
    onSuccess: (_, holdId) => {
      void qc.invalidateQueries({ queryKey: queryKeys.inventory.qualityHold(holdId) });
      void qc.invalidateQueries({ queryKey: queryKeys.inventory.qualityHolds() });
      void qc.invalidateQueries({ queryKey: queryKeys.inventory.stockLevels() });
      void qc.invalidateQueries({ queryKey: queryKeys.inventory.dashboard() });
    },
  });
}

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
