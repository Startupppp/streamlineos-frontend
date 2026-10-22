"use client";

import { useMemo } from "react";
import { EmptyState } from "@/components/ui/empty-state";
import { RecordList, asRecordValues } from "@/components/renderer";
import { useDensity } from "@/components/renderer/density-toggle";
import { useTenantLayout } from "@/components/renderer/use-tenant-layout";
import {
  QUOTE_LINE_ITEM_LAYOUT,
  quoteLineItemRecordFields,
} from "@/lib/renderer/crm/quote-line-item-layout";
import { useOrgDisplay } from "@/hooks/api/org-display";
import type { QuoteLineItem } from "@/types/crm/quotes";

interface QuoteLineItemsTableProps {
  lineItems: QuoteLineItem[];
  currency: string;
}

export function QuoteLineItemsTable({ lineItems, currency }: QuoteLineItemsTableProps) {
  const layout = useTenantLayout(QUOTE_LINE_ITEM_LAYOUT);
  const money = useOrgDisplay();
  const [density] = useDensity();

  const rows = useMemo(
    () => asRecordValues(lineItems.map((item) => quoteLineItemRecordFields(item, currency))),
    [lineItems, currency],
  );

  return (
    <RecordList
      layout={layout}
      rows={rows}
      getRowKey={(row) => String(row.id)}
      density={density}
      money={money}
      minWidth="560px"
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
