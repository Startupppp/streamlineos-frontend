"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import type { SalesOrderStatus, UpdateSalesOrderInput } from "./sales-orders-types";
import { todayIso } from "./sales-orders-types";
import { lazyContract } from "@/lib/api-envelope";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";

const salesOrderMutationContract = lazyContract(() =>
  import("@/hooks/api/inventory/sales-orders-schema").then((m) => m.salesOrderMutationContract),
);
const invoiceContract = lazyContract(() =>
  import("@/hooks/api/inventory/sales-orders-schema").then((m) => m.invoiceContract),
);
const reserveSoContract = lazyContract(() =>
  import("@/hooks/api/inventory/sales-orders-schema").then((m) => m.reserveSoContract),
);
const soSuccessContract = lazyContract(() =>
  import("@/hooks/api/inventory/sales-orders-schema").then((m) => m.soSuccessContract),
);
const shipSoContract = lazyContract(() =>
  import("@/hooks/api/inventory/sales-orders-schema").then((m) => m.shipSoContract),
);
const pickSoContract = lazyContract(() =>
  import("@/hooks/api/inventory/sales-orders-schema").then((m) => m.pickSoContract),
);
const packSoContract = lazyContract(() =>
  import("@/hooks/api/inventory/sales-orders-schema").then((m) => m.packSoContract),
);

interface CreateSalesOrderLineInput {
  productVariantId: number;
  quantity: number;
  unitPrice: number;
  taxRate?: number;
  lineOrder?: number;
}

interface CreateSalesOrderInput {
  clientId?: number;
  warehouseId?: number;
  orderDate?: string;
  requiredDate?: string;
  currency?: string;
  shippingAddress?: string;
  notes?: string;
  lines: CreateSalesOrderLineInput[];
}

interface CreatedSalesOrder {
  id: number;
  soNumber: string;
}

interface CreatedInvoice {
  id: number;
  invoiceNumber: string;
}

interface ConfirmSalesOrderInput {
  soId: number;
}

interface ShipSalesOrderInput {
  soId: number;
  shipDate?: string;
  carrierId?: number;
  trackingNumber?: string;
  notes?: string;
}

interface InvoiceSalesOrderInput {
  soId: number;
}

interface ReserveAllocation {
  soLineId: number;
  locationId: number;
  lotId?: number;
  serialId?: number;
  qty: number;
}

interface ReserveSalesOrderInput {
  soId: number;
  warehouseId?: number;
  allocations?: ReserveAllocation[];
}

interface ReserveSalesOrderResult {
  status: SalesOrderStatus;
  shortfalls?: Array<{ soLineId: number; requested: number; available: number }>;
}

interface PickSalesOrderLine {
  soLineId: number;
  locationId: number;
  lotId?: number;
  serialId?: number;
  quantityPicked: number;
}

interface PickSalesOrderInput {
  soId: number;
  lines: PickSalesOrderLine[];
}

interface PackSalesOrderInput {
  soId: number;
  weight?: number;
  dimensionsL?: number;
  dimensionsW?: number;
  dimensionsH?: number;
}

interface CancelSalesOrderInput {
  soId: number;
  reason?: string;
}

export function useCreateSalesOrder() {
  const qc = useQueryClient();
  return useAuthorizedMutation<CreatedSalesOrder, Error, CreateSalesOrderInput>("inventory:sales-orders:create", {
    mutationKey: ["inventory", "salesOrders", "create"],
    mutationFn: (data) =>
      apiClient.post<CreatedSalesOrder>("/inventory/sales-orders", {
        clientId: data.clientId,
        orderDate: data.orderDate ?? todayIso(),
        requiredDate: data.requiredDate,
        shippingAddress: data.shippingAddress,
        warehouseId: data.warehouseId,
        currency: data.currency,
        notes: data.notes,
        lines: data.lines.map((line, index) => ({
          productVariantId: line.productVariantId,
          quantity: line.quantity,
          unitPrice: line.unitPrice.toFixed(4),
          taxRate: (line.taxRate ?? 0).toFixed(2),
          lineOrder: index,
        })),
      }, undefined, salesOrderMutationContract),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.inventory.salesOrders() });
    },
  });
}

