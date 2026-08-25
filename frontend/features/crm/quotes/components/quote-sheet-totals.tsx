interface QuoteSheetTotalsProps {
  currency: string;
  subtotal: number;
  discountAmt: number;
  taxTotal: number;
  grandTotal: number;
}

export function QuoteSheetTotals({
  currency,
  subtotal,
  discountAmt,
  taxTotal,
  grandTotal,
}: QuoteSheetTotalsProps) {
  return (
    <div className="flex flex-col gap-0.5 items-end text-xs tabular-nums font-mono">
      <span className="text-muted-foreground">
        Subtotal: {currency} {subtotal.toFixed(2)}
      </span>
      {discountAmt > 0 && (
        <span className="text-status-warning-ink">
          Discount: -{currency} {discountAmt.toFixed(2)}
        </span>
      )}
      <span className="text-muted-foreground">
        Tax: {currency} {taxTotal.toFixed(2)}
      </span>
      <span className="font-semibold text-foreground text-sm">
        Total: {currency} {grandTotal.toFixed(2)}
      </span>
    </div>
  );
}
