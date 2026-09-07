export interface EditableLine {
  variantId: string;
  qty: string;
  lotId: string;
  serialId: string;
}

export function buildDefaultLines(items?: { productVariantId: number; quantity: string; lotId: number | null; serialId: number | null }[]): EditableLine[] {
  if (!items || items.length === 0) return [];
  return items.map((l) => ({
    variantId: String(l.productVariantId),
    qty: l.quantity,
    lotId: l.lotId ? String(l.lotId) : "",
    serialId: l.serialId ? String(l.serialId) : "",
  }));
}
