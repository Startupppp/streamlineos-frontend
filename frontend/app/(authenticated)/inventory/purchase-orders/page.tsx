"use client";

import { memo, useState, type ChangeEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Store } from "lucide-react";
import { EllipsisIcon, PlusIcon } from "@animateicons/react/lucide";
import { AnimatedIconButton } from "@/components/ui/animated-icon-button";
import { useAnimatedIcon } from "@/hooks/common/use-animated-icon";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { FILTER_SELECT_TRIGGER } from "@/components/ui/content-fill-panel";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SearchInput } from "@/components/ui/search-input";
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
import { getErrorMessage } from "@/lib/get-error-message";
import { formatShortDate } from "@/lib/date-utils";
import { InventoryEmptyState } from "@/features/inventory/components/inventory-empty-state";
import { EmptyOrdersIllustration, EmptySearchIllustration } from "@/components/illustrations";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { usePurchaseOrders, useVendors } from "@/hooks/api/inventory";
import {
  useApprovePurchaseOrder,
  useClosePurchaseOrder,
  useCancelPurchaseOrder,
} from "@/hooks/api/inventory/purchase-orders";
import {
  useListFilterParams,
  type ListFilterSpec,
} from "@/features/shared/list-view";
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
  DRAFT: "bg-muted text-muted-foreground border-border",
  SENT: "bg-status-info-surface text-status-info-ink border-status-info-rule",
  PARTIAL: "bg-status-warning-surface text-status-warning-ink border-status-warning-rule",
  RECEIVED: "bg-status-success-surface text-status-success-ink border-status-success-rule",
  CLOSED: "bg-muted text-muted-foreground border-border",
  CANCELLED: "bg-status-danger-surface text-status-danger-ink border-status-danger-rule",
};

const VALID_STATUSES = new Set<string>([
  "DRAFT", "SENT", "PARTIAL", "RECEIVED", "CLOSED", "CANCELLED",
]);

function StatusBadge({ status }: { status: PurchaseOrderStatus }) {
  return (
    <Badge variant="outline" className={cn("h-4 text-micro px-1.5 py-0", STATUS_BADGE[status])}>
      {status}
    </Badge>
  );
}

