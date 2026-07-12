import Link from "next/link";
import {
  Send,
  CheckCircle2,
  XCircle,
  FileText,
  Calendar,
  User,
  Building2,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { QuoteLineItemsTable } from "./quote-line-items-table";
import { formatCurrency, formatDate } from "../lib/quote-utils";
import type { Quote } from "@/types/crm/quotes";

interface QuoteDetailContentProps {
  quote: Quote;
  subtotal: number;
}

export function QuoteDetailContent({ quote, subtotal }: QuoteDetailContentProps) {
  const lineItems = quote.lineItems ?? [];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      <div className="lg:col-span-2 space-y-4">
        <Card className="shadow-sm">
          <CardHeader className="px-4 py-3 border-b">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <FileText className="h-4 w-4 text-muted-foreground" />
              Line Items
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            <QuoteLineItemsTable lineItems={lineItems} currency={quote.currency} />
            <div className="mt-4 space-y-1.5 max-w-xs ml-auto">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Subtotal</span>
                <span className="tabular-nums">
                  {formatCurrency(String(subtotal), quote.currency)}
                </span>
              </div>
              {parseFloat(quote.taxAmount) > 0 && (
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Tax</span>
                  <span className="tabular-nums">
                    {formatCurrency(quote.taxAmount, quote.currency)}
                  </span>
                </div>
              )}
              {parseFloat(quote.discountAmount) > 0 && (
                <div className="flex justify-between text-xs text-emerald-600">
                  <span>Discount</span>
                  <span className="tabular-nums">
                    −{formatCurrency(quote.discountAmount, quote.currency)}
                  </span>
                </div>
              )}
              <Separator />
              <div className="flex justify-between text-sm font-semibold">
                <span>Net Total</span>
                <span className="tabular-nums">
                  {formatCurrency(quote.netAmount, quote.currency)}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {quote.termsAndConditions && (
          <Card className="shadow-sm">
            <CardHeader className="px-4 py-3 border-b">
              <CardTitle className="text-sm font-medium">
                Terms &amp; Conditions
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 py-3">
              <p className="text-xs text-muted-foreground whitespace-pre-wrap">
                {quote.termsAndConditions}
              </p>
            </CardContent>
          </Card>
        )}

        {quote.notes && (
          <Card className="shadow-sm">
            <CardHeader className="px-4 py-3 border-b">
              <CardTitle className="text-sm font-medium">Notes</CardTitle>
            </CardHeader>
            <CardContent className="px-4 py-3">
              <p className="text-xs text-muted-foreground whitespace-pre-wrap">
                {quote.notes}
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      <div className="space-y-4">
        <Card className="shadow-sm">
          <CardHeader className="px-4 py-3 border-b">
            <CardTitle className="text-sm font-medium">Details</CardTitle>
          </CardHeader>
          <CardContent className="px-4 py-3 space-y-3">
            {quote.deal && (
              <div className="flex items-start gap-2.5">
                <Building2 className="h-3.5 w-3.5 text-muted-foreground mt-0.5 shrink-0" />
                <div className="min-w-0">
                  <p className="text-[10px] text-muted-foreground">Deal</p>
                  <Link
                    href={`/crm/deals/${quote.deal.id}`}
                    className="text-xs font-medium text-blue-600 hover:underline truncate block"
                  >
                    {quote.deal.name}
                  </Link>
                </div>
              </div>
            )}
            {quote.client && (
              <div className="flex items-start gap-2.5">
                <User className="h-3.5 w-3.5 text-muted-foreground mt-0.5 shrink-0" />
                <div className="min-w-0">
                  <p className="text-[10px] text-muted-foreground">Client</p>
                  <Link
                    href={`/crm/clients/${quote.client.id}`}
                    className="text-xs font-medium text-blue-600 hover:underline truncate block"
                  >
                    {quote.client.clientName}
                  </Link>
                </div>
              </div>
            )}
            <div className="flex items-start gap-2.5">
              <Calendar className="h-3.5 w-3.5 text-muted-foreground mt-0.5 shrink-0" />
              <div>
                <p className="text-[10px] text-muted-foreground">Valid Until</p>
                <p className="text-xs font-medium">{formatDate(quote.validUntil)}</p>
              </div>
            </div>
            {quote.createdBy && (
              <div className="flex items-start gap-2.5">
                <User className="h-3.5 w-3.5 text-muted-foreground mt-0.5 shrink-0" />
                <div>
                  <p className="text-[10px] text-muted-foreground">Created By</p>
                  <p className="text-xs font-medium">{quote.createdBy.name ?? "—"}</p>
                </div>
              </div>
            )}
            <div className="flex items-start gap-2.5">
              <Calendar className="h-3.5 w-3.5 text-muted-foreground mt-0.5 shrink-0" />
              <div>
                <p className="text-[10px] text-muted-foreground">Created</p>
                <p className="text-xs">{formatDate(quote.createdAt)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {(quote.sentAt ?? quote.acceptedAt ?? quote.rejectedAt) && (
          <Card className="shadow-sm">
            <CardHeader className="px-4 py-3 border-b">
              <CardTitle className="text-sm font-medium">History</CardTitle>
            </CardHeader>
            <CardContent className="px-4 py-3 space-y-2">
              {quote.sentAt && (
                <div className="flex items-center gap-2">
                  <Send className="h-3 w-3 text-blue-500 shrink-0" />
                  <div>
                    <p className="text-[10px] text-muted-foreground">Sent</p>
                    <p className="text-xs">{formatDate(quote.sentAt)}</p>
                  </div>
                </div>
              )}
              {quote.acceptedAt && (
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-3 w-3 text-emerald-500 shrink-0" />
                  <div>
                    <p className="text-[10px] text-muted-foreground">Accepted</p>
                    <p className="text-xs">{formatDate(quote.acceptedAt)}</p>
                  </div>
                </div>
              )}
              {quote.rejectedAt && (
                <div className="flex items-center gap-2">
                  <XCircle className="h-3 w-3 text-red-500 shrink-0" />
                  <div>
                    <p className="text-[10px] text-muted-foreground">Rejected</p>
                    <p className="text-xs">{formatDate(quote.rejectedAt)}</p>
                    {quote.rejectionReason && (
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        {quote.rejectionReason}
                      </p>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
