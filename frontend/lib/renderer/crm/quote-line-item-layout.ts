import type { RecordLayout } from "../layout";

/**
 * A quote's line items, as data.
 *
 * Its own description rather than part of `QUOTE_LAYOUT`, because a line item is
 * its own record — a quote has many — and a layout describes one record. What
 * they share is the currency, and that is the whole reason this file exists: a
 * line's unit price and amount are written in the currency the customer buys in,
 * which is stored on the *quote*, not on the line. `currencyField` names a
 * sibling field, so `quoteLineItemRecordFields` copies the quote's currency onto
 * every row and the money renders in it. Rendering ₹ over a line priced in
 * dollars is not a formatting slip; it states a different price.
 *
 * `currency` is therefore a field and not a column: the description has to name
 * it for `currencyField` to point at it, but nobody needs a column repeating the
 * same three letters down the table.
 *
 * Nothing here carries a `sign`. A quantity, a unit price and a line total are
 * arithmetic; none of them is good or bad news on its own.
 */
export const QUOTE_LINE_ITEM_LAYOUT: RecordLayout = {
  key: "crm:quote-line-item",
  singular: "Line item",
  plural: "Line items",
  titleField: "description",
  fields: [
    { name: "description", label: "Description", kind: "text", readOnly: true },
    { name: "quantity", label: "Qty", kind: "number", readOnly: true },
    {
      name: "unitPrice",
      label: "Unit price",
      kind: "money",
      readOnly: true,
      currencyField: "currency",
    },
    { name: "taxRate", label: "Tax", kind: "percent", readOnly: true },
    {
      name: "amount",
      label: "Amount",
      kind: "money",
      readOnly: true,
      currencyField: "currency",
    },
    { name: "currency", label: "Currency", kind: "text", readOnly: true },
  ],
  list: {
    searchPlaceholder: "Search line items…",
    columns: [
      { field: "description", primary: true },
      { field: "quantity", width: "w-20 shrink-0" },
      { field: "unitPrice", width: "w-32 shrink-0" },
      { field: "taxRate", width: "w-20 shrink-0" },
      { field: "amount", width: "w-32 shrink-0" },
    ],
  },
  detail: {
    sections: [{ title: "Line", fields: ["description", "quantity", "unitPrice", "taxRate", "amount"] }],
  },
  /*
    A line item is never edited on its own. It is edited as part of the quote,
    in a grid where a row's total moves as its quantity does and the quote's
    totals move with it — which is a screen a description cannot express, and
    the reason the quote sheet is hand-written. See `quote-layout.ts`.
  */
  form: { sections: [] },
};

/** The shape the quote endpoint sends for a line, plus the quote's own currency. */
export interface QuoteLineItemRecord {
  readonly id: number;
  readonly description: string;
  readonly quantity: string;
  readonly unitPrice: string;
  readonly amount: string;
  readonly taxRate: string;
}

/**
 * One line in the shape the description names.
 *
 * The numeric strings are converted rather than passed through: the API sends
 * `"2.00"` for a quantity of two, and a column of `2.00`s is two characters of
 * density spent saying nothing. Money is left as it arrived, because
 * `formatMoney` reads it and rounding it here would round it twice.
 */
export function quoteLineItemRecordFields(
  item: QuoteLineItemRecord,
  currency: string,
): Record<string, unknown> {
  return {
    id: item.id,
    description: item.description,
    quantity: Number(item.quantity),
    unitPrice: item.unitPrice,
    taxRate: item.taxRate,
    amount: item.amount,
    currency,
  };
}
