"use client";

import { useState, useCallback, useTransition, useEffect } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { Download, SlidersHorizontal } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/ui/loading-button";
import { ErrorState } from "@/components/shared/error-state";
import { DatePicker } from "@/components/ui/date-picker";
import { FILTER_SELECT_TRIGGER } from "@/components/ui/content-fill-panel";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ResponsivePopover,
  ResponsivePopoverContent,
  ResponsivePopoverTrigger,
} from "@/components/ui/responsive-popover";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { SearchInput } from "@/components/ui/search-input";
import { EmptyState } from "@/components/ui/empty-state";
import { DataTable, DataTableSkeleton } from "@/components/ui/data-table";
import {
  useAuditLogs,
  useAuditLogActions,
  useAuditLogTargetTypes,
  useExportAuditLog,
  type AuditLogRow,
} from "@/hooks/api/audit-log";
import { useCan } from "@/hooks/api/access";
import { useDebouncedValue } from "@/hooks/common/use-debounce";
import { downloadBlob } from "@/lib/download-blob";
import { getErrorMessage } from "@/lib/get-error-message";
import { PAGE_SIZE_OPTIONS, type PageSize, isValidPageSize } from "./audit-log-constants";
import { LogDetailSheet } from "./log-detail-sheet";
import { AUDIT_LOG_COLUMNS } from "./audit-log-columns";

