"use client";

import { useState } from "react";
import Link from "next/link";
import { useDebouncedValue } from "@/hooks/common/use-debounce";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { FILTER_TOOLBAR_ROW } from "@/components/ui/content-fill-panel";
import { SearchInput } from "@/components/ui/search-input";
import { Checkbox } from "@/components/ui/checkbox";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
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

  const debouncedSearch = useDebouncedValue(search, 300);

  const query = useCustomersOutstanding({
    page: 1,
    pageSize: 100,
    q: debouncedSearch.trim() || undefined,
    onlyOutstanding,
  });

  function handleSearchChange(value: string) {
    setSearch(value);
  }

  function handleOnlyOutstandingToggle(checked: boolean | "indeterminate"): void {
    setOnlyOutstanding(checked === true);
  }

  function handleRetry(): void {
    void query.refetch();
  }

  const items = query.data?.items ?? [];

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
          <SearchInput value={search} onValueChange={handleSearchChange} placeholder="Search customers..." className="w-[220px]" />
          <label className="flex items-center gap-2 text-xs text-foreground cursor-pointer select-none">
            <Checkbox checked={onlyOutstanding} onCheckedChange={handleOnlyOutstandingToggle} />
            Only outstanding
          </label>
        </div>
      }
    >
      {query.error ? (
        <ErrorState
          title="Failed to load customers"
          description={getErrorMessage(query.error)}
          onRetry={handleRetry}
        />
      ) : (
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
      )}
    </PageWrapper>
  );
}
