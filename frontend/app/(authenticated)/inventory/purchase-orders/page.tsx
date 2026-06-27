"use client";

import { useState } from "react";
import Link from "next/link";
import { Plus } from "lucide-react";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { LoadingState, ErrorState } from "@/components/shared";
import { EmptyState } from "@/components/ui/empty-state";
import { EmptyExpensesIllustration } from "@/components/illustrations";
import { usePurchaseOrders, useVendors } from "@/lib/api/hooks/inventory";
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
  PARTIAL: "bg-yellow-50 text-yellow-700 border-yellow-200",
  RECEIVED: "bg-green-50 text-green-700 border-green-200",
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
    <Badge variant={STATUS_VARIANT[status]} className={extraClass}>
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
    limit: 100,
    status: status === "ALL" ? undefined : status,
    vendorId: vendorId !== "ALL" ? Number(vendorId) : undefined,
  });

  function handleStatusChange(value: string): void {
    if (isStatusFilter(value)) setStatus(value);
  }

  function handleVendorChange(value: string): void {
    setVendorId(value);
  }

  const items = query.data?.items ?? [];
  const vendors = vendorsQuery.data?.items ?? [];

  return (
    <PageWrapper
      eyebrow="Inventory"
      title="Purchase Orders"
      subtitle="Supplier orders and goods receipt tracking."
      actions={
        <Button asChild size="sm">
          <Link href="/inventory/purchase-orders/new">
            <Plus className="size-4 mr-1" />
            New PO
          </Link>
        </Button>
      }
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end mb-4">
        <Select value={status} onValueChange={handleStatusChange}>
          <SelectTrigger className="w-full sm:w-48">
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
          <SelectTrigger className="w-full sm:w-52">
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
      {query.error && <ErrorState description={query.error.message} />}

      {!query.isLoading && !query.error && items.length === 0 && (
        <EmptyState
          illustration={<EmptyExpensesIllustration />}
          title="No purchase orders"
          description="Create a PO to start ordering from your suppliers."
          action={{ label: "New PO", href: "/inventory/purchase-orders/new" }}
        />
      )}

      {items.length > 0 && (
        <Card className="overflow-x-auto">
          <Table className="min-w-[760px]">
            <TableHeader>
              <TableRow>
                <TableHead>PO #</TableHead>
                <TableHead>Vendor</TableHead>
                <TableHead>Order date</TableHead>
                <TableHead>Expected delivery</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-[80px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((po) => (
                <TableRow key={po.id}>
                  <TableCell className="font-mono text-xs">
                    <Link
                      href={`/inventory/purchase-orders/${po.id}`}
                      className="text-foreground hover:text-blue-600 hover:underline"
                    >
                      {po.poNumber}
                    </Link>
                  </TableCell>
                  <TableCell className="text-sm">{po.vendor?.name ?? "—"}</TableCell>
                  <TableCell className="text-sm">{formatDate(po.orderDate)}</TableCell>
                  <TableCell className="text-sm">{formatDate(po.expectedDeliveryDate)}</TableCell>
                  <TableCell className="text-right tabular-nums text-sm">
                    {Number(po.total).toFixed(2)}
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={po.status} />
                  </TableCell>
                  <TableCell>
                    <Button variant="ghost" size="sm" asChild>
                      <Link href={`/inventory/purchase-orders/${po.id}`}>View</Link>
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}
    </PageWrapper>
  );
}
