"use client";

import { use, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Send,
  CheckCircle2,
  XCircle,
  Trash2,
  FileText,
  Calendar,
  User,
  Building2,
  AlertCircle,
  SearchX,
  RefreshCw,
} from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import { Separator } from "@/components/ui/separator";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { staggerContainer, fadeUp } from "@/lib/motion-variants";
import { cn } from "@/lib/utils";
import { useQuoteDetail, useUpdateQuoteStatus, useDeleteQuote } from "@/hooks/api/crm";
import { getErrorMessage } from "@/lib/get-error-message";
import type { QuoteStatus, QuoteLineItem } from "@/types/crm/quotes";

const STATUS_LABELS: Record<QuoteStatus, string> = {
  DRAFT: "Draft",
  SENT: "Sent",
  ACCEPTED: "Accepted",
  REJECTED: "Rejected",
  EXPIRED: "Expired",
};

const STATUS_BADGE_CLASSES: Record<QuoteStatus, string> = {
  DRAFT: "bg-slate-100 text-slate-700 border-slate-200",
  SENT: "bg-blue-50 text-blue-700 border-blue-200",
  ACCEPTED: "bg-emerald-50 text-emerald-700 border-emerald-200",
  REJECTED: "bg-red-50 text-red-700 border-red-200",
  EXPIRED: "bg-amber-50 text-amber-700 border-amber-200",
};

const STATUS_ORDER: QuoteStatus[] = ["DRAFT", "SENT", "ACCEPTED"];

function formatCurrency(amount: string, currency: string) {
  const num = parseFloat(amount);
  if (isNaN(num)) return "—";
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: currency || "INR",
    maximumFractionDigits: 2,
  }).format(num);
}

