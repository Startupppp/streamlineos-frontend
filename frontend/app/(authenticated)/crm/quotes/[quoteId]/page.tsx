"use client";

import { use, useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Send, Trash2, FileText, StickyNote } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useQuoteDetail, useSendQuote, useDeleteQuote } from "@/hooks/api/quotes";
import { getErrorMessage } from "@/lib/get-error-message";

const STATUS_COLORS: Record<string, string> = {
  DRAFT: "bg-muted text-muted-foreground border-transparent",
  SENT: "bg-blue-500/10 text-blue-600 border-blue-500/20",
  ACCEPTED: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
  REJECTED: "bg-red-500/10 text-red-600 border-red-500/20",
  EXPIRED: "bg-amber-500/10 text-amber-600 border-amber-500/20",
};

function formatCurrency(value: string | number, currency: string): string {
  const num = typeof value === "string" ? Number(value) : value;
  return `${currency} ${num.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function MetaItem({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-xs text-muted-foreground">{label}</span>
      <div className="text-sm font-medium">{children}</div>
    </div>
  );
}

function TotalsRow({
  label,
  value,
  bold,
}: {
  label: string;
  value: string;
  bold?: boolean;
}) {
  return (
    <div
      className={`flex justify-between items-center py-0.5 ${
        bold ? "font-semibold text-base text-foreground" : "text-sm text-muted-foreground"
      }`}
    >
      <span>{label}</span>
      <span>{value}</span>
    </div>
  );
}

function QuoteDetailSkeleton() {
  return (
    <div className="space-y-5">
      <Skeleton className="h-24 w-full rounded-xl" />
      <Skeleton className="h-56 w-full rounded-xl" />
      <Skeleton className="h-20 w-full rounded-xl" />
    </div>
  );
}

export default function QuoteDetailPage({
  params,
}: {
  params: Promise<{ quoteId: string }>;
}) {
  const { quoteId: quoteIdStr } = use(params);
  const quoteId = Number(quoteIdStr);
  const router = useRouter();

  const { data: quote, isLoading } = useQuoteDetail(quoteId);
  const sendQuote = useSendQuote();
  const deleteQuote = useDeleteQuote();

  const [deleteOpen, setDeleteOpen] = useState(false);

  const handleBackToQuotes = useCallback(() => router.push("/crm/quotes"), [router]);

  const handleSend = useCallback(() => {
    sendQuote.mutate(quoteId, {
      onSuccess: () => toast.success("Quote sent successfully"),
      onError: (err) => toast.error(getErrorMessage(err)),
    });
  }, [quoteId, sendQuote]);

  const handleDeleteConfirm = useCallback(() => {
    deleteQuote.mutate(quoteId, {
      onSuccess: () => {
        toast.success("Quote deleted");
        router.push("/crm/quotes");
      },
      onError: (err) => toast.error(getErrorMessage(err)),
    });
  }, [quoteId, deleteQuote, router]);

  const handleDeleteOpenChange = useCallback((open: boolean) => {
    setDeleteOpen(open);
  }, []);

  if (isLoading) {
    return (
      <PageWrapper title="Quote" subtitle="Loading…">
        <QuoteDetailSkeleton />
      </PageWrapper>
    );
  }

  if (!quote) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
        <FileText className="h-12 w-12 text-muted-foreground" />
        <p className="text-muted-foreground">Quote not found</p>
        <Button variant="outline" onClick={handleBackToQuotes}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Quotes
        </Button>
      </div>
    );
  }

  const currency = quote.currency ?? "INR";
  const lineItems = (quote.lineItems ?? [])
    .slice()
    .sort((a, b) => a.displayOrder - b.displayOrder);

  return (
    <PageWrapper
      title={quote.subject}
      subtitle={
        <span className="font-mono text-xs bg-muted px-2 py-0.5 rounded select-all">
          #{quote.quoteNumber}
        </span>
      }
      badge={
        <Badge variant="secondary" className={STATUS_COLORS[quote.status]}>
          {quote.status}
        </Badge>
      }
      actions={
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={handleBackToQuotes}
            aria-label="Back to quotes"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>

          {quote.status === "DRAFT" && (
            <Button size="sm" onClick={handleSend} disabled={sendQuote.isPending}>
              <Send className="h-4 w-4 mr-2" />
              {sendQuote.isPending ? "Sending…" : "Send"}
            </Button>
          )}

          <AlertDialog open={deleteOpen} onOpenChange={handleDeleteOpenChange}>
            <AlertDialogTrigger asChild>
              <Button size="sm" variant="destructive">
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete Quote</AlertDialogTitle>
                <AlertDialogDescription>
                  Are you sure you want to delete quote #{quote.quoteNumber}? This action cannot
                  be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  onClick={handleDeleteConfirm}
                >
                  {deleteQuote.isPending ? "Deleting…" : "Delete"}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      }
    >
      <div className="space-y-5">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Quote Details</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <MetaItem label="Client">
                {quote.client ? (
                  <Link
                    href={`/crm/clients/${quote.client.id}`}
                    className="text-blue-600 hover:underline"
                  >
                    {quote.client.clientName}
                  </Link>
                ) : (
                  <span className="text-muted-foreground">—</span>
                )}
              </MetaItem>

              <MetaItem label="Deal">
                {quote.deal ? (
                  <Link
                    href={`/crm/deals/${quote.deal.id}`}
                    className="text-blue-600 hover:underline"
                  >
                    {quote.deal.name}
                  </Link>
                ) : (
                  <span className="text-muted-foreground">—</span>
                )}
              </MetaItem>

              <MetaItem label="Valid Until">
                {quote.validUntil ? (
                  format(new Date(quote.validUntil), "dd MMM yyyy")
                ) : (
                  <span className="text-muted-foreground">—</span>
                )}
              </MetaItem>

              <MetaItem label="Currency">{currency}</MetaItem>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Line Items</CardTitle>
          </CardHeader>
          <CardContent className="p-0 pb-4">
            <div className="overflow-x-auto">
              <Table className="min-w-[560px]">
                <TableHeader>
                  <TableRow>
                    <TableHead className="pl-4">Description</TableHead>
                    <TableHead className="text-right w-20">Qty</TableHead>
                    <TableHead className="text-right w-36">Unit Price</TableHead>
                    <TableHead className="text-right w-20">Tax %</TableHead>
                    <TableHead className="text-right pr-4 w-36">Line Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {lineItems.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={5}
                        className="text-center text-muted-foreground py-8"
                      >
                        No line items on this quote
                      </TableCell>
                    </TableRow>
                  ) : (
                    lineItems.map((item) => {
                      const qty = Number(item.quantity);
                      const unitPrice = Number(item.unitPrice);
                      const taxRate = Number(item.taxRate);
                      const lineTotal = qty * unitPrice * (1 + taxRate / 100);
                      return (
                        <TableRow key={item.id}>
                          <TableCell className="pl-4">{item.description}</TableCell>
                          <TableCell className="text-right">{qty}</TableCell>
                          <TableCell className="text-right">
                            {formatCurrency(unitPrice, currency)}
                          </TableCell>
                          <TableCell className="text-right">{taxRate}%</TableCell>
                          <TableCell className="text-right pr-4">
                            {formatCurrency(lineTotal, currency)}
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>

            <div className="px-4 mt-4">
              <Separator className="mb-3" />
              <div className="ml-auto max-w-xs space-y-0.5">
                <TotalsRow
                  label="Subtotal"
                  value={formatCurrency(quote.totalAmount, currency)}
                />
                <TotalsRow
                  label="Tax Amount"
                  value={formatCurrency(quote.taxAmount, currency)}
                />
                <TotalsRow
                  label="Discount"
                  value={`- ${formatCurrency(quote.discountAmount, currency)}`}
                />
                <Separator className="my-2" />
                <TotalsRow
                  label="Net Amount"
                  value={formatCurrency(quote.netAmount, currency)}
                  bold
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {quote.termsAndConditions && (
          <Card>
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Terms &amp; Conditions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">
                {quote.termsAndConditions}
              </p>
            </CardContent>
          </Card>
        )}

        {quote.notes && (
          <Card>
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                <StickyNote className="h-4 w-4" />
                Notes
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">
                {quote.notes}
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </PageWrapper>
  );
}
