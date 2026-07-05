"use client";

import { useState, useTransition, type ChangeEvent } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Plus, Search, MoreHorizontal } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
} from "@/components/ui/alert-dialog";
import { ErrorState } from "@/components/shared";
import { EmptyState } from "@/components/ui/empty-state";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { usePurchaseOrders, useVendors } from "@/hooks/api/inventory";
import {
  useApprovePurchaseOrder,
  useClosePurchaseOrder,
  useCancelPurchaseOrder,
} from "@/hooks/api/inventory/purchase-orders";
import type { PurchaseOrderStatus, PurchaseOrderSummary } from "@/types/inventory";

const STATUS_OPTIONS = [
  { value: "all", label: "All statuses" },
  { value: "DRAFT", label: "Draft" },
  { value: "SENT", label: "Sent" },
  { value: "PARTIAL", label: "Partially received" },
  { value: "RECEIVED", label: "Received" },
  { value: "CLOSED", label: "Closed" },
  { value: "CANCELLED", label: "Cancelled" },
] as const;

const STATUS_BADGE: Record<PurchaseOrderStatus, string> = {
  DRAFT: "bg-slate-100 text-slate-700 border-slate-200",
  SENT: "bg-blue-50 text-blue-700 border-blue-200",
  PARTIAL: "bg-amber-50 text-amber-700 border-amber-200",
  RECEIVED: "bg-emerald-50 text-emerald-700 border-emerald-200",
  CLOSED: "bg-slate-100 text-slate-700 border-slate-200",
  CANCELLED: "bg-red-50 text-red-700 border-red-200",
};

const VALID_STATUSES = new Set<string>([
  "DRAFT", "SENT", "PARTIAL", "RECEIVED", "CLOSED", "CANCELLED",
]);

function formatDate(value: string | null): string {
  if (!value) return "—";
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? value : d.toLocaleDateString();
}

function StatusBadge({ status }: { status: PurchaseOrderStatus }) {
  return (
    <Badge variant="outline" className={cn("h-4 text-[9px] px-1.5 py-0", STATUS_BADGE[status])}>
      {status}
    </Badge>
  );
}

