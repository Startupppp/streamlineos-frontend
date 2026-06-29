"use client";

import { useState, type ChangeEvent } from "react";
import Link from "next/link";
import { Plus } from "lucide-react";
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
<<<<<<< Updated upstream
import {
  useSalesOrders,
  type SalesOrderStatus,
} from "@/hooks/api/inventory/sales-orders";
=======
import { useSalesOrders, type SalesOrderStatus } from "@/hooks/api/inventory/sales-orders";
>>>>>>> Stashed changes

type SoStatus = SalesOrderStatus;
type StatusFilter = "ALL" | SoStatus;

const STATUS_OPTIONS: ReadonlyArray<{ value: StatusFilter; label: string }> = [
  { value: "ALL", label: "All statuses" },
  { value: "DRAFT", label: "Draft" },
  { value: "CONFIRMED", label: "Confirmed" },
  { value: "SHIPPED", label: "Shipped" },
  { value: "INVOICED", label: "Invoiced" },
  { value: "CANCELLED", label: "Cancelled" },
];

const STATUS_VARIANT: Record<
  SoStatus,
  "default" | "secondary" | "destructive" | "outline"
> = {
  DRAFT: "secondary",
  CONFIRMED: "default",
  SHIPPED: "outline",
  INVOICED: "default",
  CANCELLED: "destructive",
};

const STATUS_CLASS: Record<SoStatus, string> = {
  DRAFT: "",
  CONFIRMED: "bg-blue-100 text-blue-800 border-blue-200",
  SHIPPED: "bg-yellow-100 text-yellow-800 border-yellow-200",
  INVOICED: "bg-green-100 text-green-800 border-green-200",
  CANCELLED: "",
};

function isStatusFilter(value: string): value is StatusFilter {
  return STATUS_OPTIONS.some((opt) => opt.value === value);
}

function formatDate(value: string | null): string {
  if (!value) return "—";
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? value : d.toLocaleDateString();
}

export default function SalesOrdersListPage() {
  const [dateFrom, setDateFrom] = useState<string>("");
  const [dateTo, setDateTo] = useState<string>("");
  const [status, setStatus] = useState<StatusFilter>("ALL");

  const query = useSalesOrders({
    status: status === "ALL" ? undefined : status,
    dateFrom: dateFrom || undefined,
    dateTo: dateTo || undefined,
    limit: 100,
  });

  function handleStatusChange(value: string): void {
    if (isStatusFilter(value)) setStatus(value);
  }

  function handleDateFromChange(event: ChangeEvent<HTMLInputElement>): void {
    setDateFrom(event.target.value);
  }

  function handleDateToChange(event: ChangeEvent<HTMLInputElement>): void {
    setDateTo(event.target.value);
  }

  const items = query.data?.items ?? [];

  function handleRetry() {
    void query.refetch();
  }

  return (
    <PageWrapper
      eyebrow="Inventory"
      title="Sales Orders"
      subtitle="Manage customer sales orders from creation to invoicing."
      actions={
        <Button asChild>
          <Link href="/inventory/sales-orders/new">
            <Plus className="size-4 mr-1" />
            New SO
          </Link>
        </Button>
      }
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end mb-4">
        <Select value={status} onValueChange={handleStatusChange}>
          <SelectTrigger className="w-full sm:max-w-[180px]">
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
        <Input
          type="date"
          value={dateFrom}
          onChange={handleDateFromChange}
          className="w-full sm:max-w-[160px]"
          placeholder="From date"
        />
        <Input
          type="date"
          value={dateTo}
          onChange={handleDateToChange}
          className="w-full sm:max-w-[160px]"
          placeholder="To date"
        />
      </div>

      {query.isLoading && <LoadingState variant="table" rows={8} />}
      {query.error && (
        <ErrorState description={query.error.message} onRetry={handleRetry} />
      )}

      {!query.isLoading && !query.error && items.length === 0 && (
        <EmptyState
          illustration={<EmptyExpensesIllustration />}
          title="No sales orders yet"
          description="Create a sales order to start fulfilling customer requests."
          action={{ label: "New SO", href: "/inventory/sales-orders/new" }}
        />
      )}

      {items.length > 0 && (
        <div className="rounded-xl border border-border/60 bg-card overflow-x-auto">
          <Table className="min-w-[760px]">
            <TableHeader>
              <TableRow>
                <TableHead>SO #</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Order Date</TableHead>
                <TableHead>Required Date</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-[80px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((so) => (
                <TableRow key={so.id}>
                  <TableCell className="font-mono text-xs">
                    <Link
                      href={`/inventory/sales-orders/${so.id}`}
                      className="text-foreground hover:text-blue-600 hover:underline"
                    >
                      {so.soNumber}
                    </Link>
                  </TableCell>
                  <TableCell>{so.customerName ?? "—"}</TableCell>
                  <TableCell>{formatDate(so.orderDate)}</TableCell>
                  <TableCell>{formatDate(so.expectedShipDate)}</TableCell>
                  <TableCell className="text-right tabular-nums">
                    {Number(so.total).toFixed(2)}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={STATUS_VARIANT[so.status]}
                      className={STATUS_CLASS[so.status] || undefined}
                    >
                      {so.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Button variant="ghost" size="sm" asChild>
                      <Link href={`/inventory/sales-orders/${so.id}`}>
                        View
                      </Link>
                    </Button>
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
