"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";

export type SalesOrderStatus = "DRAFT" | "CONFIRMED" | "SHIPPED" | "INVOICED" | "CANCELLED";

interface SalesOrderFilters {
  clientId?: number;
  status?: SalesOrderStatus;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  limit?: number;
}

export interface SalesOrderListItem {
  id: number;
  soNumber: string;
  customerName: string | null;
  orderDate: string | null;
  expectedShipDate: string | null;
  total: string;
  status: SalesOrderStatus;
}

interface SalesOrdersListResponse {
  items: SalesOrderListItem[];
  total: number;
  page: number;
  totalPages: number;
}

interface SalesOrderLine {
  id: number;
  productId: number;
  productName: string | null;
  productSku: string | null;
  quantity: string;
  unitPrice: string;
  taxRate: string | null;
  discount: string | null;
  lineTotal: string;
}

interface SalesOrderDetail {
  id: number;
  soNumber: string;
  customerName: string | null;
  status: SalesOrderStatus;
  orderDate: string | null;
  expectedShipDate: string | null;
  currency: string | null;
  shippingAddress: string | null;
  notes: string | null;
  subtotal: string;
  total: string;
  invoiceId: number | null;
  invoiceNumber: string | null;
  lines: SalesOrderLine[];
}

export interface AtpEntry {
  productId: number;
  onHand: number;
  committed: number;
  onOrder: number;
  available: number;
}

interface CreateSalesOrderLineInput {
  productId: number;
  quantity: number;
  unitPrice: number;
  taxRate?: number;
  discount?: number;
}

interface CreateSalesOrderInput {
  customerId?: number;
  warehouseId: number;
  orderDate?: string;
  expectedShipDate?: string;
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
  shippedLines: Array<{ productId: number; shippedQty: number; locationId?: number }>;
  shipDate?: string;
  trackingNumber?: string;
  notes?: string;
}

interface InvoiceSalesOrderInput {
  soId: number;
}

interface RawNamedRef {
  id: number;
  name: string | null;
}

interface RawListSalesOrder {
  id: number;
  soNumber: string;
  status: SalesOrderStatus;
  orderDate: string | null;
  requiredDate: string | null;
  total: string;
  client: RawNamedRef | null;
}

interface RawListResponse {
  items: RawListSalesOrder[];
  total: number;
  page: number;
  totalPages: number;
}

interface RawProductRef {
  id: number;
  name: string | null;
  sku: string | null;
}

interface RawVariantRef {
  product: RawProductRef | null;
}

interface RawDetailLine {
  id: number;
  productVariantId: number;
  quantity: string;
  unitPrice: string;
  taxRate: string | null;
  amount: string;
  productVariant: RawVariantRef | null;
}

interface RawInvoiceRef {
  id: number;
  invoiceNumber: string | null;
}

interface RawDetailSalesOrder {
  id: number;
  soNumber: string;
  status: SalesOrderStatus;
  orderDate: string | null;
  requiredDate: string | null;
  currency: string | null;
  shippingAddress: string | null;
  notes: string | null;
  subtotal: string;
  total: string;
  invoiceId: number | null;
  client: RawNamedRef | null;
  invoice: RawInvoiceRef | null;
  lines: RawDetailLine[];
}

