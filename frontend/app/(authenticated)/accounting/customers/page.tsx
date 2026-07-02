"use client";

import { useState, type ChangeEvent } from "react";
import Link from "next/link";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { LoadingState, ErrorState } from "@/components/shared";
import { EmptyState } from "@/components/ui/empty-state";
import { EmptyTeamIllustration } from "@/components/illustrations";
import { useCustomersOutstanding } from "@/hooks/api/accounting";

function formatCurrency(value: string): string {
  const n = Number(value);
  if (!Number.isFinite(n)) return value;
  return n.toLocaleString(undefined, {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  });
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

  function handleSearchChange(event: ChangeEvent<HTMLInputElement>): void {
    setSearch(event.target.value);
  }

  function handleOnlyOutstandingToggle(
    checked: boolean | "indeterminate",
  ): void {
    setOnlyOutstanding(checked === true);
  }

  function handleRetry(): void {
    void query.refetch();
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
        <div className="rounded-lg border border-border bg-muted/40 p-3">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <Input
              value={search}
              onChange={handleSearchChange}
              placeholder="Search customers..."
              className="w-full sm:max-w-xs h-8 text-sm"
            />
            <label className="flex items-center gap-2 text-sm text-foreground cursor-pointer select-none">
              <Checkbox
                checked={onlyOutstanding}
                onCheckedChange={handleOnlyOutstandingToggle}
              />
              Only outstanding
            </label>
          </div>
        </div>

        {query.isLoading ? (
          <LoadingState variant="table" rows={8} />
        ) : query.error ? (
          <ErrorState
            title="Failed to load customers"
            description={query.error.message}
            onRetry={handleRetry}
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
          <div className="rounded-lg border border-border overflow-hidden">
            <div className="overflow-x-auto">
              <Table className="min-w-[500px]">
                <TableHeader>
                  <TableRow className="bg-muted/40 hover:bg-muted/40 border-b border-border">
                    <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground px-3 py-2">
                      Customer
                    </TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground px-3 py-2 w-[160px] hidden md:table-cell">
                      State
                    </TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground px-3 py-2 w-[180px] hidden md:table-cell">
                      GSTIN
                    </TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground px-3 py-2 w-[100px] text-right">
                      Invoices
                    </TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground px-3 py-2 w-[160px] text-right">
                      Outstanding
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((row) => (
                    <TableRow
                      key={row.clientId}
                      className="border-b border-border/50 hover:bg-muted/30"
                    >
                      <TableCell className="px-3 py-2">
                        <Link
                          href={`/accounting/customers/${row.clientId}`}
                          className="text-sm font-medium text-foreground hover:text-violet-600 hover:underline"
                        >
                          {row.clientName}
                        </Link>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground px-3 py-2 hidden md:table-cell">
                        {row.state ?? "—"}
                      </TableCell>
                      <TableCell className="font-mono text-xs text-muted-foreground px-3 py-2 hidden md:table-cell">
                        {row.gstin ?? "—"}
                      </TableCell>
                      <TableCell className="text-right text-sm tabular-nums px-3 py-2">
                        {row.invoiceCount}
                      </TableCell>
                      <TableCell className="text-right text-sm font-medium tabular-nums px-3 py-2">
                        {formatCurrency(row.outstanding)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        )}
      </div>
    </PageWrapper>
  );
}
