"use client";

import { FileText } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RecordDetail } from "@/components/renderer";
import { useTenantLayout } from "@/components/renderer/use-tenant-layout";
import { QUOTE_LAYOUT, quoteRecordFields } from "@/lib/renderer/crm/quote-layout";
import { useOrgDisplay } from "@/hooks/api/org-display";
import type { Quote } from "@/types/crm/quotes";
import { QuoteLineItemsTable } from "./quote-line-items-table";

/**
 * A quote, rendered from the same description that produced its list.
 *
 * Everything except the line items is now `QUOTE_LAYOUT`: the totals, the dates,
 * the terms, the notes, and — since the engine learned to resolve a reference to
 * a route — the deal and the client. Five hand-rolled cards became one
 * `RecordDetail`, so a field added to the quote appears here and in the list
 * without this file being touched, and the money follows the quote's own
 * currency instead of a `formatCurrency(amount, currency)` call per line.
 *
 * The totals under the line items are gone, and the arithmetic with them. They
 * summed the line amounts on the client to produce a subtotal the server had
 * already computed and stored as `totalAmount`; two arithmetics over one quote
 * is one of them eventually disagreeing. The Value section states the stored
 * figures, which are the ones on the document the customer received.
 *
 * The two-column grid went with the cards. It existed to park a sidebar beside
 * the line items, and a grid whose second column is empty is a layout describing
 * a screen that no longer exists.
 */

interface QuoteDetailContentProps {
  quote: Quote;
}

export function QuoteDetailContent({ quote }: QuoteDetailContentProps) {
  const layout = useTenantLayout(QUOTE_LAYOUT);
  const money = useOrgDisplay();

  return (
    <div className="flex min-w-0 flex-col gap-4">
      <Card className="gap-0 overflow-hidden py-0 shadow-sm">
        <CardHeader className="border-b px-4 py-3">
          <CardTitle className="flex items-center gap-2 text-sm font-medium">
            <FileText className="h-4 w-4 text-muted-foreground" />
            Line items
          </CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto p-0">
          <QuoteLineItemsTable lineItems={quote.lineItems ?? []} currency={quote.currency} />
        </CardContent>
      </Card>

      <RecordDetail
        layout={layout}
        record={quoteRecordFields(quote)}
        money={money}
        showTitle={false}
      />
    </div>
  );
}
