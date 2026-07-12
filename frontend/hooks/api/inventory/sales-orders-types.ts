export type SalesOrderStatus =
  | "DRAFT"
  | "CONFIRMED"
  | "PARTIALLY_RESERVED"
  | "RESERVED"
  | "PICKED"
  | "PACKED"
  | "PARTIALLY_SHIPPED"
  | "SHIPPED"
  | "INVOICED"
  | "CLOSED"
  | "CANCELLED";

export interface SalesOrderFilters {
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

export interface SalesOrdersListResponse {
  items: SalesOrderListItem[];
  total: number;
  page: number;
  totalPages: number;
}

export interface SalesOrderLine {
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

export interface SalesOrderDetail {
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

export interface UpdateSalesOrderInput {
  soId: number;
  clientId?: number;
  orderDate?: string;
  requiredDate?: string;
  shippingAddress?: string;
  warehouseId?: number;
  currency?: string;
  notes?: string;
  lines?: Array<{
    productVariantId: number;
    quantity: number;
    unitPrice: number;
    taxRate?: number;
    lineOrder?: number;
  }>;
}

export interface RawNamedRef {
  id: number;
  name: string | null;
}

export interface RawListSalesOrder {
  id: number;
  soNumber: string;
  status: SalesOrderStatus;
  orderDate: string | null;
  requiredDate: string | null;
  total: string;
  client: RawNamedRef | null;
}

export interface RawListResponse {
  items: RawListSalesOrder[];
  total: number;
  page: number;
  totalPages: number;
}

export interface RawProductRef {
  id: number;
  name: string | null;
  sku: string | null;
}

export interface RawVariantRef {
  product: RawProductRef | null;
}

export interface RawDetailLine {
  id: number;
  productVariantId: number;
  quantity: string;
  unitPrice: string;
  taxRate: string | null;
  amount: string;
  productVariant: RawVariantRef | null;
}

export interface RawInvoiceRef {
  id: number;
  invoiceNumber: string | null;
}

export interface RawDetailSalesOrder {
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

export interface RawAtpEntry {
  productVariantId: number;
  onHand: number;
  committed: number;
  onOrder: number;
  available: number;
}

export function mapListItem(raw: RawListSalesOrder): SalesOrderListItem {
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

export function mapDetailLine(raw: RawDetailLine): SalesOrderLine {
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

export function mapDetail(raw: RawDetailSalesOrder): SalesOrderDetail {
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

export function mapAtp(raw: RawAtpEntry): AtpEntry {
  return {
    productId: raw.productVariantId,
    onHand: raw.onHand,
    committed: raw.committed,
    onOrder: raw.onOrder,
    available: raw.available,
  };
}

export function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}
