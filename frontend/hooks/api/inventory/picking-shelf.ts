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
