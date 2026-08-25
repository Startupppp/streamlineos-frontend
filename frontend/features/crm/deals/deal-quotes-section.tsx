"use client";

import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  FileText,
  Plus,
  Trash2,
  Send,
  CheckCircle,
  XCircle,
  Clock,
} from "lucide-react";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/get-error-message";
import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/ui/loading-button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  useDealQuotes,
  useCreateQuote,
  useUpdateQuoteStatus,
  useDeleteQuote,
} from "@/hooks/api/crm/quotes";
import type { QuoteListItem, QuoteStatus } from "@/types/crm/quotes";

const STATUS_CONFIG: Record<
  QuoteStatus,
  { label: string; className: string; icon: typeof FileText }
> = {
  DRAFT: {
    label: "Draft",
    className: "bg-muted text-muted-foreground border-border",
    icon: FileText,
  },
  SENT: {
    label: "Sent",
    className: "bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/20",
    icon: Send,
  },
  ACCEPTED: {
    label: "Accepted",
    className: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20",
    icon: CheckCircle,
  },
  REJECTED: {
    label: "Rejected",
    className: "bg-red-500/10 text-red-700 dark:text-red-300 border-red-500/20",
    icon: XCircle,
  },
  EXPIRED: {
    label: "Expired",
    className: "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/20",
    icon: Clock,
  },
};

function formatAmount(amount: string, currency = "USD") {
  const num = Number(amount);
  if (Number.isNaN(num)) return amount;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
  }).format(num);
}