const PoRowActions = memo(function PoRowActions({ po }: { po: PurchaseOrderSummary }) {
  const [showCancel, setShowCancel] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const approveMutation = useApprovePurchaseOrder(po.id);
  const closeMutation = useClosePurchaseOrder(po.id);
  const cancelMutation = useCancelPurchaseOrder(po.id);

  const canApprove = po.status === "DRAFT";
  const canClose = po.status === "PARTIAL" || po.status === "RECEIVED";
  const canCancel = po.status === "DRAFT" || po.status === "SENT" || po.status === "PARTIAL";

  function handleApprove(): void {
    approveMutation.mutate(undefined, {
      onSuccess: () => toast.success(`PO ${po.poNumber} approved`),
      onError: (err) => toast.error(getErrorMessage(err)),
    });
  }

  function handleClose(): void {
    closeMutation.mutate(undefined, {
      onSuccess: () => toast.success(`PO ${po.poNumber} closed`),
      onError: (err) => toast.error(getErrorMessage(err)),
    });
  }

  function handleCancelConfirm(): void {
    cancelMutation.mutate(
      cancelReason.trim() ? { reason: cancelReason.trim() } : undefined,
      {
        onSuccess: () => { setShowCancel(false); toast.success(`PO ${po.poNumber} cancelled`); },
        onError: (err) => toast.error(getErrorMessage(err)),
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
          <AnimatedIconButton icon={EllipsisIcon} variant="ghost" size="sm" className="h-6 w-6 p-0" disabled={isPending} aria-label="Order actions" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="text-xs">
          <DropdownMenuItem asChild>
            <Link href={`/inventory/purchase-orders/${po.id}`}>View details</Link>
          </DropdownMenuItem>
          {(canApprove || canClose || canCancel) && <DropdownMenuSeparator />}
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
            <DropdownMenuItem variant="destructive" onSelect={handleOpenCancel}>
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
});

const columns: DataTableColumn<PurchaseOrderSummary>[] = [
  {
    key: "poNumber",
    header: "PO #",
    cell: (po) => (
      <div onClick={(e) => e.stopPropagation()}>
        <Link
          href={`/inventory/purchase-orders/${po.id}`}
          className="font-mono text-dense text-primary hover:underline transition-colors"
        >
          {po.poNumber}
        </Link>
      </div>
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
      <span className="font-mono tabular-nums">{formatShortDate(po.orderDate) || "—"}</span>
    ),
  },
  {
    key: "expectedDeliveryDate",
    header: "Expected Delivery",
    headerClassName: "hidden md:table-cell",
    className: "hidden md:table-cell",
    cell: (po) => (
      <span className="font-mono tabular-nums">{formatShortDate(po.expectedDeliveryDate) || "—"}</span>
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
    cell: (po) => (
      <div onClick={(e) => e.stopPropagation()}>
        <PoRowActions po={po} />
      </div>
    ),
    className: "w-8",
  },
];

function NewPoButton({ disabled }: { disabled: boolean }) {
  const { iconRef, hoverHandlers } = useAnimatedIcon();
  return (
    <Button asChild size="sm" disabled={disabled}>
      <Link href="/inventory/purchase-orders/new" {...hoverHandlers}>
        <PlusIcon ref={iconRef} size={14} className="mr-1" aria-hidden="true" />
        New PO
      </Link>
    </Button>
  );
}

const PURCHASE_ORDER_FILTERS: ListFilterSpec = {
  categories: [
    { key: "status", label: "Status", arity: "single", params: ["status"] },
    { key: "vendor", label: "Vendor", arity: "single", params: ["vendor"] },
  ],
};

const ALL = "all";

export default function PurchaseOrdersListPage() {
  const router = useRouter();
  const filters = useListFilterParams(PURCHASE_ORDER_FILTERS);

  const statusParam = filters.values["status"]?.[0] || ALL;
  const vendorParam = filters.values["vendor"]?.[0] || ALL;
  const page = filters.page;

  const resolvedStatus = VALID_STATUSES.has(statusParam)
    ? (statusParam as PurchaseOrderStatus)
    : undefined;
  const resolvedVendorId = vendorParam !== ALL ? Number(vendorParam) : undefined;

  function selectCategory(categoryKey: string, value: string): void {
    if (value === ALL) filters.clearCategory(categoryKey);
    else filters.setAt(categoryKey, 0, value);
  }

  function handleStatusChange(value: string): void {
    selectCategory("status", value);
  }

  function handleVendorChange(value: string): void {
    selectCategory("vendor", value);
  }

  function handleClearFilters(): void {
    filters.setSearch("");
    filters.clearAll();
  }

  const vendorsQuery = useVendors({ isActive: true, limit: 100 });
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
  const hasNoVendors = !vendorsQuery.isLoading && vendors.length === 0;

  const search = filters.search;
  const filteredItems = search.trim()
    ? allItems.filter(
        (po) =>
          po.poNumber.toLowerCase().includes(search.toLowerCase()) ||
          (po.vendor?.name ?? "").toLowerCase().includes(search.toLowerCase()),
      )
    : allItems;

  const hasFilters = filters.activeFilterCount > 0 || search.length > 0;

  function handleRetry(): void {
    void query.refetch();
  }

  function handleRowClick(po: PurchaseOrderSummary): void {
    router.push(`/inventory/purchase-orders/${po.id}`);
  }

  const filterBar = (
    <div className="flex w-full min-w-0 flex-nowrap items-center gap-2 overflow-x-auto scrollbar-hide lg:gap-3 [&>*]:shrink-0">
        <SearchInput
          value={filters.localSearch}
          onValueChange={filters.setSearch}
          placeholder="Search PO number or vendor…"
        />
      <div className="hidden min-w-0 flex-row flex-nowrap items-center gap-2 overflow-x-auto scrollbar-hide sm:flex lg:gap-3 [&>*]:shrink-0">
        <Select value={statusParam} onValueChange={handleStatusChange}>
          <SelectTrigger className={cn(FILTER_SELECT_TRIGGER, "min-w-0 flex-1 text-xs")}>
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
          <SelectTrigger className={cn(FILTER_SELECT_TRIGGER, "min-w-0 flex-1 text-xs")}>
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
      title="Purchase Orders"
      subtitle="Track and manage orders sent to your suppliers."
      actions={<NewPoButton disabled={hasNoVendors} />}
      filters={filterBar}
    >
      <div className="flex flex-1 min-h-0 flex-col gap-4">
        {hasNoVendors && (
          <div className="flex items-start gap-3 rounded-lg border border-status-warning-rule bg-status-warning-surface px-4 py-3 text-sm text-status-warning-ink">
            <Store className="mt-0.5 h-4 w-4 shrink-0 text-status-warning-ink" />
            <div>
              <p className="font-medium">No vendors configured</p>
              <p className="text-status-warning-ink">
                You need at least one vendor before creating a purchase order.{" "}
                <Link href="/inventory/vendors/new" className="underline underline-offset-2 font-medium">
                  Create a vendor
                </Link>
              </p>
            </div>
          </div>
        )}
        <DataTable
          data={filteredItems}
          columns={columns}
          className="flex-1 min-h-0"
          getRowKey={(po) => po.id}
          onRowClick={handleRowClick}
          isLoading={query.isLoading}
          emptyState={
            query.error ? (
              <ErrorState description={getErrorMessage(query.error)} onRetry={handleRetry} compact />
            ) : (
              <InventoryEmptyState
                illustration={
                  hasFilters ? <EmptySearchIllustration /> : <EmptyOrdersIllustration />
                }
                title={hasFilters ? "No orders found" : "No purchase orders yet"}
                description={
                  hasFilters
                    ? "No results match your current filters."
                    : "Create your first purchase order to start ordering from suppliers. Workflow: Create Vendor → New PO → Receive Stock."
                }
                action={
                  hasFilters
                    ? { label: "Clear filters", onClick: handleClearFilters }
                    : hasNoVendors
                      ? { label: "Create a vendor first", href: "/inventory/vendors/new" }
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
                  onPageChange: filters.setPage,
                }
              : undefined
          }
          minWidth="640px"
        />
      </div>
    </PageWrapper>
  );
}
