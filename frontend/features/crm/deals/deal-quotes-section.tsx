"use client";

import { useState, useCallback } from "react";
import { motion } from "framer-motion";
import {
  Plus,
  FileText,
  MoreHorizontal,
  Trash2,
  Send,
  CheckCircle2,
  XCircle,
  Download,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
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
import { cn } from "@/lib/utils";
import { staggerContainer, fadeUp } from "@/lib/motion-variants";
import {
  useDealQuotes,
  useUpdateQuote,
  useDeleteQuote,
} from "@/hooks/api/crm/quotes";
import { toast } from "sonner";
import type { Quote } from "@/types/crm/quotes";

interface DealQuotesSectionProps {
  dealId: number;
  onCreateQuote: () => void;
}

const STATUS_BADGE_CLASSES: Record<Quote["status"], string> = {
  DRAFT: "bg-slate-100 text-slate-700",
  SENT: "bg-blue-100 text-blue-700",
  ACCEPTED: "bg-emerald-100 text-emerald-700",
  REJECTED: "bg-red-100 text-red-700",
  EXPIRED: "bg-amber-100 text-amber-700",
};

const STATUS_LABELS: Record<Quote["status"], string> = {
  DRAFT: "Draft",
  SENT: "Sent",
  ACCEPTED: "Accepted",
  REJECTED: "Rejected",
  EXPIRED: "Expired",
};

function formatCurrency(currency: string, amount: string): string {
  return `${currency} ${parseFloat(amount).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

interface QuoteCardProps {
  quote: Quote;
  onMarkSent: (id: number) => void;
  onMarkAccepted: (id: number) => void;
  onMarkRejected: (id: number) => void;
  onDownloadPdf: () => void;
  onDeleteRequest: (id: number) => void;
}

function QuoteCard({
  quote,
  onMarkSent,
  onMarkAccepted,
  onMarkRejected,
  onDownloadPdf,
  onDeleteRequest,
}: QuoteCardProps) {
  return (
    <Card className="rounded-xl border shadow-sm hover:shadow-md transition-all">
      <CardContent className="p-4">
        <div className="flex items-center gap-4">
          <div className="flex-1 min-w-0">
            <p className="font-mono text-xs text-muted-foreground">
              {quote.quoteNumber}
            </p>
            <p className="font-medium text-sm truncate">{quote.subject}</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Valid until {formatDate(quote.validUntil)}
            </p>
          </div>

          <Badge
            variant="outline"
            className={cn("border-0", STATUS_BADGE_CLASSES[quote.status])}
          >
            {STATUS_LABELS[quote.status]}
          </Badge>

          <div className="text-right shrink-0">
            <p className="font-semibold text-sm">
              {formatCurrency(quote.currency, quote.netAmount)}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {formatDate(quote.createdAt)}
            </p>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {quote.status === "DRAFT" && (
                <DropdownMenuItem onClick={() => onMarkSent(quote.id)}>
                  <Send className="h-4 w-4 mr-2" />
                  Mark as Sent
                </DropdownMenuItem>
              )}
              {quote.status === "SENT" && (
                <>
                  <DropdownMenuItem onClick={() => onMarkAccepted(quote.id)}>
                    <CheckCircle2 className="h-4 w-4 mr-2" />
                    Mark as Accepted
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onMarkRejected(quote.id)}>
                    <XCircle className="h-4 w-4 mr-2" />
                    Mark as Rejected
                  </DropdownMenuItem>
                </>
              )}
              <DropdownMenuItem onClick={onDownloadPdf}>
                <Download className="h-4 w-4 mr-2" />
                Download PDF
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-destructive focus:text-destructive"
                onClick={() => onDeleteRequest(quote.id)}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardContent>
    </Card>
  );
}

export function DealQuotesSection({
  dealId,
  onCreateQuote,
}: DealQuotesSectionProps) {
  const [deleteTargetId, setDeleteTargetId] = useState<number | null>(null);

  const { data, isLoading } = useDealQuotes(dealId);
  const updateQuote = useUpdateQuote();
  const deleteQuote = useDeleteQuote();

  const quotes: Quote[] = Array.isArray(data)
    ? data
    : (data as { quotes?: Quote[] })?.quotes ?? [];

  const handleMarkSent = useCallback(
    (quoteId: number) => {
      updateQuote.mutate(
        { id: quoteId, status: "SENT" },
        {
          onSuccess: () => toast.success("Quote marked as sent"),
          onError: () => toast.error("Failed to update quote"),
        },
      );
    },
    [updateQuote],
  );

  const handleMarkAccepted = useCallback(
    (quoteId: number) => {
      updateQuote.mutate(
        { id: quoteId, status: "ACCEPTED" },
        {
          onSuccess: () => toast.success("Quote accepted"),
          onError: () => toast.error("Failed to update quote"),
        },
      );
    },
    [updateQuote],
  );

  const handleMarkRejected = useCallback(
    (quoteId: number) => {
      updateQuote.mutate(
        { id: quoteId, status: "REJECTED" },
        {
          onSuccess: () => toast.success("Quote marked as rejected"),
          onError: () => toast.error("Failed to update quote"),
        },
      );
    },
    [updateQuote],
  );

  const handleDownloadPdf = useCallback(() => {
    toast.info("PDF generation coming soon");
  }, []);

  const handleDeleteRequest = useCallback((quoteId: number) => {
    setDeleteTargetId(quoteId);
  }, []);

  const handleDeleteConfirm = useCallback(() => {
    if (deleteTargetId === null) return;
    deleteQuote.mutate(deleteTargetId, {
      onSuccess: () => {
        toast.success("Quote deleted");
        setDeleteTargetId(null);
      },
      onError: () => {
        toast.error("Failed to delete quote");
        setDeleteTargetId(null);
      },
    });
  }, [deleteTargetId, deleteQuote]);

  const handleDeleteCancel = useCallback(() => {
    setDeleteTargetId(null);
  }, []);

  const handleDeleteDialogOpenChange = useCallback(
    (open: boolean) => {
      if (!open) handleDeleteCancel();
    },
    [handleDeleteCancel],
  );

  return (
    <div className="bg-white/90 backdrop-blur-sm rounded-2xl border border-slate-200/80 shadow-xl shadow-slate-200/60 p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-base font-semibold">Quotes</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Proposals sent for this deal
          </p>
        </div>
        <Button
          onClick={onCreateQuote}
          size="sm"
          className="bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white shadow-md hover:shadow-lg transition-all duration-200"
        >
          <Plus className="h-3.5 w-3.5 mr-1.5" />
          Create Quote
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-20 w-full rounded-xl" />
          ))}
        </div>
      ) : quotes.length === 0 ? (
        <EmptyState
          illustration={<FileText className="h-10 w-10 text-muted-foreground" />}
          title="No quotes yet"
          description="Create a quote to send a formal proposal for this deal."
          action={{ label: "Create Quote", onClick: onCreateQuote }}
        />
      ) : (
        <motion.div
          variants={staggerContainer}
          initial="hidden"
          animate="visible"
          className="space-y-3"
        >
          {quotes.map((quote, i) => (
            <motion.div key={quote.id} variants={fadeUp} custom={i}>
              <QuoteCard
                quote={quote}
                onMarkSent={handleMarkSent}
                onMarkAccepted={handleMarkAccepted}
                onMarkRejected={handleMarkRejected}
                onDownloadPdf={handleDownloadPdf}
                onDeleteRequest={handleDeleteRequest}
              />
            </motion.div>
          ))}
        </motion.div>
      )}

      <AlertDialog
        open={deleteTargetId !== null}
        onOpenChange={handleDeleteDialogOpenChange}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Quote</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the quote. This action cannot be
              undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleDeleteCancel}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
