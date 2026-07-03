import type { QuoteLineItem } from "@/types/crm/quotes";
import { formatCurrency } from "../lib/quote-utils";

interface QuoteLineItemsTableProps {
  lineItems: QuoteLineItem[];
  currency: string;
}

export function QuoteLineItemsTable({ lineItems, currency }: QuoteLineItemsTableProps) {
  if (!lineItems.length) {
    return (
      <p className="text-xs text-muted-foreground py-4 text-center">
        No line items added.
      </p>
    );
  }

  return (
    <div className="border border-border rounded-md overflow-hidden">
      <table className="w-full">
        <thead className="bg-muted/80">
          <tr className="border-b border-border">
            <th className="text-left px-3 py-2 text-[10px] uppercase tracking-wider font-bold text-muted-foreground">
              Description
            </th>
            <th className="text-right px-3 py-2 text-[10px] uppercase tracking-wider font-bold text-muted-foreground w-16">
              Qty
            </th>
            <th className="text-right px-3 py-2 text-[10px] uppercase tracking-wider font-bold text-muted-foreground w-28">
              Unit Price
            </th>
            <th className="text-right px-3 py-2 text-[10px] uppercase tracking-wider font-bold text-muted-foreground w-16">
              Tax %
            </th>
            <th className="text-right px-3 py-2 text-[10px] uppercase tracking-wider font-bold text-muted-foreground w-28">
              Amount
            </th>
          </tr>
        </thead>
        <tbody>
          {lineItems.map((item) => (
            <tr
              key={item.id}
              className="border-b border-border/50 last:border-0 h-8 hover:bg-muted/20"
            >
              <td className="px-3 py-1.5 text-[11px]">{item.description}</td>
              <td className="px-3 py-1.5 text-[11px] text-right tabular-nums">
                {parseFloat(item.quantity)}
              </td>
              <td className="px-3 py-1.5 text-[11px] text-right tabular-nums">
                {formatCurrency(item.unitPrice, currency)}
              </td>
              <td className="px-3 py-1.5 text-[11px] text-right tabular-nums text-muted-foreground">
                {parseFloat(item.taxRate)}%
              </td>
              <td className="px-3 py-1.5 text-[11px] text-right tabular-nums font-medium">
                {formatCurrency(item.amount, currency)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
