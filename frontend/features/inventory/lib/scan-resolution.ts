import type { ScanResult } from "@/hooks/api/inventory/scan";

/**
 * B2 — what one scan names, in the shape the operator surfaces need.
 *
 * The API answers two different ways for one physical act: a GS1 label resolves
 * into `variant` / `lot` / `serial`, and anything else falls through to a plain
 * `lookup`. Every screen that matches a scan against a document would otherwise
 * repeat that fork, and the fork is exactly where a bin label gets read as a
 * SKU. It is written once here, in the same priority the backend's own
 * `resolveScan` uses, so the client and the server cannot disagree about which
 * goods a label names.
 */
export interface ResolvedScan {
  /** The payload as the scanner read it, separators intact. */
  raw: string;
  variantId: number | null;
  lotId: number | null;
  lotNumber: string | null;
  serialId: number | null;
  serialNumber: string | null;
  locationId: number | null;
  locationCode: string | null;
  sku: string | null;
  /** A GTIN, SKU or bare code, for matching a document that stores no ids. */
  code: string | null;
  /** Resolved to nothing this organisation holds. */
  unknown: boolean;
  /** Resolved, but the label and the record disagree about something. */
  warnings: string[];
}

export function resolveScan(result: ScanResult): ResolvedScan {
  const lookup = result.lookup;

  const variantId =
    result.variant?.id ??
    (lookup?.type === "variant"
      ? lookup.variantId
      : lookup?.type === "lot"
        ? lookup.variantId
        : lookup?.type === "serial"
          ? lookup.variantId
          : null);

  const lotId = result.lot?.id ?? (lookup?.type === "lot" ? lookup.lotId : null);
  const serialId = result.serial?.id ?? (lookup?.type === "serial" ? lookup.serialId : null);

  const sku =
    result.variant?.sku ??
    (lookup?.type === "variant" || lookup?.type === "product" ? lookup.sku : null);

  return {
    raw: result.parsed.raw,
    variantId: variantId ?? null,
    lotId: lotId ?? null,
    lotNumber:
      result.lot?.lotNumber ??
      result.parsed.lotNumber ??
      (lookup?.type === "lot" ? lookup.lotNumber : null) ??
      null,
    serialId: serialId ?? null,
    serialNumber:
      result.serial?.serialNumber ??
      result.parsed.serialNumber ??
      (lookup?.type === "serial" ? lookup.serialNumber : null) ??
      null,
    locationId: lookup?.type === "location" ? lookup.locationId : null,
    locationCode: lookup?.type === "location" ? lookup.code : null,
    sku,
    code: result.parsed.gtin ?? sku ?? result.parsed.raw,
    /*
     * A product-level or location-level hit is not "unknown": it names something
     * real, just not a variant. Only nothing at all is unknown.
     */
    unknown:
      variantId == null &&
      lotId == null &&
      serialId == null &&
      (lookup === undefined || lookup.type === "not_found"),
    warnings: result.warnings,
  };
}

/**
 * A short human label for the scan, for an announcement or a chip.
 *
 * Names, never ids (frontend §5): a screen reader saying "variant 4417" tells a
 * picker nothing they can act on.
 */
export function describeScan(scan: ResolvedScan): string {
  const parts: string[] = [];
  if (scan.sku) parts.push(scan.sku);
  if (scan.lotNumber) parts.push(`lot ${scan.lotNumber}`);
  if (scan.serialNumber) parts.push(`serial ${scan.serialNumber}`);
  if (scan.locationCode) parts.push(`bin ${scan.locationCode}`);
  if (parts.length === 0) return scan.raw;
  return parts.join(" · ");
}

/** True when the scan names these goods, whichever grain the label carried. */
export function scanNamesVariant(scan: ResolvedScan, variantId: number, sku?: string | null): boolean {
  if (scan.variantId !== null) return scan.variantId === variantId;
  if (sku && scan.code) return scan.code.toLowerCase() === sku.toLowerCase();
  return false;
}
