import type { RecordLayout } from "../layout";

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
  form: { sections: [] },
};

export interface QuoteLineItemRecord {
  readonly id: number;
  readonly description: string;
  readonly quantity: string;
  readonly unitPrice: string;
  readonly amount: string;
  readonly taxRate: string;
}

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
