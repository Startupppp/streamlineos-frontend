"use client";

import { useState } from "react";
import Link from "next/link";
import { useDebouncedValue } from "@/hooks/common/use-debounce";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { FILTER_TOOLBAR_ROW } from "@/components/ui/content-fill-panel";
import { SearchInput } from "@/components/ui/search-input";
import { Checkbox } from "@/components/ui/checkbox";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { CursorPageControls } from "@/components/ui/cursor-page-controls";
import { ErrorState } from "@/components/shared";
import { EmptyState } from "@/components/ui/empty-state";
import { EmptyTeamIllustration } from "@/components/illustrations";
import { getErrorMessage } from "@/lib/get-error-message";
import { useCustomersOutstanding } from "@/hooks/api/accounting";
import type { CustomerOutstanding } from "@/types/accounting";
import { formatCurrency } from "@/features/accounting/lib/format-currency";

const columns: DataTableColumn<CustomerOutstanding>[] = [
  {
    key: "clientName",
    header: "Customer",
    sortable: true,
    sortValue: (row) => row.clientName,
    cell: (row) => (
      <Link
        href={`/accounting/customers/${row.clientId}`}
        className="text-sm font-medium text-foreground hover:text-primary hover:underline"
      >
        {row.clientName}
      </Link>
    ),
  },
  {
    key: "state",
    header: "State",
    cell: (row) => <span className="text-muted-foreground">{row.state ?? "—"}</span>,
  },
  {
    key: "gstin",
    header: "GSTIN",
    cell: (row) => <span className="font-mono text-muted-foreground">{row.gstin ?? "—"}</span>,
  },
  {
    key: "invoiceCount",
    header: "Invoices",
    sortable: true,
    sortValue: (row) => row.invoiceCount,
    headerClassName: "text-right",
    className: "text-right tabular-nums",
    cell: (row) => row.invoiceCount,
  },
  {
    key: "outstanding",
    header: "Outstanding",
    sortable: true,
    sortValue: (row) => Number(row.outstanding),
    headerClassName: "text-right",
    className: "text-right font-mono font-medium tabular-nums",
    cell: (row) => formatCurrency(row.outstanding),
  },
  {
    key: "statement",
    header: "",
    cell: (row) => (
      <Link
        href={`/accounting/reports/customer-statement?clientId=${row.clientId}`}
        className="text-xs text-primary hover:underline whitespace-nowrap"
      >
        Statement
      </Link>
    ),
  },
];

export default function CustomerLedgersPage() {
  const [search, setSearch] = useState<string>("");
  const [onlyOutstanding, setOnlyOutstanding] = useState<boolean>(true);
  const [cursors, setCursors] = useState<(string | null)[]>([null]);
  const [cursorIndex, setCursorIndex] = useState(0);

  const debouncedSearch = useDebouncedValue(search, 300);

  const query = useCustomersOutstanding({
    limit: 100,
    cursor: cursors[cursorIndex] ?? undefined,
    q: debouncedSearch.trim() || undefined,
    onlyOutstanding,
  });

  const hasMore = query.data?.pagination.hasMore ?? false;

  function resetCursors(): void {
    setCursors([null]);
    setCursorIndex(0);
  }

  function handleSearchChange(value: string) {
    setSearch(value);
    resetCursors();
  }

  function handleOnlyOutstandingToggle(checked: boolean | "indeterminate"): void {
    setOnlyOutstanding(checked === true);
    resetCursors();
  }

  function handlePreviousPage(): void {
    setCursorIndex((previous) => Math.max(0, previous - 1));
  }

  function handleNextPage(): void {
    const nextCursor = query.data?.pagination.nextCursor;
    if (!nextCursor) return;

    setCursors((previous) => [...previous.slice(0, cursorIndex + 1), nextCursor]);
    setCursorIndex((previous) => previous + 1);
  }

  function handleRetry(): void {
    void query.refetch();
  }

  const items = query.data?.data ?? [];

  const emptyDescription = search
    ? "Try a different search term."
    : onlyOutstanding
      ? "No customers currently owe receivables."
      : "No customers yet.";

  return (
    <PageWrapper
      title="Customer ledgers"
      subtitle="Track outstanding receivables by customer."
      filters={
        <div className={FILTER_TOOLBAR_ROW}>
          <SearchInput value={search} onValueChange={handleSearchChange} placeholder="Search customers..." />
          <label className="flex items-center gap-2 text-xs text-foreground cursor-pointer select-none">
            <Checkbox checked={onlyOutstanding} onCheckedChange={handleOnlyOutstandingToggle} />
            Only outstanding
          </label>
        </div>
      }
    >
      <div className="flex flex-1 min-h-0 flex-col">
        {query.error ? (
          <ErrorState
            title="Failed to load customers"
            description={getErrorMessage(query.error)}
            onRetry={handleRetry}
          />
        ) : (
          <>
            <DataTable<CustomerOutstanding>
              className="flex-1 min-h-0"
              data={items}
              columns={columns}
              getRowKey={(row) => row.clientId}
              isLoading={query.isLoading}
              pagination={{ pageSize: 100 }}
              emptyState={
                <EmptyState
                  illustration={<EmptyTeamIllustration />}
                  title="No customers found"
                  description={emptyDescription}
                  compact
                />
              }
            />
            {(cursorIndex > 0 || hasMore) ? (
              <CursorPageControls
                page={cursorIndex + 1}
                hasNext={hasMore}
                disabled={query.isFetching}
                onPrevious={handlePreviousPage}
                onNext={handleNextPage}
                className="mt-2"
              />
            ) : null}
          </>
        )}
      </div>
    </PageWrapper>
  );
}