export function useConfirmSalesOrder() {
  const qc = useQueryClient();
  return useAuthorizedMutation<z.infer<typeof soSuccessContract>, Error, ConfirmSalesOrderInput>("inventory:sales-orders:confirm", {
    mutationKey: ["inventory", "salesOrders", "confirm"],
    mutationFn: ({ soId }) =>
      apiClient.post<z.infer<typeof soSuccessContract>>(`/inventory/sales-orders/${soId}/confirm`, {}, undefined, soSuccessContract),
    onSuccess: (_, variables) => {
      void qc.invalidateQueries({ queryKey: queryKeys.inventory.salesOrders() });
      void qc.invalidateQueries({ queryKey: queryKeys.inventory.salesOrder(variables.soId) });
    },
  });
}

export function useShipSalesOrder() {
  const qc = useQueryClient();
  return useAuthorizedMutation<z.infer<typeof shipSoContract>, Error, ShipSalesOrderInput>("inventory:sales-orders:ship", {
    mutationKey: ["inventory", "salesOrders", "ship"],
    mutationFn: ({ soId, shipDate, carrierId, trackingNumber, notes }) =>
      apiClient.post<z.infer<typeof shipSoContract>>(
        `/inventory/sales-orders/${soId}/ship`,
        {
          shipDate: shipDate ?? todayIso(),
          ...(carrierId !== undefined ? { carrierId } : {}),
          ...(trackingNumber !== undefined ? { trackingNumber } : {}),
          ...(notes !== undefined ? { notes } : {}),
        },
        { headers: { "Idempotency-Key": crypto.randomUUID() } },
        shipSoContract,
      ),
    onSuccess: (_, variables) => {
      void qc.invalidateQueries({ queryKey: queryKeys.inventory.salesOrders() });
      void qc.invalidateQueries({ queryKey: queryKeys.inventory.salesOrder(variables.soId) });
      void qc.invalidateQueries({ queryKey: queryKeys.inventory.stockLevels() });
    },
  });
}

export function useInvoiceSalesOrder() {
  const qc = useQueryClient();
  return useAuthorizedMutation<CreatedInvoice, Error, InvoiceSalesOrderInput>("inventory:sales-orders:invoice", {
    mutationKey: ["inventory", "salesOrders", "invoice"],
    mutationFn: ({ soId }) =>
      apiClient.post<CreatedInvoice>(`/inventory/sales-orders/${soId}/invoice`, {}, undefined, invoiceContract),
    onSuccess: (_, variables) => {
      void qc.invalidateQueries({ queryKey: queryKeys.inventory.salesOrders() });
      void qc.invalidateQueries({ queryKey: queryKeys.inventory.salesOrder(variables.soId) });
    },
  });
}

export function useReserveSalesOrder() {
  const qc = useQueryClient();
  return useAuthorizedMutation<ReserveSalesOrderResult, Error, ReserveSalesOrderInput>("inventory:stock:reserve", {
    mutationKey: ["inventory", "salesOrders", "reserve"],
    mutationFn: ({ soId, warehouseId, allocations }) =>
      apiClient.post<ReserveSalesOrderResult>(
        `/inventory/sales-orders/${soId}/reserve`,
        {
          ...(warehouseId !== undefined ? { warehouseId } : {}),
          ...(allocations !== undefined ? { allocations } : {}),
        },
        { headers: { "Idempotency-Key": crypto.randomUUID() } },
        reserveSoContract,
      ),
    onSuccess: (_, variables) => {
      void qc.invalidateQueries({ queryKey: queryKeys.inventory.salesOrders() });
      void qc.invalidateQueries({ queryKey: queryKeys.inventory.salesOrder(variables.soId) });
      void qc.invalidateQueries({ queryKey: queryKeys.inventory.stockLevels() });
    },
  });
}

