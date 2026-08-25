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
  ZONE: "bg-status-info-surface text-status-info-ink border-status-info-rule",
  AISLE: "bg-status-info-surface text-status-info-ink border-status-info-rule",
  RACK: "bg-status-warning-surface text-status-warning-ink border-status-warning-rule",
  BIN: "bg-status-success-surface text-status-success-ink border-status-success-rule",
  RECEIVING: "bg-status-info-surface text-status-info-ink border-status-info-rule",
  SHIPPING: "bg-status-info-surface text-status-info-ink border-status-info-rule",
  QUARANTINE: "bg-status-warning-surface text-status-warning-ink border-status-warning-rule",
  SCRAP: "bg-status-danger-surface text-status-danger-ink border-status-danger-rule",
  TRANSIT: "bg-muted text-muted-foreground border-border",
  RETURNS: "bg-status-danger-surface text-status-danger-ink border-status-danger-rule",
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
