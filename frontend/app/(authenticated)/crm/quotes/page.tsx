"use client";

import { useState, useCallback, useTransition, useMemo, useEffect } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { Download } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { SearchInput } from "@/components/ui/search-input";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { DataTableSkeleton } from "@/components/ui/data-table-skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { EmptyDocumentsIllustration } from "@/components/illustrations";
import { ErrorState } from "@/components/shared/error-state";
import { CursorPageControls } from "@/components/ui/cursor-page-controls";
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
import {
  CONTENT_FILL_PANEL,
  FILTER_TOOLBAR_ROW,
  FILTER_SELECT_TRIGGER,
} from "@/components/ui/content-fill-panel";
import { RecordList, type RecordValue } from "@/features/renderer";
import { DensityToggle, useDensity } from "@/features/renderer/density-toggle";
import { useTenantLayout } from "@/features/renderer/use-tenant-layout";
import { QUOTE_LAYOUT, quoteListRecordFields } from "@/lib/renderer/crm/quote-layout";
import { useQuotes, useUpdateQuoteStatus, useDeleteQuote } from "@/hooks/api/crm";
import { downloadQuotesCsv } from "@/hooks/api/crm/quotes";
import { useOrgDisplay } from "@/hooks/api/org-display";
import { useDebouncedValue } from "@/hooks/common/use-debounce";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/get-error-message";
import type { QuoteStatus } from "@/types/crm/quotes";
import { QuoteRowActions } from "@/features/crm/quotes/components/quote-row-actions";
import { STATUS_LABELS, isQuoteStatus } from "@/features/crm/quotes/lib/quote-utils";

const PAGE_SIZE = 20;

export default function QuotesPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const [, startTransition] = useTransition();
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [density, setDensity] = useDensity();
  const [cursorHistory, setCursorHistory] = useState<(string | undefined)[]>([undefined]);

  const layout = useTenantLayout(QUOTE_LAYOUT);
  const money = useOrgDisplay();
  const updateQuoteStatus = useUpdateQuoteStatus();
  const deleteQuote = useDeleteQuote();

  const [search, setSearch] = useState(searchParams.get("q") ?? "");
  const statusFilter = searchParams.get("status") ?? "all";

  const debouncedSearch = useDebouncedValue(search, 300);
  const trimmedDebounced = debouncedSearch.trim();
  const apiSearch =
    trimmedDebounced.length >= 3 || trimmedDebounced.length === 0 ? trimmedDebounced : "";

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
    updateParams({ q: debouncedSearch || null });
  }, [debouncedSearch, searchParams, updateParams]);

  const currentCursor = cursorHistory[cursorHistory.length - 1];

  const { data, isLoading, error, refetch, access } = useQuotes({
    search: apiSearch || undefined,
    status: isQuoteStatus(statusFilter) ? statusFilter : undefined,
    cursor: currentCursor,
    pageSize: PAGE_SIZE,
  });

  const quotes = useMemo(() => (data?.quotes ?? []).map(quoteListRecordFields), [data?.quotes]);
  const byId = useMemo(
    () => new Map((data?.quotes ?? []).map((quote) => [quote.id, quote])),
    [data?.quotes],
  );
  const hasActiveFilters = !!apiSearch || statusFilter !== "all";

  function resetCursors(): void {
    setCursorHistory([undefined]);
  }

  const handleSearchChange = useCallback((value: string) => setSearch(value), []);

  const handleStatusChange = useCallback(
    (value: string) => {
      updateParams({ status: value === "all" ? null : value });
      resetCursors();
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

  const handleRequestDelete = useCallback((id: number) => setDeleteId(id), []);

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
          onSuccess: () => toast.success(`Quote marked as ${STATUS_LABELS[status].toLowerCase()}`),
          onError: (e) => toast.error(getErrorMessage(e)),
        },
      );
    },
    [updateQuoteStatus],
  );

  const handlePrevious = useCallback(() => {
    setCursorHistory((prev) => (prev.length > 1 ? prev.slice(0, -1) : prev));
  }, []);

  const handleNext = useCallback(() => {
    const next = data?.nextCursor;
    if (next) setCursorHistory((prev) => [...prev, next]);
  }, [data?.nextCursor]);

  const handleClearFilters = useCallback(() => {
    updateParams({ q: null, status: null });
    resetCursors();
  }, [updateParams]);

  const rowActions = useCallback(
    (row: RecordValue) => {
      const quote = byId.get(Number(row.id));
      if (!quote) return null;
      return (
        <QuoteRowActions
          quote={quote}
          onDelete={handleRequestDelete}
          onStatusUpdate={handleStatusUpdate}
        />
      );
    },
    [byId, handleRequestDelete, handleStatusUpdate],
  );

  return (
    <>
      <PageWrapper
        title="Quotes"
        subtitle="Proposals and pricing sent to clients."
        noInternalScroll
        contentClassName="flex flex-col"
        filters={
          <div className={FILTER_TOOLBAR_ROW}>
            <SearchInput
              placeholder={layout.list.searchPlaceholder}
              value={search}
              onValueChange={handleSearchChange}
            />
            <Select value={statusFilter} onValueChange={handleStatusChange}>
              <SelectTrigger className={cn(FILTER_SELECT_TRIGGER, "w-36")} aria-label="Status">
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
            <DensityToggle density={density} onChange={setDensity} />
            <Button
              variant="outline"
              size="sm"
              className="ml-auto text-xs"
              onClick={handleExport}
              disabled={isExporting || quotes.length === 0}
            >
              <Download className="mr-1.5 h-3.5 w-3.5" />
              {isExporting ? "Exporting..." : "Export"}
            </Button>
          </div>
        }
      >
        <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-4">
          {isLoading ? (
            <DataTableSkeleton rows={12} columns={layout.list.columns.length} className="flex-1" />
          ) : error ? (
            <ErrorState
              title="Couldn't load quotes"
              description={getErrorMessage(error)}
              onRetry={handleRetry}
              className={CONTENT_FILL_PANEL}
            />
          ) : quotes.length === 0 ? (
            <EmptyState
              access={access}
              illustration={<EmptyDocumentsIllustration />}
              title={hasActiveFilters ? "No quotes match this search" : "No quotes yet"}
              description={
                hasActiveFilters
                  ? "Nothing here matches the search or status you picked."
                  : "A quote is raised from a deal, where its line items and pricing live."
              }
              action={
                hasActiveFilters
                  ? { label: "Clear filters", onClick: handleClearFilters }
                  : undefined
              }
              actionVariant={hasActiveFilters ? "outline" : undefined}
              className={CONTENT_FILL_PANEL}
            />
          ) : (
            <>
              <RecordList
                layout={layout}
                rows={quotes}
                getRowKey={(row) => String(row.id)}
                onRowClick={(row) => router.push(`/crm/quotes/${String(row.id)}`)}
                actions={rowActions}
                density={density}
                money={money}
                minWidth="950px"
                className={CONTENT_FILL_PANEL}
                pagination={{ pageSize: PAGE_SIZE }}
              />
              {(cursorHistory.length > 1 || data?.hasMore) ? (
                <CursorPageControls
                  page={cursorHistory.length}
                  hasNext={data?.hasMore ?? false}
                  disabled={isLoading}
                  onPrevious={handlePrevious}
                  onNext={handleNext}
                />
              ) : null}
            </>
          )}
        </div>
      </PageWrapper>

      <AlertDialog open={deleteId !== null} onOpenChange={handleDeleteDialogOpenChange}>
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