export function usePickSalesOrder() {
  const qc = useQueryClient();
  return useAuthorizedMutation<z.infer<typeof pickSoContract>, Error, PickSalesOrderInput>("inventory:sales-orders:ship", {
    mutationKey: ["inventory", "salesOrders", "pick"],
    mutationFn: ({ soId, lines }) =>
      apiClient.post<z.infer<typeof pickSoContract>>(`/inventory/sales-orders/${soId}/pick`, { lines }, undefined, pickSoContract),
    onSuccess: (_, variables) => {
      void qc.invalidateQueries({ queryKey: queryKeys.inventory.salesOrders() });
      void qc.invalidateQueries({ queryKey: queryKeys.inventory.salesOrder(variables.soId) });
    },
  });
}

export function usePackSalesOrder() {
  const qc = useQueryClient();
  return useAuthorizedMutation<z.infer<typeof packSoContract>, Error, PackSalesOrderInput>("inventory:sales-orders:ship", {
    mutationKey: ["inventory", "salesOrders", "pack"],
    mutationFn: ({ soId, weight, dimensionsL, dimensionsW, dimensionsH }) =>
      apiClient.post<z.infer<typeof packSoContract>>(`/inventory/sales-orders/${soId}/pack`, {
        ...(weight !== undefined ? { weight } : {}),
        ...(dimensionsL !== undefined ? { dimensionsL } : {}),
        ...(dimensionsW !== undefined ? { dimensionsW } : {}),
        ...(dimensionsH !== undefined ? { dimensionsH } : {}),
      }, undefined, packSoContract),
    onSuccess: (_, variables) => {
      void qc.invalidateQueries({ queryKey: queryKeys.inventory.salesOrders() });
      void qc.invalidateQueries({ queryKey: queryKeys.inventory.salesOrder(variables.soId) });
    },
  });
}

export function useCancelSalesOrder() {
  const qc = useQueryClient();
  return useAuthorizedMutation<z.infer<typeof soSuccessContract>, Error, CancelSalesOrderInput>("inventory:sales-orders:update", {
    mutationKey: ["inventory", "salesOrders", "cancel"],
    mutationFn: ({ soId, reason }) =>
      apiClient.post<z.infer<typeof soSuccessContract>>(
        `/inventory/sales-orders/${soId}/cancel`,
        { ...(reason !== undefined ? { reason } : {}) },
        { headers: { "Idempotency-Key": crypto.randomUUID() } },
        soSuccessContract,
      ),
    onSuccess: (_, variables) => {
      void qc.invalidateQueries({ queryKey: queryKeys.inventory.salesOrders() });
      void qc.invalidateQueries({ queryKey: queryKeys.inventory.salesOrder(variables.soId) });
      void qc.invalidateQueries({ queryKey: queryKeys.inventory.stockLevels() });
    },
  });
}

export function useUpdateSalesOrder() {
  const qc = useQueryClient();
  return useAuthorizedMutation<z.infer<typeof salesOrderMutationContract>, Error, UpdateSalesOrderInput>("inventory:sales-orders:update", {
    mutationKey: ["inventory", "salesOrders", "update"],
    mutationFn: ({ soId, lines, ...rest }) =>
      apiClient.patch<z.infer<typeof salesOrderMutationContract>>(`/inventory/sales-orders/${soId}`, {
        ...rest,
        ...(lines !== undefined
          ? {
              lines: lines.map((l, idx) => ({
                productVariantId: l.productVariantId,
                quantity: l.quantity,
                unitPrice: l.unitPrice.toFixed(4),
                taxRate: (l.taxRate ?? 0).toFixed(2),
                lineOrder: l.lineOrder ?? idx,
              })),
            }
          : {}),
      }, undefined, salesOrderMutationContract),
    onSuccess: (_, variables) => {
      void qc.invalidateQueries({ queryKey: queryKeys.inventory.salesOrders() });
      void qc.invalidateQueries({ queryKey: queryKeys.inventory.salesOrder(variables.soId) });
    },
  });
}
