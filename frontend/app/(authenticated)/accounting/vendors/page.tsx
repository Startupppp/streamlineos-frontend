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
import { LoadingState } from "@/components/shared/loading-state";
import { ErrorState } from "@/components/shared/error-state";
import { EmptyState } from "@/components/ui/empty-state";
import { EmptyTeamIllustration } from "@/components/illustrations";
import { useVendorsOutstanding } from "@/hooks/api/accounting";

export default function VendorsListPage() {
  const [search, setSearch] = useState<string>("");
  const [onlyOutstanding, setOnlyOutstanding] = useState<boolean>(true);

  const query = useVendorsOutstanding({
    page: 1,
    pageSize: 100,
    q: search || undefined,
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
    >
      <div className="space-y-4">
        <div className="rounded-lg border border-border bg-muted/40 p-3">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <Input
              value={search}
              onChange={handleSearchChange}
              placeholder="Search vendors..."
              className="w-full sm:max-w-xs h-8 text-sm"
            />
            <label className="flex items-center gap-2 text-sm text-foreground cursor-pointer select-none">
              <Checkbox
                checked={onlyOutstanding}
                onCheckedChange={handleOnlyOutstandingChange}
              />
              Only with outstanding balance
            </label>
          </div>
        </div>

        {query.isLoading && <LoadingState variant="table" />}
        {query.error && (
          <ErrorState
            title="Failed to load vendors"
            description={query.error.message}
            onRetry={handleRetry}
          />
        )}

        {!query.isLoading && !query.error && items.length === 0 && (
          <EmptyState
            illustration={<EmptyTeamIllustration />}
            title="No vendors found"
            description="Mark CRM clients as vendors and record purchase bills to see them here."
          />
        )}

        {items.length > 0 && (
          <div className="rounded-lg border border-border overflow-hidden">
            <div className="overflow-x-auto">
              <Table className="min-w-[480px]">
                <TableHeader>
                  <TableRow className="bg-muted/40 hover:bg-muted/40 border-b border-border">
                    <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground px-3 py-2">
                      Vendor
                    </TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground px-3 py-2 hidden md:table-cell">
                      State
                    </TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground px-3 py-2 hidden md:table-cell">
                      GSTIN
                    </TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground px-3 py-2 text-right">
                      Bills
                    </TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground px-3 py-2 text-right">
                      Outstanding
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((v) => (
                    <TableRow
                      key={v.vendorId}
                      className="border-b border-border/50 hover:bg-muted/30"
                    >
                      <TableCell className="px-3 py-2">
                        <Link
                          href={`/accounting/vendors/${v.vendorId}`}
                          className="text-sm font-medium text-foreground hover:text-violet-600 hover:underline"
                        >
                          {v.vendorName}
                        </Link>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground px-3 py-2 hidden md:table-cell">
                        {v.state ?? "—"}
                      </TableCell>
                      <TableCell className="font-mono text-xs text-muted-foreground px-3 py-2 hidden md:table-cell">
                        {v.gstin ?? "—"}
                      </TableCell>
                      <TableCell className="text-right text-sm tabular-nums px-3 py-2">
                        {v.billCount}
                      </TableCell>
                      <TableCell className="text-right font-mono text-sm tabular-nums font-medium px-3 py-2">
                        {Number(v.outstanding).toFixed(2)}
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
