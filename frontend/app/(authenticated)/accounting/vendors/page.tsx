"use client";

import { useState, type ChangeEvent } from "react";
import Link from "next/link";
import { Search } from "lucide-react";
import { useDebouncedValue } from "@/hooks/common/use-debounce";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { ErrorState } from "@/components/shared/error-state";
import { EmptyState } from "@/components/ui/empty-state";
import { EmptyTeamIllustration } from "@/components/illustrations";
import { getErrorMessage } from "@/lib/get-error-message";
import { useVendorsOutstanding } from "@/hooks/api/accounting";
import type { VendorOutstanding } from "@/types/accounting";

const columns: DataTableColumn<VendorOutstanding>[] = [
  {
    key: "vendorName",
    header: "Vendor",
    cell: (row) => (
      <Link
        href={`/accounting/vendors/${row.vendorId}`}
        className="text-sm font-medium text-foreground hover:text-primary hover:underline"
      >
        {row.vendorName}
      </Link>
    ),
  },
  {
    key: "state",
    header: "State",
    cell: (row) => (
      <span className="text-muted-foreground">{row.state ?? "—"}</span>
    ),
  },
  {
    key: "gstin",
    header: "GSTIN",
    cell: (row) => (
      <span className="font-mono text-xs text-muted-foreground">
        {row.gstin ?? "—"}
      </span>
    ),
  },
  {
    key: "billCount",
    header: "Bills",
    headerClassName: "text-right",
    className: "text-right tabular-nums",
    cell: (row) => row.billCount,
    sortable: true,
    sortValue: (row) => row.billCount,
  },
  {
    key: "outstanding",
    header: "Outstanding",
    headerClassName: "text-right",
    className: "text-right font-mono tabular-nums font-medium",
    cell: (row) => Number(row.outstanding).toFixed(2),
    sortable: true,
    sortValue: (row) => Number(row.outstanding),
  },
];

const emptyStateNode = (
  <EmptyState
    illustration={<EmptyTeamIllustration />}
    title="No vendors found"
    description="Mark CRM clients as vendors and record purchase bills to see them here."
    action={{ label: "Record a bill", href: "/accounting/purchase-bills/new" }}
    compact
  />
);

export default function VendorsListPage() {
  const [search, setSearch] = useState<string>("");
  const [onlyOutstanding, setOnlyOutstanding] = useState<boolean>(true);

  const debouncedSearch = useDebouncedValue(search, 300);

  const query = useVendorsOutstanding({
    page: 1,
    pageSize: 100,
    q: debouncedSearch.trim() || undefined,
    onlyOutstanding,
  });

  const items = query.data?.items ?? [];

  function handleSearchChange(event: ChangeEvent<HTMLInputElement>): void {
    setSearch(event.target.value);
  }

  function handleOnlyOutstandingChange(
    checked: boolean | "indeterminate",
  ): void {
    setOnlyOutstanding(checked === true);
  }

  function handleRetry(): void {
    void query.refetch();
  }

  return (
    <PageWrapper
      eyebrow="Accounting · Vendors"
      title="Vendor ledgers"
      subtitle="Outstanding payables by vendor."
      filters={
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative flex-1 max-w-[240px]">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
            <Input
              value={search}
              onChange={handleSearchChange}
              placeholder="Search vendors..."
              className="h-8 w-full pl-8 text-xs"
            />
          </div>
          <label className="flex items-center gap-2 text-xs text-foreground cursor-pointer select-none">
            <Checkbox
              checked={onlyOutstanding}
              onCheckedChange={handleOnlyOutstandingChange}
            />
            Only with outstanding balance
          </label>
        </div>
      }
    >
      {query.error ? (
        <ErrorState
          title="Failed to load vendors"
          description={getErrorMessage(query.error)}
          onRetry={handleRetry}
        />
      ) : (
        <DataTable
          className="flex-1 min-h-0"
          data={items}
          columns={columns}
          getRowKey={(row) => row.vendorId}
          isLoading={query.isLoading}
          pagination={{ pageSize: 100 }}
          emptyState={emptyStateNode}
        />
      )}
    </PageWrapper>
  );
}