function PoRowActions({ po }: { po: PurchaseOrderSummary }) {
  const [showCancel, setShowCancel] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const approveMutation = useApprovePurchaseOrder(po.id);
  const closeMutation = useClosePurchaseOrder(po.id);
  const cancelMutation = useCancelPurchaseOrder(po.id);

  const canApprove = po.status === "DRAFT";
  const canClose = po.status === "PARTIAL" || po.status === "RECEIVED";
  const canCancel = po.status === "DRAFT" || po.status === "SENT" || po.status === "PARTIAL";

  if (!canApprove && !canClose && !canCancel) return null;

  function handleApprove(): void {
    approveMutation.mutate(undefined, {
      onSuccess: () => toast.success(`PO ${po.poNumber} approved`),
      onError: (err) => toast.error(err.message),
    });
  }

  function handleClose(): void {
    closeMutation.mutate(undefined, {
      onSuccess: () => toast.success(`PO ${po.poNumber} closed`),
      onError: (err) => toast.error(err.message),
    });
  }

  function handleCancelConfirm(): void {
    cancelMutation.mutate(
      cancelReason.trim() ? { reason: cancelReason.trim() } : undefined,
      {
        onSuccess: () => { setShowCancel(false); toast.success(`PO ${po.poNumber} cancelled`); },
        onError: (err) => toast.error(err.message),
      },
    );
  }

  function handleOpenCancel(): void { setShowCancel(true); }

  function handleCancelDialogChange(open: boolean): void {
    if (!open) setCancelReason("");
    setShowCancel(open);
  }

  function handleReasonChange(e: ChangeEvent<HTMLTextAreaElement>): void {
    setCancelReason(e.target.value);
  }

  const isPending = approveMutation.isPending || closeMutation.isPending || cancelMutation.isPending;

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm" className="h-6 w-6 p-0" disabled={isPending}>
            <MoreHorizontal className="h-3.5 w-3.5" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="text-xs">
          {canApprove && (
            <DropdownMenuItem onSelect={handleApprove} disabled={approveMutation.isPending}>
              Approve
            </DropdownMenuItem>
          )}
          {canClose && (
            <DropdownMenuItem onSelect={handleClose} disabled={closeMutation.isPending}>
              Close
            </DropdownMenuItem>
          )}
          {(canApprove || canClose) && canCancel && <DropdownMenuSeparator />}
          {canCancel && (
            <DropdownMenuItem onSelect={handleOpenCancel} className="text-red-600">
              Cancel
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <AlertDialog open={showCancel} onOpenChange={handleCancelDialogChange}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel {po.poNumber}?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <Textarea
            value={cancelReason}
            onChange={handleReasonChange}
            placeholder="Reason (optional)"
            className="text-sm min-h-[72px] resize-none mt-2"
          />
          <AlertDialogFooter>
            <AlertDialogCancel>Back</AlertDialogCancel>
            <Button
              size="sm"
              variant="destructive"
              disabled={cancelMutation.isPending}
              onClick={handleCancelConfirm}
            >
              {cancelMutation.isPending ? "Cancelling…" : "Cancel PO"}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

export default function PurchaseOrdersListPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();
  const [search, setSearch] = useState<string>("");

  const statusParam = searchParams.get("status") ?? "all";
  const vendorParam = searchParams.get("vendor") ?? "all";
  const page = Math.max(1, Number(searchParams.get("page") ?? "1"));

  const resolvedStatus = VALID_STATUSES.has(statusParam)
    ? (statusParam as PurchaseOrderStatus)
    : undefined;
  const resolvedVendorId = vendorParam !== "all" ? Number(vendorParam) : undefined;

  function updateParams(updates: Record<string, string>): void {
    const params = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(updates)) {
      if (value === "all" || value === "" || (key === "page" && value === "1")) {
        params.delete(key);
      } else {
        params.set(key, value);
      }
    }
    startTransition(() => {
      router.replace(`?${params.toString()}`, { scroll: false });
    });
  }

  function handleStatusChange(value: string): void {
    updateParams({ status: value, page: "1" });
  }

  function handleVendorChange(value: string): void {
    updateParams({ vendor: value, page: "1" });
  }

  function handleSearchChange(e: React.ChangeEvent<HTMLInputElement>): void {
    setSearch(e.target.value);
  }

  function handlePageChange(nextPage: number): void {
    updateParams({ page: String(nextPage) });
  }

  function handleClearFilters(): void {
    setSearch("");
    updateParams({ status: "all", vendor: "all", page: "1" });
  }

  const vendorsQuery = useVendors({ isActive: true, limit: 200 });
  const query = usePurchaseOrders({
    page,
    pageSize: 50,
    status: resolvedStatus,
    vendorId: resolvedVendorId,
  });

  const allItems = query.data?.items ?? [];
  const vendors = vendorsQuery.data?.items ?? [];
  const total = query.data?.total ?? 0;
  const totalPages = query.data?.totalPages ?? 1;

  const filteredItems = search.trim()
    ? allItems.filter(
        (po) =>
          po.poNumber.toLowerCase().includes(search.toLowerCase()) ||
          (po.vendor?.name ?? "").toLowerCase().includes(search.toLowerCase()),
      )
    : allItems;

  const hasFilters = statusParam !== "all" || vendorParam !== "all" || search.length > 0;

  function handleRetry(): void {
    void query.refetch();
  }

  const columns: DataTableColumn<PurchaseOrderSummary>[] = [
    {
      key: "poNumber",
      header: "PO #",
      cell: (po) => (
        <Link
          href={`/inventory/purchase-orders/${po.id}`}
          className="font-mono text-[11px] text-blue-600 hover:underline transition-colors"
        >
          {po.poNumber}
        </Link>
      ),
      sortable: true,
      sortValue: (po) => po.poNumber,
    },
    {
      key: "vendor",
      header: "Vendor",
      cell: (po) => po.vendor?.name ?? "—",
    },
    {
      key: "orderDate",
      header: "Order Date",
      cell: (po) => (
        <span className="font-mono tabular-nums">{formatDate(po.orderDate)}</span>
      ),
    },
    {
      key: "expectedDeliveryDate",
      header: "Expected Delivery",
      headerClassName: "hidden md:table-cell",
      className: "hidden md:table-cell",
      cell: (po) => (
        <span className="font-mono tabular-nums">{formatDate(po.expectedDeliveryDate)}</span>
      ),
    },
    {
      key: "total",
      header: "Total",
      cell: (po) => (
        <span className="font-mono tabular-nums">
          {po.currency} {Number(po.total).toFixed(2)}
        </span>
      ),
      className: "text-right font-mono tabular-nums",
      headerClassName: "text-right",
      sortable: true,
      sortValue: (po) => Number(po.total),
    },
    {
      key: "status",
      header: "Status",
      cell: (po) => <StatusBadge status={po.status} />,
    },
    {
      key: "actions",
      header: "",
      cell: (po) => <PoRowActions po={po} />,
      className: "w-8",
    },
  ];

  const filterBar = (
    <div className="flex w-full min-w-0 flex-nowrap items-center gap-2 lg:gap-3">
      <div className="relative min-w-0 flex-1 lg:max-w-md">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
        <Input
          value={search}
          onChange={handleSearchChange}
          placeholder="Search PO number or vendor…"
          className="h-8 w-full min-w-0 pl-8 text-xs"
        />
      </div>
      <div className="hidden min-w-0 flex-[2] flex-row flex-nowrap items-center gap-2 sm:flex lg:gap-3">
        <Select value={statusParam} onValueChange={handleStatusChange}>
          <SelectTrigger className="h-8 min-w-0 flex-1 text-xs">
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
        <Select value={vendorParam} onValueChange={handleVendorChange}>
          <SelectTrigger className="h-8 min-w-0 flex-1 text-xs">
            <SelectValue placeholder="All vendors" />
          </SelectTrigger>
          <SelectContent className="max-h-72">
            <SelectItem value="all">All vendors</SelectItem>
            {vendors.map((v) => (
              <SelectItem key={v.id} value={String(v.id)}>
                {v.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );

  return (
    <PageWrapper
      eyebrow="Inventory"
      title="Purchase Orders"
      subtitle={query.data ? `${total} ${total === 1 ? "order" : "orders"}` : undefined}
      actions={
        <Button asChild size="sm">
          <Link href="/inventory/purchase-orders/new">
            <Plus className="h-3.5 w-3.5 mr-1" />
            New PO
          </Link>
        </Button>
      }
      filters={filterBar}
    >
      <DataTable
        data={filteredItems}
        columns={columns}
        getRowKey={(po) => po.id}
        isLoading={query.isLoading}
        emptyState={
          query.error ? (
            <ErrorState description={query.error.message} onRetry={handleRetry} compact />
          ) : (
            <EmptyState
              title={hasFilters ? "No orders found" : "No purchase orders"}
              description={
                hasFilters
                  ? "No results match your filters."
                  : "Create a PO to start ordering from your suppliers."
              }
              action={
                hasFilters
                  ? { label: "Clear filters", onClick: handleClearFilters }
                  : { label: "New PO", href: "/inventory/purchase-orders/new" }
              }
              compact
            />
          )
        }
        pagination={
          totalPages > 1
            ? {
                mode: "server",
                page,
                pageSize: 50,
                total,
                onPageChange: handlePageChange,
              }
            : undefined
        }
        minWidth="640px"
        className="min-h-[320px]"
      />
    </PageWrapper>
  );
}
