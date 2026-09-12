export type StockReservationStatus = "ACTIVE" | "CONSUMED" | "RELEASED" | "EXPIRED";

export interface StockAvailabilityByWarehouse {
  warehouse_id: number;
  warehouse_name: string;
  on_hand: string;
  committed: string;
  available: string;
}

export interface StockAvailability {
  variantId: number;
  onHand: string;
  available: string;
  committed: string;
  incoming: string;
  outgoing: string;
  forecasted: string;
  warehouseBreakdown: StockAvailabilityByWarehouse[];
}

export interface StockReservation {
  id: number;
  orgId: string;
  sourceType: string;
  sourceId: string;
  sourceLineId: string | null;
  productVariantId: number;
  warehouseId: number | null;
  locationId: number | null;
  lotId: number | null;
  serialId: number | null;
  reservedQty: string;
  status: StockReservationStatus;
  expiresAt: string | null;
  createdAt: string;
  updatedAt: string;
  productVariant: { id: number; sku: string; name: string | null } | null;
  location: { id: number; name: string; code: string } | null;
  warehouse: { id: number; name: string } | null;
}
