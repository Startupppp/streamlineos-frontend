"use client";

import { useState, useCallback, useTransition } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { motion } from "framer-motion";
import Link from "next/link";
import {
  Search,
  MoreHorizontal,
  ChevronLeft,
  ChevronRight,
  Eye,
  Send,
  CheckCircle2,
  XCircle,
  Trash2,
  FileText,
  Download,
} from "lucide-react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { PageWrapper } from "@/components/ui/page-wrapper";
import {
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState, SkeletonTable } from "@/components/shared";
import { staggerContainer, fadeUp } from "@/lib/motion-variants";
import { useQuotes, useUpdateQuoteStatus, useDeleteQuote } from "@/hooks/api/crm";
import { downloadQuotesCsv } from "@/hooks/api/crm/quotes";
import { useDebouncedValue } from "@/hooks/common/use-debounce";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/get-error-message";
import type { QuoteListItem, QuoteStatus } from "@/types/crm/quotes";

const PAGE_SIZE = 20;

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

function isQuoteStatus(value: string): value is QuoteStatus {
  return value in STATUS_LABELS;
}

function formatCurrency(amount: string, currency: string) {
  const num = parseFloat(amount);
  if (isNaN(num)) return "—";
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: currency || "INR",
    maximumFractionDigits: 2,
  }).format(num);
}

interface QuoteRowActionsProps {
  quote: QuoteListItem;
  onDelete: (id: number) => void;
  onStatusUpdate: (id: number, status: QuoteStatus) => void;
}

