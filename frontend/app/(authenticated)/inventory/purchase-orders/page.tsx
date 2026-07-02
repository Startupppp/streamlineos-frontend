"use client";

import { useState } from "react";
import Link from "next/link";
import { Plus } from "lucide-react";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { LoadingState, ErrorState } from "@/components/shared";
import { EmptyState } from "@/components/ui/empty-state";
import { EmptyExpensesIllustration } from "@/components/illustrations";
import { usePurchaseOrders, useVendors } from "@/hooks/api/inventory";
import type { PurchaseOrderStatus } from "@/types/inventory";

type StatusFilter = "ALL" | PurchaseOrderStatus;

const STATUS_OPTIONS: ReadonlyArray<{ value: StatusFilter; label: string }> = [
  { value: "ALL", label: "All statuses" },
  { value: "DRAFT", label: "Draft" },
  { value: "SENT", label: "Sent" },
  { value: "PARTIAL", label: "Partially received" },
  { value: "RECEIVED", label: "Received" },
  { value: "CLOSED", label: "Closed" },
  { value: "CANCELLED", label: "Cancelled" },
];

const STATUS_VARIANT: Record<PurchaseOrderStatus, "default" | "secondary" | "destructive" | "outline"> = {
  DRAFT: "secondary",
  SENT: "default",
  PARTIAL: "outline",
  RECEIVED: "default",
  CLOSED: "secondary",
  CANCELLED: "destructive",
};

const STATUS_CLASS: Partial<Record<PurchaseOrderStatus, string>> = {
  SENT: "bg-blue-50 text-blue-700 border-blue-200",
  PARTIAL: "bg-amber-50 text-amber-600 border-amber-200 dark:bg-amber-950",
  RECEIVED: "bg-emerald-50 text-emerald-700 border-emerald-200",
};

function isStatusFilter(value: string): value is StatusFilter {
  return STATUS_OPTIONS.some((opt) => opt.value === value);
}

function formatDate(value: string | null): string {
  if (!value) return "—";
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? value : d.toLocaleDateString();
}

function StatusBadge({ status }: { status: PurchaseOrderStatus }) {
  const extraClass = STATUS_CLASS[status];
  return (
    <Badge
      variant={STATUS_VARIANT[status]}
      className={`text-xs px-1.5 py-0.5 rounded-md${extraClass ? ` ${extraClass}` : ""}`}
    >
      {status}
    </Badge>
  );
}

export default function PurchaseOrdersListPage() {
  const [status, setStatus] = useState<StatusFilter>("ALL");
  const [vendorId, setVendorId] = useState<string>("ALL");

  const vendorsQuery = useVendors({ isActive: true, limit: 200 });
  const query = usePurchaseOrders({
    page: 1,
    pageSize: 100,
    status: status === "ALL" ? undefined : status,
    vendorId: vendorId !== "ALL" ? Number(vendorId) : undefined,
  });

  function handleStatusChange(value: string): void {
    if (isStatusFilter(value)) setStatus(value);
  }

  function handleVendorChange(value: string): void {
    setVendorId(value);
  }

  function handleRetry(): void {
    void query.refetch();
  }

  const items = query.data?.items ?? [];
  const vendors = vendorsQuery.data?.items ?? [];

  return (
    <PageWrapper
      eyebrow="Inventory"
      title="Purchase Orders"
      subtitle="Supplier orders and goods receipt tracking."
      badge={query.data?.total != null && query.data.total > 0 ? String(query.data.total) : undefined}
      actions={
        <Button asChild size="sm">
          <Link href="/inventory/purchase-orders/new">
            <Plus className="size-4 mr-1" />
            New PO
          </Link>
        </Button>
      }
    >
      <div className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center bg-muted/40 rounded-lg p-3">
          <Select value={status} onValueChange={handleStatusChange}>
            <SelectTrigger className="h-8 text-sm w-full sm:w-48">
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

          <Select value={vendorId} onValueChange={handleVendorChange}>
            <SelectTrigger className="h-8 text-sm w-full sm:w-52">
              <SelectValue placeholder="All vendors" />
            </SelectTrigger>
            <SelectContent className="max-h-72">
              <SelectItem value="ALL">All vendors</SelectItem>
              {vendors.map((v) => (
                <SelectItem key={v.id} value={String(v.id)}>
                  {v.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {query.isLoading && <LoadingState variant="table" rows={8} />}
        {query.error && <ErrorState description={query.error.message} onRetry={handleRetry} />}

        {!query.isLoading && !query.error && items.length === 0 && (
          <EmptyState
            illustration={<EmptyExpensesIllustration />}
            title="No purchase orders"
            description="Create a PO to start ordering from your suppliers."
            action={{ label: "New PO", href: "/inventory/purchase-orders/new" }}
          />
        )}

      {items.length > 0 && (
        <div className="rounded-lg border border-border overflow-hidden">
          <Table className="min-w-[640px]">
            <TableHeader>
              <TableRow className="bg-muted/40 hover:bg-muted/40">
                <TableHead className="px-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  PO #
                </TableHead>
                <TableHead className="px-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Vendor
                </TableHead>
                <TableHead className="px-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground hidden md:table-cell">
                  Order Date
                </TableHead>
                <TableHead className="px-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground hidden md:table-cell">
                  Expected Delivery
                </TableHead>
                <TableHead className="px-3 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Total
                </TableHead>
                <TableHead className="px-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Status
                </TableHead>
                <TableHead className="w-[80px]" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((po) => (
                <TableRow
                  key={po.id}
                  className="border-b border-border/50 hover:bg-muted/30 transition-colors"
                >
                  <TableCell className="px-3 py-2 font-mono text-xs">
                    <Link
                      href={`/inventory/purchase-orders/${po.id}`}
                      className="text-foreground hover:text-violet-600 hover:underline"
                    >
                      {po.poNumber}
                    </Link>
                  </TableCell>
                  <TableCell className="px-3 py-2 text-sm">{po.vendor?.name ?? "—"}</TableCell>
                  <TableCell className="px-3 py-2 text-sm hidden md:table-cell">
                    {formatDate(po.orderDate)}
                  </TableCell>
                  <TableCell className="px-3 py-2 text-sm hidden md:table-cell">
                    {formatDate(po.expectedDeliveryDate)}
                  </TableCell>
                  <TableCell className="px-3 py-2 text-right tabular-nums text-sm">
                    {Number(po.total).toFixed(2)}
                  </TableCell>
                  <TableCell className="px-3 py-2">
                    <StatusBadge status={po.status} />
                  </TableCell>
                  <TableCell className="px-3 py-2">
                    <Button variant="ghost" size="sm" asChild>
                      <Link href={`/inventory/purchase-orders/${po.id}`}>View</Link>
                    </Button>
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
