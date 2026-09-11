import type { PackageLine } from "@/hooks/api/inventory/shipping";

export interface EditableLine {
  variantId: string;
  qty: string;
  lotId: string;
  serialId: string;
}

export function buildDefaultLines(lines?: PackageLine[]): EditableLine[] {
  if (!lines || lines.length === 0) return [];
  return lines.map((l) => ({
    variantId: String(l.productVariantId),
    // A decimal string at scale 4 on the wire; the input edits the plain number.
    qty: String(Number(l.quantity)),
    lotId: l.lotId ? String(l.lotId) : "",
    serialId: l.serialId ? String(l.serialId) : "",
  }));
}
