"use client";

import { useMutation } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";

/**
 * B2 — `POST /inventory/barcode/scan/capture`, as the API actually shapes it.
 *
 * The read-only sibling `/scan` resolves and reports; capture records the scan
 * as a fact and emits `inventory.scan.captured` before anything acts on it.
 * They exist separately because they fail separately: a warehouse whose putaway
 * was rejected still needs to know the pallet was scanned at the door. Every
 * operator surface therefore captures, and nothing on the client calls the
 * read-only pair — capture returns the same resolution and the fact besides.
 *
 * The endpoint carries `inventory:stock:read`, so one key gates the whole shell.
 */
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

/**
 * The plain-code fallback, for a payload that is not a GS1 element string.
 *
 * Field names mirror `BarcodeLookupResult` in
 * `backend/src/modules/inventory/barcode/dto/inv-barcode.schemas.ts` exactly.
 * The previous declaration invented `productName` / `variantSku` /
 * `locationName`, none of which any response has ever carried, so the lookup
 * card rendered `undefined` for every row.
 */
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
  /** Things that resolved but disagree. Never silently dropped. */
  warnings: string[];
}

/** `captured` is false when the key replayed — the fact was written by an earlier attempt. */
export interface ScanCaptureResult extends ScanResult {
  captured: boolean;
}

export interface CaptureScanInput {
  payload: string;
  /**
   * Supplied by the caller, never minted here.
   *
   * A device that retries has to replay, and a second physical scan of the same
   * SKU has to record a second fact. Only the surface holding the scanner knows
   * which of the two just happened, so it owns the key.
   */
  idempotencyKey: string;
}

/**
 * B2, item 2 — the capture that has to happen before the stock command.
 *
 * Deliberately not wired to `onSuccess` invalidations: capturing a scan changes
 * no list. The command that follows it does, and that command already
 * invalidates.
 */
export function useCaptureScan() {
  return useMutation<ScanCaptureResult, Error, CaptureScanInput>({
    mutationKey: ["inventory", "barcode", "capture"],
    mutationFn: ({ payload, idempotencyKey }) =>
      apiClient.post<ScanCaptureResult>(
        "/inventory/barcode/scan/capture",
        { payload },
        { headers: { "Idempotency-Key": idempotencyKey } },
      ),
  });
}

