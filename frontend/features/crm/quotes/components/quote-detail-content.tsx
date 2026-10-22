"use client";

import { FileText } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RecordDetail } from "@/components/renderer";
import { useTenantLayout } from "@/components/renderer/use-tenant-layout";
import { QUOTE_LAYOUT, quoteRecordFields } from "@/lib/renderer/crm/quote-layout";
import { useOrgDisplay } from "@/hooks/api/org-display";
import type { Quote } from "@/types/crm/quotes";
import { QuoteLineItemsTable } from "./quote-line-items-table";

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
