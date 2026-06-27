"use client";

import { useState } from "react";
import Link from "next/link";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ListToolbar, LoadingState, ErrorState } from "@/components/shared";
import { EmptyState } from "@/components/ui/empty-state";
import { EmptyTeamIllustration } from "@/components/illustrations";
import { useCustomersOutstanding } from "@/lib/api/hooks/accounting";

function formatCurrency(value: string): string {
  const n = Number(value);
  if (!Number.isFinite(n)) return value;
  return n.toLocaleString(undefined, { style: "currency", currency: "INR", maximumFractionDigits: 2 });
}

export default function CustomerLedgersPage() {
  const [search, setSearch] = useState<string>("");
  const [onlyOutstanding, setOnlyOutstanding] = useState<boolean>(true);

  const query = useCustomersOutstanding({
    page: 1,
    pageSize: 100,
    q: search ? search : undefined,
    onlyOutstanding,
  });

  function handleSearchChange(value: string): void {
    setSearch(value);
  }

  function handleOnlyOutstandingToggle(checked: boolean | "indeterminate"): void {
    setOnlyOutstanding(checked === true);
  }

  const items = query.data?.items ?? [];
  const total = query.data?.total ?? 0;

  return (
    <PageWrapper
      eyebrow="Accounting · Customers"
      title="Customer ledgers"
      subtitle="Outstanding receivables by customer."
      badge={`${total}`}
    >
      <div className="space-y-4">
        <ListToolbar
          search={search}
          onSearchChange={handleSearchChange}
          searchPlaceholder="Search customers..."
          filters={
            <label className="flex items-center gap-2 text-sm text-foreground">
              <Checkbox
                checked={onlyOutstanding}
                onCheckedChange={handleOnlyOutstandingToggle}
              />
              Only outstanding
            </label>
          }
        />

        {query.isLoading ? (
          <LoadingState variant="table" rows={8} />
        ) : query.error ? (
          <ErrorState
            title="Failed to load customers"
            description={query.error.message}
          />
        ) : items.length === 0 ? (
          <EmptyState
            illustration={<EmptyTeamIllustration />}
            title="No customers found"
            description={
              search
                ? "Try a different search term."
                : onlyOutstanding
                  ? "No customers currently owe receivables."
                  : "No customers yet."
            }
          />
        ) : (
          <div className="rounded-xl border border-border/60 bg-card overflow-x-auto">
            <Table className="min-w-[640px]">
              <TableHeader>
                <TableRow>
                  <TableHead>Customer</TableHead>
                  <TableHead className="w-[160px]">State</TableHead>
                  <TableHead className="w-[180px]">GSTIN</TableHead>
                  <TableHead className="w-[100px] text-right">Invoices</TableHead>
                  <TableHead className="w-[160px] text-right">Outstanding</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((row) => (
                  <TableRow key={row.clientId}>
                    <TableCell>
                      <Link
                        href={`/accounting/customers/${row.clientId}`}
                        className="text-sm font-medium text-foreground hover:text-blue-600 hover:underline"
                      >
                        {row.clientName}
                      </Link>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {row.state ?? "—"}
                    </TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">
                      {row.gstin ?? "—"}
                    </TableCell>
                    <TableCell className="text-right text-sm tabular-nums">
                      {row.invoiceCount}
                    </TableCell>
                    <TableCell className="text-right text-sm font-medium tabular-nums">
                      {formatCurrency(row.outstanding)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </PageWrapper>
  );
}
