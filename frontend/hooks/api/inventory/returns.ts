"use client";

/**
 * B9 — the returns data layer, moved out of `operations.ts`.
 *
 * That file owns goods receipts and had grown past the size limit carrying both.
 * Returns now own their own file, which is also where the approval step, the
 * inspection call and the detail read live.
 */

export { CUSTOMER_RETURNS_PERMISSION, VENDOR_RETURNS_PERMISSION } from "./returns-common";
export type {
  ReturnStatus,
  VendorReturnStatus,
  CustomerReturnStatus,
  CustomerReturnDisposition,
  VendorReturnReason,
  ApproveReturnInput,
  PostReturnInput,
  CancelReturnInput,
} from "./returns-common";
export * from "./returns-vendor";
export * from "./returns-customer";
