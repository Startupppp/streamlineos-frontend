"use client";

import { apiClient } from "@/lib/api-client";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";

export const SCAN_PERMISSION = "inventory:stock:read";

export interface Gs1Parsed {
  raw: string;
  isGs1: boolean;
  gtin?: string;
  lotNumber?: string;
  serialNumber?: string;
  expiryDate?: string;
  elements: Array<{ ai: string; value: string }>;
  unparsed?: string;
}

export type BarcodeLookupResult =
  | {
      type: "product";
      productId: number;
      name: string;
      sku: string;
      status: string;
      totalOnHand: string;
    }
  | {
      type: "variant";
      variantId: number;
      productId: number;
      name: string;
      sku: string;
      isActive: boolean;
      totalOnHand: string;
    }
  | { type: "lot"; lotId: number; variantId: number; lotNumber: string; status: string }
  | {
      type: "serial";
      serialId: number;
      variantId: number;
      serialNumber: string;
      status: string;
      currentLocationId: number | null;
    }
  | {
      type: "location";
      locationId: number;
      warehouseId: number;
      name: string;
      code: string;
      locationType: string;
      isActive: boolean;
    }
  | { type: "not_found" };

export interface ScanResult {
  parsed: Gs1Parsed;
  variant?: {
    id: number;
    productId: number;
    name: string;
    sku: string;
    isActive: boolean;
  } | null;
  lot?: {
    id: number;
    productVariantId: number;
    lotNumber: string;
    status: string;
    expiryDate: string | null;
  } | null;
  serial?: {
    id: number;
    productVariantId: number;
    serialNumber: string;
    status: string;
    currentLocationId: number | null;
  } | null;
  lookup?: BarcodeLookupResult;
  warnings: string[];
}

export interface ScanCaptureResult extends ScanResult {
  captured: boolean;
}

export interface CaptureScanInput {
  payload: string;
  idempotencyKey: string;
}

export function useCaptureScan() {
  return useAuthorizedMutation<ScanCaptureResult, Error, CaptureScanInput>(
    "inventory:stock:read",
    {
      mutationKey: ["inventory", "barcode", "capture"],
      mutationFn: ({ payload, idempotencyKey }) =>
        apiClient.post<ScanCaptureResult>(
          "/inventory/barcode/scan/capture",
          { payload },
          { headers: { "Idempotency-Key": idempotencyKey } },
        ),
    },
  );
}

