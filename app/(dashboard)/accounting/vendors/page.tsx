"use client";

import { useState, type ChangeEvent } from "react";
import Link from "next/link";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { LoadingState } from "@/components/shared/loading-state";
import { ErrorState } from "@/components/shared/error-state";
import { EmptyState } from "@/components/ui/empty-state";
import { EmptyTeamIllustration } from "@/components/illustrations";
import { Checkbox } from "@/components/ui/checkbox";
import { useVendorsOutstanding } from "@/lib/api/hooks/accounting";

export default function VendorsListPage() {
  const [search, setSearch] = useState<string>("");
  const [onlyOutstanding, setOnlyOutstanding] = useState<boolean>(true);
  const query = useVendorsOutstanding({ page: 1, pageSize: 100, q: search || undefined, onlyOutstanding });
  const items = query.data?.items ?? [];

  function handleSearchChange(event: ChangeEvent<HTMLInputElement>): void {
    setSearch(event.target.value);
  }

  function handleOnlyOutstandingChange(checked: boolean | "indeterminate"): void {
    setOnlyOutstanding(checked === true);
  }

  return (
    <PageWrapper
      eyebrow="Accounting · Vendors"
      title="Vendor ledgers"
      subtitle="Outstanding payables by vendor."
    >
      <div className="flex flex-col sm:flex-row gap-3 mb-4 sm:items-center">
        <Input
          value={search}
          onChange={handleSearchChange}
          placeholder="Search vendors..."
          className="sm:max-w-xs"
        />
        <label className="flex items-center gap-2 text-sm">
          <Checkbox checked={onlyOutstanding} onCheckedChange={handleOnlyOutstandingChange} />
          Only with outstanding balance
        </label>
      </div>

      {query.isLoading && <LoadingState variant="table" />}
      {query.error && <ErrorState description={query.error.message} />}

      {!query.isLoading && !query.error && items.length === 0 && (
        <EmptyState
          illustration={<EmptyTeamIllustration />}
          title="No vendors found"
          description="Mark CRM clients as vendors and record purchase bills to see them here."
        />
      )}

      {items.length > 0 && (
        <Card className="overflow-x-auto">
          <Table className="min-w-[620px]">
            <TableHeader>
              <TableRow>
                <TableHead>Vendor</TableHead>
                <TableHead>State</TableHead>
                <TableHead>GSTIN</TableHead>
                <TableHead className="text-right">Bills</TableHead>
                <TableHead className="text-right">Outstanding</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((v) => (
                <TableRow key={v.vendorId}>
                  <TableCell>
                    <Link href={`/accounting/vendors/${v.vendorId}`} className="text-sm font-medium text-foreground hover:text-blue-600 hover:underline">
                      {v.vendorName}
                    </Link>
                  </TableCell>
                  <TableCell>{v.state ?? "—"}</TableCell>
                  <TableCell className="font-mono text-xs">{v.gstin ?? "—"}</TableCell>
                  <TableCell className="text-right tabular-nums">{v.billCount}</TableCell>
                  <TableCell className="text-right tabular-nums font-medium">{Number(v.outstanding).toFixed(2)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}
    </PageWrapper>
  );
}
