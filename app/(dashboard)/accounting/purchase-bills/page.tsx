"use client";

import { useState, type ChangeEvent } from "react";
import Link from "next/link";
import { Plus } from "lucide-react";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { LoadingState, ErrorState } from "@/components/shared";
import { usePurchaseBills } from "@/lib/api/hooks/accounting";
import type { PurchaseBillStatus } from "@/types/accounting";

type StatusFilter = "ALL" | PurchaseBillStatus;

const STATUS_OPTIONS: ReadonlyArray<{ value: StatusFilter; label: string }> = [
  { value: "ALL", label: "All statuses" },
  { value: "DRAFT", label: "Draft" },
  { value: "POSTED", label: "Posted" },
  { value: "PARTIALLY_PAID", label: "Partially paid" },
  { value: "PAID", label: "Paid" },
  { value: "CANCELLED", label: "Cancelled" },
];

const STATUS_VARIANT: Record<PurchaseBillStatus, "default" | "secondary" | "destructive" | "outline"> = {
  DRAFT: "secondary",
  POSTED: "default",
  PARTIALLY_PAID: "outline",
  PAID: "default",
  CANCELLED: "destructive",
};

function isStatusFilter(value: string): value is StatusFilter {
  return STATUS_OPTIONS.some((opt) => opt.value === value);
}

function formatDate(value: string | null): string {
  if (!value) return "—";
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? value : d.toLocaleDateString();
}

export default function PurchaseBillsListPage() {
  const [search, setSearch] = useState<string>("");
  const [status, setStatus] = useState<StatusFilter>("ALL");

  const query = usePurchaseBills({
    page: 1,
    pageSize: 100,
    q: search || undefined,
    status: status === "ALL" ? undefined : status,
  });

  function handleSearchChange(event: ChangeEvent<HTMLInputElement>): void {
    setSearch(event.target.value);
  }

  function handleStatusChange(value: string): void {
    if (isStatusFilter(value)) setStatus(value);
  }

  const items = query.data?.items ?? [];

  return (
    <PageWrapper
      eyebrow="Accounting"
      title="Purchase Bills"
      subtitle="Vendor bills (AP side of accounting)."
      actions={
        <Button asChild>
          <Link href="/accounting/purchase-bills/new">
            <Plus className="size-4 mr-1" />
            New bill
          </Link>
        </Button>
      }
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end mb-4">
        <Input
          value={search}
          onChange={handleSearchChange}
          placeholder="Search by bill number"
          className="sm:max-w-xs"
        />
        <Select value={status} onValueChange={handleStatusChange}>
          <SelectTrigger className="sm:max-w-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {STATUS_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {query.isLoading && <LoadingState variant="table" rows={8} />}
      {query.error && <ErrorState description={query.error.message} />}

      {!query.isLoading && !query.error && items.length === 0 && (
        <div className="rounded-xl border border-dashed border-slate-300 p-10 text-center text-sm text-slate-600">
          No purchase bills yet.
        </div>
      )}

      {items.length > 0 && (
        <div className="rounded-xl border border-slate-200/60 overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Bill #</TableHead>
                <TableHead>Vendor</TableHead>
                <TableHead>Bill date</TableHead>
                <TableHead>Due date</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((bill) => (
                <TableRow key={bill.id}>
                  <TableCell className="font-mono text-xs">
                    <Link href={`/accounting/purchase-bills/${bill.id}`} className="text-blue-600 hover:underline">
                      {bill.billNumber}
                    </Link>
                  </TableCell>
                  <TableCell>{bill.vendorName ?? "—"}</TableCell>
                  <TableCell>{formatDate(bill.billDate)}</TableCell>
                  <TableCell>{formatDate(bill.dueDate)}</TableCell>
                  <TableCell className="text-right tabular-nums">{Number(bill.total).toFixed(2)}</TableCell>
                  <TableCell>
                    <Badge variant={STATUS_VARIANT[bill.status]}>{bill.status}</Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </PageWrapper>
  );
}