function QuoteRowActions({ quote, onDelete, onStatusUpdate }: QuoteRowActionsProps) {
  const router = useRouter();

  const handleView = useCallback(() => {
    router.push(`/crm/quotes/${quote.id}`);
  }, [quote.id, router]);

  const handleSend = useCallback(() => {
    onStatusUpdate(quote.id, "SENT");
  }, [quote.id, onStatusUpdate]);

  const handleAccept = useCallback(() => {
    onStatusUpdate(quote.id, "ACCEPTED");
  }, [quote.id, onStatusUpdate]);

  const handleReject = useCallback(() => {
    onStatusUpdate(quote.id, "REJECTED");
  }, [quote.id, onStatusUpdate]);

  const handleDelete = useCallback(() => {
    onDelete(quote.id);
  }, [quote.id, onDelete]);

  const canSend = quote.status === "DRAFT";
  const canAcceptOrReject = quote.status === "SENT";
  const canDelete = quote.status === "DRAFT";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="h-7 w-7" aria-label="More options">
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={handleView}>
          <Eye className="h-3.5 w-3.5 mr-2" />
          View Details
        </DropdownMenuItem>
        {canSend && (
          <DropdownMenuItem onClick={handleSend}>
            <Send className="h-3.5 w-3.5 mr-2 text-blue-600" />
            Send Quote
          </DropdownMenuItem>
        )}
        {canAcceptOrReject && (
          <>
            <DropdownMenuItem onClick={handleAccept}>
              <CheckCircle2 className="h-3.5 w-3.5 mr-2 text-emerald-600" />
              Accept
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleReject}>
              <XCircle className="h-3.5 w-3.5 mr-2 text-red-600" />
              Reject
            </DropdownMenuItem>
          </>
        )}
        {canDelete && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-red-600" onClick={handleDelete}>
              <Trash2 className="h-3.5 w-3.5 mr-2" />
              Delete
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export default function QuotesPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const [, startTransition] = useTransition();
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [isExporting, setIsExporting] = useState(false);

  const updateQuoteStatus = useUpdateQuoteStatus();
  const deleteQuote = useDeleteQuote();

  const searchInput = searchParams.get("q") ?? "";
  const statusFilter = searchParams.get("status") ?? "all";
  const page = Number(searchParams.get("page")) || 1;

  const debouncedSearch = useDebouncedValue(searchInput, 300);
  const apiSearch =
    debouncedSearch.length >= 3 || debouncedSearch.length === 0
      ? debouncedSearch
      : "";

  const updateParams = useCallback(
    (updates: Record<string, string | null>) => {
      const params = new URLSearchParams(searchParams.toString());
      for (const [key, value] of Object.entries(updates)) {
        if (value === null || value === "") params.delete(key);
        else params.set(key, value);
      }
      startTransition(() => {
        router.replace(`${pathname}?${params.toString()}`, { scroll: false });
      });
    },
    [searchParams, router, pathname],
  );

  const { data, isLoading, error, refetch } = useQuotes({
    search: apiSearch || undefined,
    status: isQuoteStatus(statusFilter) ? statusFilter : undefined,
    page,
    pageSize: PAGE_SIZE,
  });

  const total = data?.total ?? 0;
  const totalPages = Math.ceil(total / PAGE_SIZE);
  const firstItem = total > 0 ? (page - 1) * PAGE_SIZE + 1 : 0;
  const lastItem = Math.min(page * PAGE_SIZE, total);

  const handleSearchChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      updateParams({ q: e.target.value || null, page: null });
    },
    [updateParams],
  );

  const handleStatusChange = useCallback(
    (value: string) => {
      updateParams({ status: value === "all" ? null : value, page: null });
    },
    [updateParams],
  );

  const handleRetry = useCallback(() => {
    void refetch();
  }, [refetch]);

  const handleExport = useCallback(async () => {
    setIsExporting(true);
    try {
      const blob = await downloadQuotesCsv(
        isQuoteStatus(statusFilter) ? statusFilter : undefined,
      );
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `quotes-${new Date().toISOString().split("T")[0]}.csv`;
      anchor.click();
      URL.revokeObjectURL(url);
      toast.success("Quotes exported");
    } catch (e) {
      toast.error(getErrorMessage(e));
    } finally {
      setIsExporting(false);
    }
  }, [statusFilter]);

  const handleRequestDelete = useCallback((id: number) => {
    setDeleteId(id);
  }, []);

  const handleConfirmDelete = useCallback(() => {
    if (deleteId === null) return;
    deleteQuote.mutate(
      { id: deleteId },
      {
        onSuccess: () => {
          toast.success("Quote deleted");
          setDeleteId(null);
        },
        onError: (e) => {
          toast.error(getErrorMessage(e));
          setDeleteId(null);
        },
      },
    );
  }, [deleteId, deleteQuote]);

  const handleDeleteDialogOpenChange = useCallback((open: boolean) => {
    if (!open) setDeleteId(null);
  }, []);

  const handleStatusUpdate = useCallback(
    (id: number, status: QuoteStatus) => {
      updateQuoteStatus.mutate(
        { id, status },
        {
          onSuccess: () =>
            toast.success(`Quote marked as ${STATUS_LABELS[status].toLowerCase()}`),
          onError: (e) => toast.error(getErrorMessage(e)),
        },
      );
    },
    [updateQuoteStatus],
  );

  const handlePrevPage = useCallback(
    () => updateParams({ page: page <= 2 ? null : String(page - 1) }),
    [page, updateParams],
  );
  const handleNextPage = useCallback(
    () => updateParams({ page: String(page + 1) }),
    [page, updateParams],
  );

  if (isLoading) {
    return (
      <PageWrapper title="Quotes" subtitle="Quote management">
        <SkeletonTable rows={8} columns={8} className="h-[calc(100dvh-16rem)]" />
      </PageWrapper>
    );
  }

  if (error) {
    return (
      <PageWrapper title="Quotes" subtitle="Quote management">
        <ErrorState
          title="Failed to load quotes"
          description={getErrorMessage(error)}
          onRetry={handleRetry}
          className="flex-1"
        />
      </PageWrapper>
    );
  }

  return (
    <>
      <PageWrapper
        title="Quotes"
        subtitle={`${total} quote${total === 1 ? "" : "s"}`}
        filters={
          <div className="flex items-center gap-3 flex-wrap">
            <div className="relative max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search quotes (min 3 chars)..."
                value={searchInput}
                onChange={handleSearchChange}
                className="pl-8 h-8 text-xs"
              />
            </div>
            <Select value={statusFilter} onValueChange={handleStatusChange}>
              <SelectTrigger className="h-8 w-[140px] text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                <SelectItem value="DRAFT">Draft</SelectItem>
                <SelectItem value="SENT">Sent</SelectItem>
                <SelectItem value="ACCEPTED">Accepted</SelectItem>
                <SelectItem value="REJECTED">Rejected</SelectItem>
                <SelectItem value="EXPIRED">Expired</SelectItem>
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              size="sm"
              className="h-8 text-xs"
              onClick={handleExport}
              disabled={isExporting || total === 0}
            >
              <Download className="h-3.5 w-3.5 mr-1.5" />
              {isExporting ? "Exporting..." : "Export"}
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
            <div className="border border-border rounded-md flex flex-col h-[calc(100dvh-16rem)] min-h-[320px]">
              <div className="flex-1 min-h-0 overflow-auto">
                <div className="min-w-max">
                  <table className="w-full caption-bottom text-[11px]">
                    <TableHeader className="sticky top-0 z-10 bg-muted/80 backdrop-blur-sm">
                      <TableRow className="border-b-2 border-border">
                        <TableHead className="text-[10px] uppercase tracking-wider font-bold px-2 py-1.5">
                          Quote #
                        </TableHead>
                        <TableHead className="text-[10px] uppercase tracking-wider font-bold px-2 py-1.5">
                          Subject
                        </TableHead>
                        <TableHead className="text-[10px] uppercase tracking-wider font-bold px-2 py-1.5">
                          Deal
                        </TableHead>
                        <TableHead className="text-[10px] uppercase tracking-wider font-bold px-2 py-1.5">
                          Status
                        </TableHead>
                        <TableHead className="text-[10px] uppercase tracking-wider font-bold px-2 py-1.5">
                          Amount
                        </TableHead>
                        <TableHead className="text-[10px] uppercase tracking-wider font-bold px-2 py-1.5">
                          Valid Until
                        </TableHead>
                        <TableHead className="text-[10px] uppercase tracking-wider font-bold px-2 py-1.5">
                          Created
                        </TableHead>
                        <TableHead className="text-[10px] w-8 px-2" />
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(data?.quotes ?? []).length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={8} className="p-0">
                            <EmptyState
                              illustration={
                                <FileText className="text-muted-foreground/40" />
                              }
                              title="No quotes found"
                              description={
                                apiSearch || statusFilter !== "all"
                                  ? "No quotes match your filters."
                                  : "Quotes can be created from a deal's quotes section."
                              }
                              className="border-0 bg-transparent min-h-[40vh]"
                            />
                          </TableCell>
                        </TableRow>
                      ) : (
                        data?.quotes.map((quote) => (
                          <TableRow
                            key={quote.id}
                            className="h-8 hover:bg-muted/30 transition-colors"
                          >
                            <TableCell className="px-2 py-1">
                              <Link
                                href={`/crm/quotes/${quote.id}`}
                                className="font-mono text-[11px] font-medium hover:text-blue-600 hover:underline transition-colors"
                              >
                                {quote.quoteNumber}
                              </Link>
                            </TableCell>
                            <TableCell className="px-2 py-1 max-w-[160px]">
                              <span className="text-[11px] font-medium truncate block">
                                {quote.subject}
                              </span>
                            </TableCell>
                            <TableCell className="px-2 py-1">
                              {quote.deal ? (
                                <Link
                                  href={`/crm/deals/${quote.deal.id}`}
                                  className="text-[11px] text-blue-600 hover:underline truncate max-w-[100px] block"
                                >
                                  {quote.deal.name}
                                </Link>
                              ) : (
                                <span className="text-[11px] text-muted-foreground">—</span>
                              )}
                            </TableCell>
                            <TableCell className="px-2 py-1">
                              <Badge
                                variant="outline"
                                className={`text-[9px] px-1.5 py-0 h-4 ${STATUS_BADGE_CLASSES[quote.status]}`}
                              >
                                {STATUS_LABELS[quote.status]}
                              </Badge>
                            </TableCell>
                            <TableCell className="px-2 py-1 text-[11px] text-muted-foreground font-mono whitespace-nowrap">
                              {formatCurrency(quote.netAmount, quote.currency)}
                            </TableCell>
                            <TableCell className="px-2 py-1 text-[11px] text-muted-foreground whitespace-nowrap">
                              {quote.validUntil
                                ? new Date(quote.validUntil).toLocaleDateString()
                                : "—"}
                            </TableCell>
                            <TableCell className="px-2 py-1 text-[11px] text-muted-foreground whitespace-nowrap">
                              {quote.createdAt
                                ? new Date(quote.createdAt).toLocaleDateString()
                                : "—"}
                            </TableCell>
                            <TableCell className="px-2 py-1">
                              <QuoteRowActions
                                quote={quote}
                                onDelete={handleRequestDelete}
                                onStatusUpdate={handleStatusUpdate}
                              />
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </table>
                </div>
              </div>
              <div className="shrink-0 flex items-center justify-between px-4 py-2 border-t">
                {total > 0 ? (
                  <span className="text-xs text-muted-foreground">
                    Showing {firstItem}–{lastItem} of {total} quotes
                  </span>
                ) : (
                  <span />
                )}
                {totalPages > 1 && (
                  <div className="flex gap-1">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={page <= 1}
                      onClick={handlePrevPage}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={page >= totalPages}
                      onClick={handleNextPage}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        </motion.div>
      </PageWrapper>

      <AlertDialog
        open={deleteId !== null}
        onOpenChange={handleDeleteDialogOpenChange}
      >
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
              onClick={handleConfirmDelete}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
