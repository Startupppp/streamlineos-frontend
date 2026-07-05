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
  ZONE: "bg-violet-50 text-violet-700 border-violet-200/70",
  AISLE: "bg-blue-50 text-blue-700 border-blue-200/70",
  RACK: "bg-amber-50 text-amber-700 border-amber-200/70",
  BIN: "bg-emerald-50 text-emerald-700 border-emerald-200/70",
  RECEIVING: "bg-cyan-50 text-cyan-700 border-cyan-200/70",
  SHIPPING: "bg-sky-50 text-sky-700 border-sky-200/70",
  QUARANTINE: "bg-orange-50 text-orange-700 border-orange-200/70",
  SCRAP: "bg-red-50 text-red-700 border-red-200/70",
  TRANSIT: "bg-slate-100 text-slate-700 border-slate-200",
  RETURNS: "bg-rose-50 text-rose-700 border-rose-200/70",
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
