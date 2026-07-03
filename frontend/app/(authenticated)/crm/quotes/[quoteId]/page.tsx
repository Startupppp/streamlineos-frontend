"use client";

import { use, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useReducedMotion, motion } from "framer-motion";
import { Send, CheckCircle2, XCircle, Trash2, FileText, Calendar, User, Building2 } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
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
import { ErrorState } from "@/components/shared";
import { staggerContainer, fadeUp } from "@/lib/motion-variants";
import { cn } from "@/lib/utils";
import { useQuoteDetail, useUpdateQuoteStatus, useDeleteQuote } from "@/hooks/api/crm";
import { getErrorMessage } from "@/lib/get-error-message";
import type { QuoteStatus } from "@/types/crm/quotes";
import { QuoteStatusProgress } from "@/features/crm/quotes/components/quote-status-progress";
import { QuoteLineItemsTable } from "@/features/crm/quotes/components/quote-line-items-table";
import {
  STATUS_LABELS,
  STATUS_BADGE_CLASSES,
  formatCurrency,
  formatDate,
} from "@/features/crm/quotes/lib/quote-utils";

export default function QuoteDetailPage({
  params,
}: {
  params: Promise<{ quoteId: string }>;
}) {
  const { quoteId: quoteIdStr } = use(params);
  const quoteId = Number(quoteIdStr);
  const router = useRouter();
  const shouldReduceMotion = useReducedMotion();

  const { data, isLoading, isError, refetch } = useQuoteDetail(quoteId);
  const updateStatus = useUpdateQuoteStatus();
  const deleteQuote = useDeleteQuote();

  const quote = data ?? null;

  const sectionVariants = shouldReduceMotion
    ? { hidden: { opacity: 0 }, visible: { opacity: 1 } }
    : fadeUp;

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
      <PageWrapper title="Quote" backHref="/crm/quotes">
        <div className="space-y-4">
          <Skeleton className="h-6 w-48" />
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="lg:col-span-2 space-y-4">
              <Skeleton className="h-48 w-full rounded-lg" />
              <Skeleton className="h-32 w-full rounded-lg" />
            </div>
            <div className="space-y-4">
              <Skeleton className="h-48 w-full rounded-lg" />
              <Skeleton className="h-28 w-full rounded-lg" />
            </div>
          </div>
        </div>
      </PageWrapper>
    );
  }

  if (isError) {
    return (
      <PageWrapper title="Quote" backHref="/crm/quotes">
        <ErrorState
          title="Failed to load quote"
          description="There was an error loading this quote. Please try again."
          onRetry={handleRetry}
          className="flex-1"
        />
      </PageWrapper>
    );
  }

  if (!quote) {
    return (
      <PageWrapper title="Quote" backHref="/crm/quotes">
        <ErrorState
          title="Quote not found"
          description="This quote may have been removed or you may not have access to it."
          className="flex-1"
        />
      </PageWrapper>
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
      backHref="/crm/quotes"
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
                    This action cannot be undone. The quote will be permanently removed.
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
        </div>
      }
    >
      <motion.div
        className="space-y-4"
        variants={staggerContainer}
        initial="hidden"
        animate="visible"
      >
        <motion.div variants={sectionVariants}>
          <QuoteStatusProgress status={quote.status} />
        </motion.div>

        <motion.div
          variants={sectionVariants}
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
        </motion.div>
      </motion.div>
    </PageWrapper>
  );
}
