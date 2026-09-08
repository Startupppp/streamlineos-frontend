"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { UseQueryOptions } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import { useCan } from "@/hooks/api/access";
import { useIdempotentMutation } from "@/hooks/api/use-idempotent-mutation";

export type PutawayTaskStatus = "PENDING" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED";
export type PutawayDisposition = "STORAGE" | "QUARANTINE";
export type PutawayAssignment = "ANY" | "MINE" | "UNCLAIMED";

export interface PutawayTaskSummary {
  id: number;
  taskNumber: string;
  status: PutawayTaskStatus;
  warehouseId: number;
  warehouseName: string | null;
  grnId: number | null;
  grnNumber: string | null;
  fromLocationId: number;
  fromLocationCode: string | null;
  assignedTo: string | null;
  assignedToName: string | null;
  claimedAt: string | null;
  createdAt: string;
  lineCount: number;
  linesClosed: number;
  quarantineLineCount: number;
}

export interface PutawayTaskListResponse {
  items: PutawayTaskSummary[];
  total: number;
  page: number;
  totalPages: number;
}

export interface PutawayTaskFilters {
  page?: number;
  limit?: number;
  status?: PutawayTaskStatus;
  warehouseId?: number;
  assignment?: PutawayAssignment;
}

/**
 * A bin the goods would fit in, with the room actually left in it.
 *
 * `capacity` and `remaining` are `null` where the bin records no capacity, which
 * means unlimited — deliberately not "very large", so an unmeasured bin cannot
 * outrank every measured one. Both are decimal strings: these are
 * `numeric(18,4)` values and the whole point of the server-side arithmetic is
 * that they never become floats, so they are rendered as they arrive.
 */
export interface PutawaySuggestion {
  locationId: number;
  code: string;
  name: string;
  capacity: string | null;
  onHand: string;
  remaining: string | null;
  holdsVariant: boolean;
  fits: boolean;
}

/**
 * One line of a task.
 *
 * Snake-cased because the backend returns the projection row as it reads it —
 * the task detail is a raw SQL result rather than a mapped DTO, and renaming it
 * on the way through would be a second contract to keep in step.
 */
export interface PutawayTaskLine {
  id: number;
  product_variant_id: number;
  sku: string;
  variant_name: string;
  lot_id: number | null;
  lot_number: string | null;
  serial_id: number | null;
  serial_number: string | null;
  quantity: string;
  quantity_moved: string;
  disposition: PutawayDisposition;
  to_location_id: number | null;
  to_location_code: string | null;
  remaining: string;
  suggestions: PutawaySuggestion[];
}

export interface PutawayTaskDetail {
  task: {
    id: number;
    taskNumber: string;
    status: PutawayTaskStatus;
    warehouseId: number;
    grnId: number | null;
    fromLocationId: number;
    assignedTo: string | null;
    claimedAt: string | null;
    createdAt: string;
  };
  lines: PutawayTaskLine[];
}

export interface CreatePutawayTaskResult {
  taskId: number;
  taskNumber: string;
  lineCount: number;
  quarantineLineCount: number;
}

export interface CompletePutawayInput {
  taskId: number;
  taskLineId: number;
  /** Decimal string at scale 4 — this becomes a stock movement. */
  quantity: string;
  toLocationId?: number;
}

export interface CompletePutawayResult {
  taskId: number;
  status: "IN_PROGRESS" | "COMPLETED";
  lines: Array<{ taskLineId: number; quantityMoved: string; toLocationId: number }>;
  transactionIds: number[];
}

type QueryOptions<T> = Omit<UseQueryOptions<T, Error>, "queryKey" | "queryFn">;

const PUTAWAY_READ_KEY = "inventory:stock:read";
const PUTAWAY_WRITE_KEY = "inventory:stock:transfer";

