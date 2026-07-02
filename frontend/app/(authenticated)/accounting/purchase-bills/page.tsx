"use client";

import { useState, type ChangeEvent } from "react";
import Link from "next/link";
import { Plus, Search } from "lucide-react";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { EmptyExpensesIllustration } from "@/components/illustrations";
import { usePurchaseBills } from "@/hooks/api/accounting";
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

const STATUS_VARIANT: Record<
  PurchaseBillStatus,
  "default" | "secondary" | "destructive" | "outline"
> = {
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

  function handleRetry(): void {
    void query.refetch();
  }

  const items = query.data?.items ?? [];

  return (
    <PageWrapper
      eyebrow="Accounting"
      title="Purchase Bills"
      subtitle="Vendor bills (AP side of accounting)."
      actions={
        <Button size="sm" asChild>
          <Link href="/accounting/purchase-bills/new">
            <Plus className="size-4 mr-1" />
            New bill
          </Link>
        </Button>
      }
      filters={
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative flex-1 max-w-[240px]">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
            <Input
              value={search}
              onChange={handleSearchChange}
              placeholder="Search by bill number"
              className="h-8 w-full pl-8 text-xs"
            />
          </div>
          <Select value={status} onValueChange={handleStatusChange}>
            <SelectTrigger className="h-8 w-[160px] text-xs">
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
      }
    >
      {query.isLoading && <LoadingState variant="table" rows={8} />}
        {query.error && (
          <ErrorState
            title="Failed to load purchase bills"
            description={query.error.message}
            onRetry={handleRetry}
          />
        )}

        {!query.isLoading && !query.error && items.length === 0 && (
          <EmptyState
            illustration={<EmptyExpensesIllustration />}
            title="No purchase bills yet"
            description="Record a vendor bill to start tracking accounts payable."
            action={{ label: "New bill", href: "/accounting/purchase-bills/new" }}
          />
        )}

        {items.length > 0 && (
          <div className="rounded-lg border border-border overflow-hidden">
            <div className="overflow-x-auto">
              <Table className="min-w-[620px]">
                <TableHeader>
                  <TableRow className="bg-muted/40 hover:bg-muted/40 border-b border-border">
                    <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground px-3 py-2">
                      Bill #
                    </TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground px-3 py-2">
                      Vendor
                    </TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground px-3 py-2 hidden md:table-cell">
                      Bill date
                    </TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground px-3 py-2 hidden md:table-cell">
                      Due date
                    </TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground px-3 py-2 text-right">
                      Total
                    </TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground px-3 py-2">
                      Status
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((bill) => (
                    <TableRow
                      key={bill.id}
                      className="border-b border-border/50 hover:bg-muted/30"
                    >
                      <TableCell className="font-mono text-xs px-3 py-2">
                        <Link
                          href={`/accounting/purchase-bills/${bill.id}`}
                          className="text-foreground hover:text-violet-600 hover:underline"
                        >
                          {bill.billNumber}
                        </Link>
                      </TableCell>
                      <TableCell className="text-sm px-3 py-2">
                        {bill.vendorName ?? "—"}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground px-3 py-2 hidden md:table-cell">
                        {formatDate(bill.billDate)}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground px-3 py-2 hidden md:table-cell">
                        {formatDate(bill.dueDate)}
                      </TableCell>
                      <TableCell className="text-sm text-right tabular-nums font-medium px-3 py-2">
                        {Number(bill.total).toFixed(2)}
                      </TableCell>
                      <TableCell className="px-3 py-2">
                        <Badge
                          variant={STATUS_VARIANT[bill.status]}
                          className="text-xs px-1.5 py-0.5 rounded-md"
                        >
                          {bill.status}
                        </Badge>
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