function formatDate(date: string | null | undefined) {
  if (!date) return "—";
  return new Date(date).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function StatusProgress({ status }: { status: QuoteStatus }) {
  if (status === "REJECTED" || status === "EXPIRED") {
    return (
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <span className="h-2 w-2 rounded-full bg-muted-foreground/30 inline-block" />
          Draft
        </div>
        <div className="flex-1 h-px bg-border" />
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <span className="h-2 w-2 rounded-full bg-muted-foreground/30 inline-block" />
          Sent
        </div>
        <div className="flex-1 h-px bg-border" />
        <div
          className={cn(
            "flex items-center gap-1.5 text-xs font-medium",
            status === "REJECTED" ? "text-red-600" : "text-amber-600",
          )}
        >
          <span
            className={cn(
              "h-2 w-2 rounded-full inline-block",
              status === "REJECTED" ? "bg-red-500" : "bg-amber-500",
            )}
          />
          {STATUS_LABELS[status]}
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1">
      {STATUS_ORDER.map((s, idx) => {
        const currentIdx = STATUS_ORDER.indexOf(status);
        const isPast = idx < currentIdx;
        const isCurrent = s === status;
        return (
          <div key={s} className="flex items-center gap-1">
            <div
              className={cn(
                "flex items-center gap-1.5 text-xs",
                isCurrent
                  ? "font-semibold text-foreground"
                  : isPast
                    ? "text-emerald-600"
                    : "text-muted-foreground",
              )}
            >
              <span
                className={cn(
                  "h-2 w-2 rounded-full inline-block",
                  isCurrent
                    ? "bg-primary"
                    : isPast
                      ? "bg-emerald-500"
                      : "bg-muted-foreground/30",
                )}
              />
              {STATUS_LABELS[s]}
            </div>
            {idx < STATUS_ORDER.length - 1 && (
              <div
                className={cn(
                  "w-8 h-px mx-1",
                  isPast ? "bg-emerald-500" : "bg-border",
                )}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

function LineItemsTable({
  lineItems,
  currency,
}: {
  lineItems: QuoteLineItem[];
  currency: string;
}) {
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

export default function QuoteDetailPage({
  params,
}: {
  params: Promise<{ quoteId: string }>;
}) {
  const { quoteId: quoteIdStr } = use(params);
  const quoteId = Number(quoteIdStr);
  const router = useRouter();

  const { data, isLoading, isError, refetch } = useQuoteDetail(quoteId);
  const updateStatus = useUpdateQuoteStatus();
  const deleteQuote = useDeleteQuote();

  const quote = data ?? null;

  const handleBack = useCallback(() => router.push("/crm/quotes"), [router]);
  const handleRetry = useCallback(() => void refetch(), [refetch]);

  const handleSend = useCallback(() => {
    updateStatus.mutate(
      { id: quoteId, status: "SENT" },
      {
        onSuccess: () => toast.success("Quote sent"),
        onError: (e) => toast.error(getErrorMessage(e)),
      },
    );
  }, [quoteId, updateStatus]);

  const handleAccept = useCallback(() => {
    updateStatus.mutate(
      { id: quoteId, status: "ACCEPTED" },
      {
        onSuccess: () => toast.success("Quote accepted"),
        onError: (e) => toast.error(getErrorMessage(e)),
      },
    );
  }, [quoteId, updateStatus]);

  const handleReject = useCallback(() => {
    updateStatus.mutate(
      { id: quoteId, status: "REJECTED" },
      {
        onSuccess: () => toast.success("Quote rejected"),
        onError: (e) => toast.error(getErrorMessage(e)),
      },
    );
  }, [quoteId, updateStatus]);

  const handleDelete = useCallback(() => {
    deleteQuote.mutate(
      { id: quoteId },
      {
        onSuccess: () => {
          toast.success("Quote deleted");
          router.push("/crm/quotes");
        },
        onError: (e) => toast.error(getErrorMessage(e)),
      },
    );
  }, [quoteId, deleteQuote, router]);

  if (isLoading) {
    return (
      <PageWrapper title="Quote" subtitle="Loading...">
        <div className="space-y-4">
          <div className="h-6 w-48 bg-muted rounded animate-pulse" />
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="lg:col-span-2 space-y-4">
              <div className="h-48 rounded-lg bg-muted animate-pulse" />
              <div className="h-64 rounded-lg bg-muted animate-pulse" />
            </div>
            <div className="space-y-4">
              <div className="h-48 rounded-lg bg-muted animate-pulse" />
              <div className="h-32 rounded-lg bg-muted animate-pulse" />
            </div>
          </div>
        </div>
      </PageWrapper>
    );
  }

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 text-center p-8">
        <div className="h-14 w-14 rounded-full bg-red-50 flex items-center justify-center">
          <AlertCircle className="h-7 w-7 text-red-400" />
        </div>
        <div>
          <p className="font-semibold text-foreground">Failed to load quote</p>
          <p className="text-sm text-muted-foreground mt-1">
            There was an error loading this quote. Please try again.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={handleRetry}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Try Again
          </Button>
          <Button variant="ghost" onClick={handleBack}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Quotes
          </Button>
        </div>
      </div>
    );
  }

  if (!quote) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 text-center p-8">
        <div className="h-14 w-14 rounded-full bg-slate-100 flex items-center justify-center">
          <SearchX className="h-7 w-7 text-slate-400" />
        </div>
        <div>
          <p className="font-semibold text-foreground">Quote not found</p>
          <p className="text-sm text-muted-foreground mt-1">
            This quote may have been removed or you may not have access to it.
          </p>
        </div>
        <Button variant="outline" onClick={handleBack}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Quotes
        </Button>
      </div>
    );
  }

  const lineItems = quote.lineItems ?? [];
  const subtotal = lineItems.reduce(
    (sum, item) => sum + parseFloat(item.amount || "0"),
    0,
  );

  const canSend = quote.status === "DRAFT";
  const canAcceptOrReject = quote.status === "SENT";
  const canDelete = quote.status === "DRAFT";

  return (
    <PageWrapper
      variant="display"
      title={quote.subject}
      subtitle={
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-mono text-sm text-muted-foreground">
            {quote.quoteNumber}
          </span>
          <Badge
            variant="outline"
            className={cn("text-[10px]", STATUS_BADGE_CLASSES[quote.status])}
          >
            {STATUS_LABELS[quote.status]}
          </Badge>
        </div>
      }
      actions={
        <div className="flex items-center gap-2 flex-wrap">
          {canSend && (
            <Button
              size="sm"
              variant="outline"
              onClick={handleSend}
              disabled={updateStatus.isPending}
            >
              <Send className="h-3.5 w-3.5 mr-1.5" />
              Send
            </Button>
          )}
          {canAcceptOrReject && (
            <>
              <Button
                size="sm"
                variant="outline"
                className="text-emerald-600 border-emerald-200 hover:bg-emerald-50"
                onClick={handleAccept}
                disabled={updateStatus.isPending}
              >
                <CheckCircle2 className="h-3.5 w-3.5 mr-1.5" />
                Accept
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="text-red-600 border-red-200 hover:bg-red-50"
                onClick={handleReject}
                disabled={updateStatus.isPending}
              >
                <XCircle className="h-3.5 w-3.5 mr-1.5" />
                Reject
              </Button>
            </>
          )}
          {canDelete && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  size="sm"
                  variant="outline"
                  className="text-destructive border-destructive/30 hover:bg-destructive/10"
                >
                  <Trash2 className="h-3.5 w-3.5 mr-1.5" />
                  Delete
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete quote?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This action cannot be undone. The quote will be permanently
                    removed.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    onClick={handleDelete}
                  >
                    Delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
          <Button variant="ghost" size="sm" onClick={handleBack}>
            <ArrowLeft className="h-4 w-4 mr-1.5" />
            Back
          </Button>
        </div>
      }
    >
      <motion.div
        className="space-y-4"
        variants={staggerContainer}
        initial="hidden"
        animate="visible"
      >
        <motion.div variants={fadeUp}>
          <StatusProgress status={quote.status} />
        </motion.div>

        <motion.div
          variants={fadeUp}
          className="grid grid-cols-1 lg:grid-cols-3 gap-4"
        >
          <div className="lg:col-span-2 space-y-4">
            <Card className="shadow-sm">
              <CardHeader className="px-4 py-3 border-b">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  Line Items
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4">
                <LineItemsTable lineItems={lineItems} currency={quote.currency} />

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
        </motion.div>
      </motion.div>
    </PageWrapper>
  );
}