export function AuditLogPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const [, startTransition] = useTransition();
  const [selectedLog, setSelectedLog] = useState<AuditLogRow | null>(null);
  const [userSearch, setUserSearch] = useState(searchParams.get("user") ?? "");
  const [cursorStack, setCursorStack] = useState<string[]>([]);

  const pageSizeParam = Number(searchParams.get("size"));
  const pageSize: PageSize = isValidPageSize(pageSizeParam) ? pageSizeParam : 15;
  const actionFilter = searchParams.get("action") || "all";
  const targetTypeFilter = searchParams.get("target") || "all";
  const dateFrom = searchParams.get("from") || "";
  const dateTo = searchParams.get("to") || "";

  const debouncedUserSearch = useDebouncedValue(userSearch, 400);

  const currentCursor = cursorStack[cursorStack.length - 1];

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

  const resetCursor = useCallback(() => setCursorStack([]), []);

  useEffect(() => {
    const current = searchParams.get("user") ?? "";
    if (debouncedUserSearch === current) return;
    updateParams({ user: debouncedUserSearch || null });
    resetCursor();
  }, [debouncedUserSearch, searchParams, updateParams, resetCursor]);

  const { data, isLoading, isError, error, refetch } = useAuditLogs({
    cursor: currentCursor,
    limit: pageSize,
    action: actionFilter !== "all" ? actionFilter : undefined,
    targetType: targetTypeFilter !== "all" ? targetTypeFilter : undefined,
    dateFrom: dateFrom || undefined,
    dateTo: dateTo || undefined,
    userSearch: debouncedUserSearch || undefined,
  });

  const { data: actions } = useAuditLogActions();
  const { data: targetTypes } = useAuditLogTargetTypes();
  const canExport = useCan("audit-log:read");
  const { mutate: runExport, isPending: isExporting } = useExportAuditLog();

  const logs = data?.logs ?? [];
  const hasMore = data?.pagination.hasMore ?? false;
  const nextCursor = data?.pagination.nextCursor ?? null;

  const resetFilters = useCallback(() => {
    updateParams({ action: null, target: null, from: null, to: null, user: null });
    setUserSearch("");
    resetCursor();
  }, [updateParams, resetCursor]);

  const handleActionFilter = useCallback(
    (v: string) => { updateParams({ action: v === "all" ? null : v }); resetCursor(); },
    [updateParams, resetCursor],
  );
  const handleTargetTypeFilter = useCallback(
    (v: string) => { updateParams({ target: v === "all" ? null : v }); resetCursor(); },
    [updateParams, resetCursor],
  );
  const handleDateFrom = useCallback(
    (v: string) => { updateParams({ from: v || null }); resetCursor(); },
    [updateParams, resetCursor],
  );
  const handleDateTo = useCallback(
    (v: string) => { updateParams({ to: v || null }); resetCursor(); },
    [updateParams, resetCursor],
  );
  const handleCloseSheet = useCallback(() => setSelectedLog(null), []);
  const handleRetry = useCallback(() => { void refetch(); }, [refetch]);
  const handleRowClick = useCallback((log: AuditLogRow) => setSelectedLog(log), []);

  const handlePageSizeChange = useCallback(
    (size: number) => {
      updateParams({ size: size === 15 ? null : String(size) });
      resetCursor();
    },
    [updateParams, resetCursor],
  );
  const handleUserSearchChange = useCallback((value: string) => setUserSearch(value), []);

  const handleNextPage = useCallback(() => {
    if (nextCursor) setCursorStack((prev) => [...prev, nextCursor]);
  }, [nextCursor]);

  const handlePrevPage = useCallback(() => {
    setCursorStack((prev) => prev.slice(0, -1));
  }, []);

  const handleExport = useCallback(() => {
    runExport(
      {
        action: actionFilter !== "all" ? actionFilter : undefined,
        targetType: targetTypeFilter !== "all" ? targetTypeFilter : undefined,
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined,
        userSearch: debouncedUserSearch || undefined,
      },
      {
        onSuccess: (blob) => downloadBlob(blob, "audit-log-export.csv"),
        onError: (err) => toast.error(getErrorMessage(err)),
      },
    );
  }, [runExport, actionFilter, targetTypeFilter, dateFrom, dateTo, debouncedUserSearch]);

  const hasActiveFilters =
    actionFilter !== "all" ||
    targetTypeFilter !== "all" ||
    !!dateFrom ||
    !!dateTo ||
    !!userSearch;

  const currentPage = cursorStack.length + 1;

  function renderFilterSelects() {
    return (
      <div className="flex w-full flex-col gap-2 md:contents">
        <Select value={actionFilter} onValueChange={handleActionFilter}>
          <SelectTrigger className={`w-full md:w-[160px] ${FILTER_SELECT_TRIGGER}`}>
            <SelectValue placeholder="All actions" />
          </SelectTrigger>
          <SelectContent className="min-w-[var(--radix-select-trigger-width)]">
            <SelectItem value="all">All Actions</SelectItem>
            {actions?.map((a) => (
              <SelectItem key={a} value={a}>{a}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={targetTypeFilter} onValueChange={handleTargetTypeFilter}>
          <SelectTrigger className={`w-full md:w-32 ${FILTER_SELECT_TRIGGER}`}>
            <SelectValue placeholder="All types" />
          </SelectTrigger>
          <SelectContent className="min-w-[var(--radix-select-trigger-width)]">
            <SelectItem value="all">All Types</SelectItem>
            {targetTypes?.map((t) => (
              <SelectItem key={t} value={t} className="capitalize">{t}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <DatePicker value={dateFrom} onChange={handleDateFrom} placeholder="From date" className="w-full md:w-[140px]" />
        <DatePicker value={dateTo} onChange={handleDateTo} placeholder="To date" className="w-full md:w-[140px]" />
        {hasActiveFilters && (
          <Button variant="ghost" size="sm" onClick={resetFilters} className="text-sm">Clear</Button>
        )}
      </div>
    );
  }

  const emptyState = (
    <EmptyState
      illustrationPreset="activity"
      title="No audit events found"
      description={hasActiveFilters ? "No results match your filters." : "System actions and changes will appear here."}
      filtersActive={hasActiveFilters}
      onClearFilters={resetFilters}
    />
  );

  const pageSizeOption = PAGE_SIZE_OPTIONS.find((o) => o === pageSize) ?? 15;

  return (
    <PageWrapper
      title="Audit Log"
      subtitle="Track system actions, logins, and changes across your organization."
      noInternalScroll
      actions={
        canExport ? (
          <LoadingButton
            variant="outline"
            size="sm"
            isPending={isExporting}
            onClick={handleExport}
          >
            <Download className="h-4 w-4" />
            Export CSV
          </LoadingButton>
        ) : undefined
      }
      filters={
        <>
          <ResponsivePopover>
            <ResponsivePopoverTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="h-9 shrink-0 gap-1.5 text-xs md:hidden"
                aria-label="Filters"
              >
                <SlidersHorizontal className="h-4 w-4" />
                <span className="truncate">Filters</span>
              </Button>
            </ResponsivePopoverTrigger>
            <ResponsivePopoverContent
              className="w-[min(22rem,calc(100vw-2rem))] max-w-[calc(100vw-2rem)] p-3"
              align="start"
              title="Filters"
            >
              {renderFilterSelects()}
            </ResponsivePopoverContent>
          </ResponsivePopover>
          <SearchInput
            placeholder="Search by name or email…"
            value={userSearch}
            onValueChange={handleUserSearchChange}
          />
          <div className="hidden md:contents">{renderFilterSelects()}</div>
        </>
      }
    >
      <div className="flex flex-1 min-h-0 flex-col gap-3">
        {isError ? (
          <ErrorState
            title="Failed to load audit events"
            description={getErrorMessage(error)}
            onRetry={handleRetry}
            className="flex-1"
          />
        ) : isLoading ? (
          <DataTableSkeleton rows={pageSize} columns={6} className="flex-1" />
        ) : (
          <DataTable
            data={logs}
            columns={AUDIT_LOG_COLUMNS}
            className="flex-1 min-h-0"
            getRowKey={(log) => log.id}
            onRowClick={handleRowClick}
            minWidth="700px"
            pagination={{
              pageSize: pageSizeOption,
              onPageSizeChange: handlePageSizeChange,
            }}
            emptyState={emptyState}
          />
        )}
        <div className="flex shrink-0 items-center justify-between gap-2 py-1 text-sm text-muted-foreground">
          <span>Page {currentPage}</span>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handlePrevPage}
              disabled={cursorStack.length === 0 || isLoading}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleNextPage}
              disabled={!hasMore || isLoading}
            >
              Next
            </Button>
          </div>
        </div>
      </div>

      {selectedLog && <LogDetailSheet log={selectedLog} onClose={handleCloseSheet} />}
    </PageWrapper>
  );
}
