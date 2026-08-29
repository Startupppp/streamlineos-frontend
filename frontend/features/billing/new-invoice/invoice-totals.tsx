import { formatInvoiceAmount } from "./new-invoice-schema";

export interface InvoiceTotalsValue {
  subtotal: number;
  taxPool: number;
  discount: number;
  total: number;
  split: { cgst: number; sgst: number; igst: number };
}

export function InvoiceTotals({ totals }: { totals: InvoiceTotalsValue }) {
  const isIntraState = totals.split.igst === 0 && totals.taxPool > 0;
  const isInterState = totals.split.igst > 0;
  return <section className="space-y-1.5 rounded-lg border border-border bg-card p-4 text-sm" aria-label="Invoice totals">
    <TotalRow label="Subtotal" value={totals.subtotal} />
    {isIntraState ? <><TotalRow label="CGST" value={totals.split.cgst} /><TotalRow label="SGST" value={totals.split.sgst} /></> : null}
    {isInterState ? <TotalRow label="IGST" value={totals.split.igst} /> : null}
    {totals.discount > 0 ? <TotalRow label="Discount" value={totals.discount} negative /> : null}
    <div className="flex justify-between border-t border-border pt-1.5 text-base font-bold"><span>Total</span><span>{formatInvoiceAmount(totals.total)}</span></div>
  </section>;
}

function TotalRow({ label, value, negative = false }: { label: string; value: number; negative?: boolean }) {
  return <div className="flex justify-between text-muted-foreground"><span>{label}</span><span className={negative ? "text-destructive" : undefined}>{negative ? "-" : ""}{formatInvoiceAmount(value)}</span></div>;
}