function QuoteStatusBadge({ status }: { status: QuoteStatus }) {
  const config = STATUS_CONFIG[status];
  const Icon = config.icon;
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${config.className}`}
    >
      <Icon className="h-3 w-3" />
      {config.label}
    </span>
  );
}

interface QuoteRowProps {
  quote: QuoteListItem;
  dealId: number;
  onDeleteRequest: (id: number) => void;
}

function QuoteRow({ quote, dealId, onDeleteRequest }: QuoteRowProps) {
  const updateStatus = useUpdateQuoteStatus();

  const handleStatusChange = useCallback(
    (status: QuoteStatus) => {
      updateStatus.mutate(
        { id: quote.id, status, dealId },
        {
          onSuccess: () =>
            toast.success(`Quote marked as ${STATUS_CONFIG[status].label}`),
          onError: (err) => toast.error(getErrorMessage(err)),
        },
      );
    },
    [quote.id, dealId, updateStatus],
  );

  const handleDeleteRequest = useCallback(() => {
    onDeleteRequest(quote.id);
  }, [quote.id, onDeleteRequest]);

  const handleMarkSent = useCallback(
    () => handleStatusChange("SENT"),
    [handleStatusChange],
  );
  const handleMarkAccepted = useCallback(
    () => handleStatusChange("ACCEPTED"),
    [handleStatusChange],
  );
  const handleMarkRejected = useCallback(
    () => handleStatusChange("REJECTED"),
    [handleStatusChange],
  );
  return (
    <div className="flex items-center gap-3 p-3 bg-card border border-border rounded-lg shadow-sm hover:shadow-md transition-shadow">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-medium text-foreground font-mono truncate">
            {quote.quoteNumber}
          </span>
          <QuoteStatusBadge status={quote.status} />
        </div>
        <p className="text-xs text-muted-foreground mt-0.5 truncate">
          {quote.subject}
          {" · "}
          {formatAmount(quote.totalAmount, quote.currency)}
          {quote.validUntil && (
            <>
              {" · Valid until "}
              {new Date(quote.validUntil).toLocaleDateString()}
            </>
          )}
        </p>
      </div>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="px-2 text-xs shrink-0"
            disabled={updateStatus.isPending}
          >
            Actions
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-44">
          {quote.status === "DRAFT" && (
            <DropdownMenuItem onClick={handleMarkSent}>
              Mark as Sent
            </DropdownMenuItem>
          )}
          {quote.status === "SENT" && (
            <>
              <DropdownMenuItem onClick={handleMarkAccepted}>
                Mark Accepted
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleMarkRejected}>
                Mark Rejected
              </DropdownMenuItem>
            </>
          )}
          <DropdownMenuItem variant="destructive"
            onClick={handleDeleteRequest}
          >
            <Trash2 className="h-3.5 w-3.5 mr-1.5" />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

interface DealQuotesSectionProps {
  dealId: number;
}

export function DealQuotesSection({ dealId }: DealQuotesSectionProps) {
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const { data, isLoading, isError, refetch } = useDealQuotes(dealId);
  const createQuote = useCreateQuote();
  const deleteQuote = useDeleteQuote();

  const quotes = data?.quotes ?? [];

  const handleCreateQuote = useCallback(() => {
    const thirtyDaysFromNow = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
      .toISOString()
      .split("T")[0];
    createQuote.mutate(
      {
        dealId,
        subject: "New Quote",
        validUntil: thirtyDaysFromNow,
        lineItems: [{ description: "Service", quantity: 1, unitPrice: 0 }],
      },
      {
        onSuccess: () => toast.success("Quote created"),
        onError: (err) => toast.error(getErrorMessage(err)),
      },
    );
  }, [dealId, createQuote]);

  const handleRetry = useCallback(() => { void refetch(); }, [refetch]);

  const handleDeleteRequest = useCallback((id: number) => {
    setDeleteId(id);
  }, []);

  const handleDeleteConfirm = useCallback(() => {
    if (deleteId === null) return;
    deleteQuote.mutate(
      { id: deleteId, dealId },
      {
        onSuccess: () => {
          toast.success("Quote deleted");
          setDeleteId(null);
        },
        onError: (err) => toast.error(getErrorMessage(err)),
      },
    );
  }, [deleteId, dealId, deleteQuote]);

  const handleDeleteOpenChange = useCallback((open: boolean) => {
    if (!open) setDeleteId(null);
  }, []);

  return (
    <>
      <Card className="bg-card border border-border rounded-xl shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between pb-3 pt-4 px-4">
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-muted-foreground" />
            <h3 className="text-sm font-semibold">Quotes</h3>
            {quotes.length > 0 && (
              <Badge variant="secondary" className="text-micro h-4 px-1.5">
                {quotes.length}
              </Badge>
            )}
          </div>
          <motion.div whileTap={{ scale: 0.97 }}>
            <LoadingButton
              size="sm"
              onClick={handleCreateQuote}
              isPending={createQuote.isPending}
              loadingText="Creating..."
              className="text-xs"
            >
              <Plus className="h-3 w-3 mr-1" />
              New Quote
            </LoadingButton>
          </motion.div>
        </CardHeader>
        <CardContent className="px-4 pb-4">
          {isLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-14 w-full rounded-xl" />
              <Skeleton className="h-14 w-full rounded-xl" />
            </div>
          ) : isError ? (
            <div className="flex flex-col items-center justify-center py-6 text-center border border-dashed border-border rounded-xl bg-muted/30 gap-2">
              <p className="text-sm text-muted-foreground">Failed to load quotes</p>
              <Button variant="outline" size="sm" onClick={handleRetry}>Retry</Button>
            </div>
          ) : quotes.length === 0 ? (
            <EmptyState
              compact
              title="No quotes yet"
              description="Create a quote to send to the client"
            />
          ) : (
            <div className="space-y-2">
              <AnimatePresence>
                {quotes.map((quote: QuoteListItem, idx: number) => (
                  <motion.div
                    key={quote.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ delay: idx * 0.05 }}
                  >
                    <QuoteRow
                      quote={quote}
                      dealId={dealId}
                      onDeleteRequest={handleDeleteRequest}
                    />
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={deleteId !== null} onOpenChange={handleDeleteOpenChange}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Quote</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the quote. This action cannot be
              undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              variant="destructive"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
