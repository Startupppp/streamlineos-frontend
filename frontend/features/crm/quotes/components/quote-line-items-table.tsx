import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import type { QuoteLineItem } from "@/types/crm/quotes";
import { formatCurrency } from "../lib/quote-utils";
import { TruncatedText } from "@/components/ui/truncated-text";
import { EmptyState } from "@/components/ui/empty-state";

interface QuoteLineItemsTableProps {
  lineItems: QuoteLineItem[];
  currency: string;
}

function buildColumns(currency: string): DataTableColumn<QuoteLineItem>[] {
  return [
    {
      key: "description",
      header: "Description",
      cell: (row) => <TruncatedText text={row.description} lines={2} className="text-dense max-w-[200px]" />,
    },
    {
      key: "quantity",
      header: "Qty",
      headerClassName: "text-right w-16",
      className: "text-right",
      cell: (row) => (
        <span className="text-dense tabular-nums">{parseFloat(row.quantity)}</span>
      ),
    },
    {
      key: "unitPrice",
      header: "Unit Price",
      headerClassName: "text-right w-28",
      className: "text-right",
      cell: (row) => (
        <span className="text-dense tabular-nums">
          {formatCurrency(row.unitPrice, currency)}
        </span>
      ),
    },
    {
      key: "taxRate",
      header: "Tax %",
      headerClassName: "text-right w-16",
      className: "text-right",
      cell: (row) => (
        <span className="text-dense tabular-nums text-muted-foreground">
          {parseFloat(row.taxRate)}%
        </span>
      ),
    },
    {
      key: "amount",
      header: "Amount",
      headerClassName: "text-right w-28",
      className: "text-right",
      cell: (row) => (
        <span className="text-dense tabular-nums font-medium">
          {formatCurrency(row.amount, currency)}
        </span>
      ),
    },
  ];
}

export function QuoteLineItemsTable({ lineItems, currency }: QuoteLineItemsTableProps) {
  return (
    <DataTable
      data={lineItems}
      columns={buildColumns(currency)}
      getRowKey={(row) => row.id}
      emptyState={
        <EmptyState
          compact
          title="No line items"
          description="This quote has nothing on it yet. Edit the quote to add products or services."
        />
      }
    />
  );
}