interface RawAtpEntry {
  productVariantId: number;
  onHand: number;
  committed: number;
  onOrder: number;
  available: number;
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function mapListItem(raw: RawListSalesOrder): SalesOrderListItem {
  return {
    id: raw.id,
    soNumber: raw.soNumber,
    customerName: raw.client?.name ?? null,
    orderDate: raw.orderDate,
    expectedShipDate: raw.requiredDate,
    total: raw.total,
    status: raw.status,
  };
}

function mapDetailLine(raw: RawDetailLine): SalesOrderLine {
  return {
    id: raw.id,
    productId: raw.productVariantId,
    productName: raw.productVariant?.product?.name ?? null,
    productSku: raw.productVariant?.product?.sku ?? null,
    quantity: raw.quantity,
    unitPrice: raw.unitPrice,
    taxRate: raw.taxRate,
    discount: null,
    lineTotal: raw.amount,
  };
}

function mapDetail(raw: RawDetailSalesOrder): SalesOrderDetail {
  return {
    id: raw.id,
    soNumber: raw.soNumber,
    customerName: raw.client?.name ?? null,
    status: raw.status,
    orderDate: raw.orderDate,
    expectedShipDate: raw.requiredDate,
    currency: raw.currency,
    shippingAddress: raw.shippingAddress,
    notes: raw.notes,
    subtotal: raw.subtotal,
    total: raw.total,
    invoiceId: raw.invoiceId,
    invoiceNumber: raw.invoice?.invoiceNumber ?? null,
    lines: raw.lines.map(mapDetailLine),
  };
}

function mapAtp(raw: RawAtpEntry): AtpEntry {
  return {
    productId: raw.productVariantId,
    onHand: raw.onHand,
    committed: raw.committed,
    onOrder: raw.onOrder,
    available: raw.available,
  };
}

export function useSalesOrders(filters?: SalesOrderFilters) {
  return useQuery<SalesOrdersListResponse, Error>({
    queryKey: queryKeys.inventory.salesOrders(
      filters
        ? {
            status: filters.status,
            clientId: filters.clientId,
            dateFrom: filters.dateFrom,
            dateTo: filters.dateTo,
            page: filters.page,
            limit: filters.limit,
          }
        : undefined,
    ),
    queryFn: async () => {
      const raw = await apiClient.get<RawListResponse>("/inventory/sales-orders", {
        ...(filters?.status ? { status: filters.status } : {}),
        ...(filters?.clientId ? { clientId: String(filters.clientId) } : {}),
        ...(filters?.dateFrom ? { dateFrom: filters.dateFrom } : {}),
        ...(filters?.dateTo ? { dateTo: filters.dateTo } : {}),
        ...(filters?.page ? { page: String(filters.page) } : {}),
        ...(filters?.limit ? { limit: String(filters.limit) } : {}),
      });
      return {
        items: raw.items.map(mapListItem),
        total: raw.total,
        page: raw.page,
        totalPages: raw.totalPages,
      };
    },
    staleTime: 2 * 60_000,
  });
}

export function useSalesOrder(soId: number) {
  return useQuery<SalesOrderDetail, Error>({
    queryKey: queryKeys.inventory.salesOrder(soId),
    queryFn: async () =>
      mapDetail(await apiClient.get<RawDetailSalesOrder>(`/inventory/sales-orders/${soId}`)),
    enabled: soId > 0,
    staleTime: 2 * 60_000,
  });
}

export function useSoAtp(soId: number) {
  return useQuery<AtpEntry[], Error>({
    queryKey: [...queryKeys.inventory.salesOrder(soId), "atp"] as const,
    queryFn: async () => {
      const raw = await apiClient.get<RawAtpEntry[]>(`/inventory/sales-orders/${soId}/atp`);
      return raw.map(mapAtp);
    },
    enabled: soId > 0,
    staleTime: 1 * 60_000,
  });
}

export function useCreateSalesOrder() {
  const qc = useQueryClient();
  return useMutation<CreatedSalesOrder, Error, CreateSalesOrderInput>({
    mutationKey: ["inventory", "salesOrders", "create"],
    mutationFn: (data) =>
      apiClient.post<CreatedSalesOrder>("/inventory/sales-orders", {
        clientId: data.customerId,
        orderDate: data.orderDate ?? todayIso(),
        requiredDate: data.expectedShipDate,
        shippingAddress: data.shippingAddress,
        warehouseId: data.warehouseId,
        currency: data.currency,
        notes: data.notes,
        lines: data.lines.map((line, index) => ({
          productVariantId: line.productId,
          quantity: line.quantity,
          unitPrice: line.unitPrice.toFixed(4),
          taxRate: (line.taxRate ?? 0).toFixed(2),
          lineOrder: index,
        })),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.inventory.salesOrders() });
    },
  });
}

export function useConfirmSalesOrder() {
  const qc = useQueryClient();
  return useMutation<void, Error, ConfirmSalesOrderInput>({
    mutationKey: ["inventory", "salesOrders", "confirm"],
    mutationFn: ({ soId }) => apiClient.post<void>(`/inventory/sales-orders/${soId}/confirm`, {}),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: queryKeys.inventory.salesOrders() });
      qc.invalidateQueries({ queryKey: queryKeys.inventory.salesOrder(variables.soId) });
    },
  });
}

export function useShipSalesOrder() {
  const qc = useQueryClient();
  return useMutation<void, Error, ShipSalesOrderInput>({
    mutationKey: ["inventory", "salesOrders", "ship"],
    mutationFn: ({ soId, shipDate, trackingNumber, notes }) =>
      apiClient.post<void>(`/inventory/sales-orders/${soId}/ship`, {
        shipDate: shipDate ?? todayIso(),
        notes: notes ?? (trackingNumber ? `Tracking: ${trackingNumber}` : undefined),
      }),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: queryKeys.inventory.salesOrders() });
      qc.invalidateQueries({ queryKey: queryKeys.inventory.salesOrder(variables.soId) });
      qc.invalidateQueries({ queryKey: queryKeys.inventory.stockLevels() });
    },
  });
}

export function useInvoiceSalesOrder() {
  const qc = useQueryClient();
  return useMutation<CreatedInvoice, Error, InvoiceSalesOrderInput>({
    mutationKey: ["inventory", "salesOrders", "invoice"],
    mutationFn: ({ soId }) => apiClient.post<CreatedInvoice>(`/inventory/sales-orders/${soId}/invoice`, {}),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: queryKeys.inventory.salesOrders() });
      qc.invalidateQueries({ queryKey: queryKeys.inventory.salesOrder(variables.soId) });
    },
  });
}