export function usePutawayTasks(
  filters?: PutawayTaskFilters,
  options?: QueryOptions<PutawayTaskListResponse>,
) {
  const canView = useCan(PUTAWAY_READ_KEY);
  const params = {
    page: filters?.page ?? 1,
    limit: filters?.limit ?? 25,
    assignment: filters?.assignment ?? "ANY",
    ...(filters?.status ? { status: filters.status } : {}),
    ...(filters?.warehouseId ? { warehouseId: filters.warehouseId } : {}),
  };

  return useQuery<PutawayTaskListResponse, Error>({
    queryKey: queryKeys.putaway.tasks(params),
    queryFn: () =>
      apiClient.get<PutawayTaskListResponse>("/inventory/putaway/tasks", {
        page: String(params.page),
        limit: String(params.limit),
        assignment: params.assignment,
        ...(params.status ? { status: params.status } : {}),
        ...(params.warehouseId ? { warehouseId: String(params.warehouseId) } : {}),
      }),
    // A queue whose whole value is being current. An operator looking at a task
    // somebody else claimed thirty seconds ago is the failure this screen exists
    // to prevent.
    staleTime: 15_000,
    ...options,
    enabled: canView && (options?.enabled ?? true),
  });
}

export function usePutawayTask(taskId: number, options?: QueryOptions<PutawayTaskDetail>) {
  const canView = useCan(PUTAWAY_READ_KEY);
  return useQuery<PutawayTaskDetail, Error>({
    queryKey: queryKeys.putaway.task(taskId),
    queryFn: () => apiClient.get<PutawayTaskDetail>(`/inventory/putaway/tasks/${taskId}`),
    staleTime: 15_000,
    ...options,
    enabled: canView && taskId > 0 && (options?.enabled ?? true),
  });
}

export function useCreatePutawayTask() {
  const qc = useQueryClient();
  return useIdempotentMutation<CreatePutawayTaskResult, Error, { grnId: number }>({
    mutationKey: ["inventory", "putaway", "createTask"],
    mutationFn: (body, idempotencyKey) =>
      apiClient.post<CreatePutawayTaskResult>("/inventory/putaway/tasks", body, { headers: { "Idempotency-Key": idempotencyKey } }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.putaway.tasksList });
      void qc.invalidateQueries({ queryKey: queryKeys.inventory.goodsReceiptsList });
    },
  });
}

export function useClaimPutawayTask() {
  const qc = useQueryClient();
  return useMutation<{ taskId: number; assignedTo: string; claimed: boolean }, Error, number>({
    mutationKey: ["inventory", "putaway", "claim"],
    mutationFn: (taskId) => apiClient.post(`/inventory/putaway/tasks/${taskId}/claim`, {}),
    onSuccess: (_, taskId) => {
      void qc.invalidateQueries({ queryKey: queryKeys.putaway.tasksList });
      void qc.invalidateQueries({ queryKey: queryKeys.putaway.task(taskId) });
    },
  });
}

export function useAbandonPutawayTask() {
  const qc = useQueryClient();
  return useMutation<{ taskId: number; assignedTo: null; released: boolean }, Error, number>({
    mutationKey: ["inventory", "putaway", "abandon"],
    mutationFn: (taskId) => apiClient.post(`/inventory/putaway/tasks/${taskId}/abandon`, {}),
    onSuccess: (_, taskId) => {
      void qc.invalidateQueries({ queryKey: queryKeys.putaway.tasksList });
      void qc.invalidateQueries({ queryKey: queryKeys.putaway.task(taskId) });
    },
  });
}

/**
 * Walking a line relocates stock, so the stock levels and the receipt queue are
 * stale afterwards — not just the task.
 *
 * The `Idempotency-Key` is generated per attempt rather than per line: a retry
 * of *this* confirmation must replay, and the operator's next partial putaway of
 * the same line must not.
 */
export function useCompletePutaway() {
  const qc = useQueryClient();
  return useMutation<CompletePutawayResult, Error, CompletePutawayInput>({
    mutationKey: ["inventory", "putaway", "complete"],
    mutationFn: ({ taskId, taskLineId, quantity, toLocationId }) =>
      apiClient.post<CompletePutawayResult>(
        `/inventory/putaway/tasks/${taskId}/complete`,
        {
          lines: [
            {
              taskLineId,
              quantity,
              ...(toLocationId !== undefined ? { toLocationId } : {}),
            },
          ],
        },
      ),
    onSuccess: (_, variables) => {
      void qc.invalidateQueries({ queryKey: queryKeys.putaway.task(variables.taskId) });
      void qc.invalidateQueries({ queryKey: queryKeys.putaway.tasksList });
      void qc.invalidateQueries({ queryKey: queryKeys.inventory.stockLevels() });
    },
  });
}

export { PUTAWAY_READ_KEY, PUTAWAY_WRITE_KEY };
