"use client";

import { useState, type ChangeEvent } from "react";
import Link from "next/link";
import { Search } from "lucide-react";
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
            <Checkbox
              checked={onlyOutstanding}
              onCheckedChange={handleOnlyOutstandingToggle}
            />
            Only outstanding
          </label>
        </div>
      }
    >
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
                    <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground px-3 py-2 w-[80px]">
                      &nbsp;
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
                      <TableCell className="text-right font-mono text-sm font-medium tabular-nums px-3 py-2">
                        {formatCurrency(row.outstanding)}
                      </TableCell>
                      <TableCell className="px-3 py-2">
                        <Link
                          href={`/accounting/reports/customer-statement?clientId=${row.clientId}`}
                          className="text-xs text-blue-600 hover:underline whitespace-nowrap"
                        >
                          Statement
                        </Link>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        )}
    </PageWrapper>
  );
}
