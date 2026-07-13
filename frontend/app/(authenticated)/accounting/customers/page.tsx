"use client";

import { useState, type ChangeEvent } from "react";
import Link from "next/link";
import { Search } from "lucide-react";
import { useDebouncedValue } from "@/hooks/common/use-debounce";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { ErrorState } from "@/components/shared";
import { EmptyState } from "@/components/ui/empty-state";
import { EmptyTeamIllustration } from "@/components/illustrations";
import { getErrorMessage } from "@/lib/get-error-message";
import { useCustomersOutstanding } from "@/hooks/api/accounting";
import type { CustomerOutstanding } from "@/types/accounting";

function formatCurrency(value: string): string {
  const n = Number(value);
  if (!Number.isFinite(n)) return value;
  return n.toLocaleString(undefined, { style: "currency", currency: "INR", maximumFractionDigits: 2 });
}

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

  function handleSearchChange(event: ChangeEvent<HTMLInputElement>): void {
    setSearch(event.target.value);
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
      eyebrow="Accounting · Customers"
      title="Customer ledgers"
      subtitle="Track outstanding receivables by customer."
      filters={
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative flex-1 max-w-[240px]">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
            <Input
              value={search}
              onChange={handleSearchChange}
              placeholder="Search customers..."
              className="h-8 w-full pl-8 text-xs"
            />
          </div>
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
