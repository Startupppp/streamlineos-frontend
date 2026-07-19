"use client";

import { useState, useCallback, useTransition, useMemo, useEffect } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { useReducedMotion, motion } from "framer-motion";
import Link from "next/link";
import { Download } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SearchInput } from "@/components/ui/search-input";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { EmptyDocumentsIllustration } from "@/components/illustrations";
import { ErrorState } from "@/components/shared";
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
import { staggerContainer, fadeUp } from "@/lib/motion-variants";
import { cn } from "@/lib/utils";
import { FILTER_TOOLBAR_ROW, FILTER_SELECT_TRIGGER } from "@/components/ui/content-fill-panel";
import { useQuotes, useUpdateQuoteStatus, useDeleteQuote } from "@/hooks/api/crm";
import { downloadQuotesCsv } from "@/hooks/api/crm/quotes";
import { useDebouncedValue } from "@/hooks/common/use-debounce";
import { toast } from "sonner";
import { TruncatedText } from "@/components/ui/truncated-text";
import { getErrorMessage } from "@/lib/get-error-message";
import type { QuoteListItem, QuoteStatus } from "@/types/crm/quotes";
import { QuoteRowActions } from "@/features/crm/quotes/components/quote-row-actions";
import {
  STATUS_LABELS,
  STATUS_BADGE_CLASSES,
  isQuoteStatus,
  formatCurrency,
} from "@/features/crm/quotes/lib/quote-utils";

const PAGE_SIZE = 20;

export default function QuotesPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const [, startTransition] = useTransition();
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const shouldReduceMotion = useReducedMotion();

  const updateQuoteStatus = useUpdateQuoteStatus();
  const deleteQuote = useDeleteQuote();

  const [search, setSearch] = useState(searchParams.get("q") ?? "");
  const statusFilter = searchParams.get("status") ?? "all";
  const page = Number(searchParams.get("page")) || 1;

  const debouncedSearch = useDebouncedValue(search, 300);
  const trimmedDebounced = debouncedSearch.trim();
  const apiSearch =
    trimmedDebounced.length >= 3 || trimmedDebounced.length === 0
      ? trimmedDebounced
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

  useEffect(() => {
    const current = searchParams.get("q") ?? "";
    if (debouncedSearch === current) return;
    updateParams({ q: debouncedSearch || null, page: null });
  }, [debouncedSearch, searchParams, updateParams]);

  const { data, isLoading, error, refetch } = useQuotes({
    search: apiSearch || undefined,
    status: isQuoteStatus(statusFilter) ? statusFilter : undefined,
    page,
    pageSize: PAGE_SIZE,
  });

  const total = data?.total ?? 0;
  const hasActiveFilters = !!apiSearch || statusFilter !== "all";

  const handleSearchChange = useCallback((value: string) => {
    setSearch(value);
    },
    [],
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

  const handlePageChange = useCallback(
    (p: number) => {
      updateParams({ page: p <= 1 ? null : String(p) });
    },
    [updateParams],
  );

  const handleClearFilters = useCallback(() => {
    updateParams({ q: null, status: null, page: null });
  }, [updateParams]);

  const tableVariants = shouldReduceMotion
    ? { hidden: { opacity: 0 }, visible: { opacity: 1 } }
    : fadeUp;

  const columns = useMemo<DataTableColumn<QuoteListItem>[]>(
    () => [
      {
        key: "quoteNumber",
        header: "Quote #",
        sortable: true,
        sortValue: (q) => q.quoteNumber,
        cell: (q) => (
          <Link
            href={`/crm/quotes/${q.id}`}
            className="font-mono text-[11px] font-medium hover:text-primary hover:underline transition-colors"
          >
            {q.quoteNumber}
          </Link>
        ),
      },
      {
        key: "subject",
        header: "Subject",
        sortable: true,
        sortValue: (q) => q.subject,
        cell: (q) => (
          <TruncatedText text={q.subject} className="text-[11px] font-medium max-w-[160px] block" />
        ),
      },
      {
        key: "deal",
        header: "Deal",
        cell: (q) =>
          q.deal ? (
            <Link
              href={`/crm/deals/${q.deal.id}`}
              className="text-[11px] text-primary hover:underline max-w-[100px] block"
            >
              <TruncatedText text={q.deal.name} />
            </Link>
          ) : (
            <span className="text-[11px] text-muted-foreground">—</span>
          ),
      },
      {
        key: "status",
        header: "Status",
        cell: (q) => (
          <Badge
            variant="outline"
            className={`text-[9px] px-1.5 py-0 h-4 ${STATUS_BADGE_CLASSES[q.status]}`}
          >
            {STATUS_LABELS[q.status]}
          </Badge>
        ),
      },
      {
        key: "netAmount",
        header: "Amount",
        headerClassName: "text-right",
        className: "text-right font-mono tabular-nums text-muted-foreground whitespace-nowrap",
        cell: (q) => formatCurrency(q.netAmount, q.currency),
      },
      {
        key: "validUntil",
        header: "Valid Until",
        cell: (q) => (
          <span className="text-[11px] text-muted-foreground whitespace-nowrap">
            {q.validUntil ? new Date(q.validUntil).toLocaleDateString() : "—"}
          </span>
        ),
      },
      {
        key: "createdAt",
        header: "Created",
        sortable: true,
        sortValue: (q) => q.createdAt,
        cell: (q) => (
          <span className="text-[11px] text-muted-foreground whitespace-nowrap">
            {q.createdAt ? new Date(q.createdAt).toLocaleDateString() : "—"}
          </span>
        ),
      },
      {
        key: "actions",
        header: "",
        headerClassName: "w-8",
        cell: (q) => (
          <QuoteRowActions
            quote={q}
            onDelete={handleRequestDelete}
            onStatusUpdate={handleStatusUpdate}
          />
        ),
      },
    ],
    [handleRequestDelete, handleStatusUpdate],
  );

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
        subtitle={isLoading ? undefined : `${total} quote${total === 1 ? "" : "s"}`}
        noInternalScroll
        contentClassName="flex flex-col"
        filters={
          <div className={FILTER_TOOLBAR_ROW}>
            <div className="min-w-0 flex-1 lg:max-w-[240px]">
              <SearchInput placeholder="Search quotes..." value={search} onValueChange={handleSearchChange} />
            </div>
            <Select value={statusFilter} onValueChange={handleStatusChange}>
              <SelectTrigger className={cn(FILTER_SELECT_TRIGGER, "w-[140px]")}>
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
              className="ml-auto text-xs"
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
          className="flex flex-col flex-1 min-h-0"
          variants={staggerContainer}
          initial="hidden"
          animate="visible"
        >
          <motion.div variants={tableVariants} className="flex flex-col flex-1 min-h-0">
            <DataTable
              data={data?.quotes ?? []}
              columns={columns}
              getRowKey={(q) => q.id}
              isLoading={isLoading}
              className="flex-1 min-h-0"
              minWidth="700px"
              emptyState={
                <EmptyState
                  illustration={<EmptyDocumentsIllustration />}
                  title="No quotes found"
                  description={
                    hasActiveFilters
                      ? "No quotes match your filters."
                      : "Quotes can be created from a deal's quotes section."
                  }
                  action={
                    hasActiveFilters
                      ? { label: "Clear filters", onClick: handleClearFilters }
                      : undefined
                  }
                  className="border-0 bg-transparent min-h-[40vh]"
                />
              }
              pagination={{
                mode: "server",
                page,
                pageSize: PAGE_SIZE,
                total,
                onPageChange: handlePageChange,
              }}
            />
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
