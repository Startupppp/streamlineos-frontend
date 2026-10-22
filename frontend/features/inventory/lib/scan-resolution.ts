import type { ScanResult } from "@/hooks/api/inventory/scan";

export interface ResolvedScan {
  raw: string;
  variantId: number | null;
  lotId: number | null;
  lotNumber: string | null;
  serialId: number | null;
  serialNumber: string | null;
  locationId: number | null;
  locationCode: string | null;
  sku: string | null;
  code: string | null;
  unknown: boolean;
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
    unknown:
      variantId == null &&
      lotId == null &&
      serialId == null &&
      (lookup == null || lookup.type === "not_found"),
    warnings: result.warnings,
  };
}

export function describeScan(scan: ResolvedScan): string {
  const parts: string[] = [];
  if (scan.sku) parts.push(scan.sku);
  if (scan.lotNumber) parts.push(`lot ${scan.lotNumber}`);
  if (scan.serialNumber) parts.push(`serial ${scan.serialNumber}`);
  if (scan.locationCode) parts.push(`bin ${scan.locationCode}`);
  if (parts.length === 0) return scan.raw;
  return parts.join(" · ");
}

export function scanNamesVariant(scan: ResolvedScan, variantId: number, sku?: string | null): boolean {
  if (scan.variantId !== null) return scan.variantId === variantId;
  if (sku && scan.code) return scan.code.toLowerCase() === sku.toLowerCase();
  return false;
}
