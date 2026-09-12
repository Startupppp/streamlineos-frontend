import type { Control } from "react-hook-form";
import type { TrackingMethod } from "@/types/inventory";
import type { GrnFormValues } from "./receive-goods-schema";

export interface DraftLineMeta {
  poLineId: number;
  productVariantId: number;
  productName: string;
  sku: string | null;
  ordered: number;
  alreadyReceived: number;
  trackingMethod: TrackingMethod;
}

export interface GrnLineRowProps {
  meta: DraftLineMeta;
  index: number;
  control: Control<GrnFormValues>;
  /** Units scanned onto this line so far. Zero means nobody has scanned it. */
  scannedCount: number;
  isActive: boolean;
  onActivate: (poLineId: number) => void;
}
