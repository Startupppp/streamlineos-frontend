import type { LocationType } from "@/hooks/api/inventory/warehouses";

export const LOCATION_TYPE_ORDER: LocationType[] = [
  "ZONE",
  "AISLE",
  "RACK",
  "BIN",
  "RECEIVING",
  "SHIPPING",
  "QUARANTINE",
  "SCRAP",
  "TRANSIT",
  "RETURNS",
];

export const LOCATION_TYPE_LABELS: Record<LocationType, string> = {
  ZONE: "Zone",
  AISLE: "Aisle",
  RACK: "Rack",
  BIN: "Bin",
  RECEIVING: "Receiving",
  SHIPPING: "Shipping",
  QUARANTINE: "Quarantine",
  SCRAP: "Scrap",
  TRANSIT: "Transit",
  RETURNS: "Returns",
};

export const LOCATION_TYPE_COLORS: Record<LocationType, string> = {
  ZONE: "bg-category-blue-surface text-category-blue-ink border-category-blue-rule",
  AISLE: "bg-category-indigo-surface text-category-indigo-ink border-category-indigo-rule",
  RACK: "bg-category-amber-surface text-category-amber-ink border-category-amber-rule",
  BIN: "bg-category-emerald-surface text-category-emerald-ink border-category-emerald-rule",
  RECEIVING: "bg-category-cyan-surface text-category-cyan-ink border-category-cyan-rule",
  SHIPPING: "bg-category-sky-surface text-category-sky-ink border-category-sky-rule",
  QUARANTINE: "bg-category-orange-surface text-category-orange-ink border-category-orange-rule",
  SCRAP: "bg-category-red-surface text-category-red-ink border-category-red-rule",
  TRANSIT: "bg-muted text-foreground border-border",
  RETURNS: "bg-category-rose-surface text-category-rose-ink border-category-rose-rule",
};

export const SPECIAL_LOCATION_TYPES: LocationType[] = [
  "RECEIVING",
  "SHIPPING",
  "QUARANTINE",
  "SCRAP",
  "TRANSIT",
];

export function isLocationType(val: string): val is LocationType {
  return val in LOCATION_TYPE_LABELS;
}
