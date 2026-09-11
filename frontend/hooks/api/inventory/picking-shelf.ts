"use client";

import { useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import type {
  ConfirmPickInput,
  ConfirmPickResult,
  PickExceptionResult,
  ReportPickExceptionInput,
} from "./picking-types";
import { useIdempotentMutation } from "@/hooks/api/inventory/use-idempotent-mutation";

/**
 * Confirming a pick moves a reservation into the picked bucket and can move the
 * sales order with it, so stock levels, reservations and the sales-order lists
 * are all stale afterwards — not just the wave.
 *
 * The `Idempotency-Key` is generated per attempt rather than per line: a retry
 * of *this* click must replay, and the picker's next partial pick of the same
 * line must not.
 */
export function useConfirmPick() {
  const qc = useQueryClient();
  return useIdempotentMutation<ConfirmPickResult, Error, ConfirmPickInput>({
    mutationKey: ["inventory", "picking", "confirm"],
    mutationFn: ({ pickListId, pickLineId, quantityPicked, locationId, scannedPayload }, idempotencyKey) =>
      apiClient.post<ConfirmPickResult>(
        `/inventory/picking/waves/${pickListId}/confirm`,
        {
          pickLineId,
          quantityPicked,
          ...(locationId !== undefined ? { locationId } : {}),
          ...(scannedPayload !== undefined ? { scannedPayload } : {}),
        }, { headers: { "Idempotency-Key": idempotencyKey } },
      ),
    onSuccess: (_, variables) => {
      void qc.invalidateQueries({ queryKey: queryKeys.picking.wave(variables.pickListId) });
      void qc.invalidateQueries({ queryKey: queryKeys.picking.wavesList });
      void qc.invalidateQueries({ queryKey: queryKeys.inventory.stockLevels() });
      void qc.invalidateQueries({ queryKey: queryKeys.inventory.reservations() });
      void qc.invalidateQueries({ queryKey: queryKeys.inventory.salesOrders() });
    },
  });
}

/**
 * B5. Two endpoints behind one hook, because they are one act at the shelf.
 *
 * `SUBSTITUTED` posts to `/substitute`, which carries
 * `inventory:picking:substitute`; every other reason posts to `/exception`,
 * which carries the picker's own key. The server splits them because
 * `PermissionGuard` reads exactly one permission per handler, and a single route
 * covering every reason could only be gated at the weakest of them.
 *
 * Reporting an exception now releases the reservation on the unpicked remainder,
 * and a substitution moves the reservation onto the new SKU and rewrites the
 * sales-order line — so reservations, stock levels and the sales-order lists are
 * all stale afterwards, not just the wave.
 */
export function useReportPickException() {
  const qc = useQueryClient();
  return useIdempotentMutation<PickExceptionResult, Error, ReportPickExceptionInput>({
    mutationKey: ["inventory", "picking", "exception"],
    mutationFn: ({
      pickListId,
      pickLineId,
      reason,
      notes,
      foundLocationId,
      substituteVariantId,
      quantityPicked,
    }, idempotencyKey) =>
      reason === "SUBSTITUTED"
        ? apiClient.post<PickExceptionResult>(
            `/inventory/picking/waves/${pickListId}/substitute`,
            {
              pickLineId,
              substituteVariantId,
              quantityPicked,
              ...(notes ? { notes } : {}),
            }, { headers: { "Idempotency-Key": idempotencyKey } },
          )
        : apiClient.post<PickExceptionResult>(
            `/inventory/picking/waves/${pickListId}/exception`,
            {
              pickLineId,
              reason,
              ...(notes ? { notes } : {}),
              ...(reason === "WRONG_LOCATION" && foundLocationId !== undefined
                ? { foundLocationId }
                : {}),
            }, { headers: { "Idempotency-Key": idempotencyKey } },
          ),
    onSuccess: (_, variables) => {
      void qc.invalidateQueries({ queryKey: queryKeys.picking.wave(variables.pickListId) });
      void qc.invalidateQueries({ queryKey: queryKeys.picking.wavesList });
      void qc.invalidateQueries({ queryKey: queryKeys.picking.exceptionsList });
      void qc.invalidateQueries({ queryKey: queryKeys.inventory.stockLevels() });
      void qc.invalidateQueries({ queryKey: queryKeys.inventory.reservations() });
      void qc.invalidateQueries({ queryKey: queryKeys.inventory.salesOrders() });
    },
  });
}
