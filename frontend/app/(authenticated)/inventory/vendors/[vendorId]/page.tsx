"use client";

import { use, useState } from "react";
import Link from "next/link";
import { Pencil, Package, CheckCircle2, RotateCcw, Clock, FileText, DollarSign } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { getErrorMessage } from "@/lib/get-error-message";
import { formatShortDate } from "@/lib/date-utils";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { StatCard, StatCardGrid } from "@/components/ui/stat-card";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { LoadingState, ErrorState } from "@/components/shared";
import { InventoryEmptyState } from "@/features/inventory/components/inventory-empty-state";
import { EditVendorSheet } from "@/features/inventory/components/edit-vendor-sheet";
import { VendorAiActions } from "@/features/inventory/components/vendor-ai-actions";
import { useVendor, useVendorPurchaseOrders } from "@/hooks/api/inventory";
import { useVendorPerformance, useToggleVendorActive } from "@/hooks/api/inventory/vendors";
import type { PurchaseOrderStatus } from "@/types/inventory";

interface VendorDetailPageProps {
  params: Promise<{ vendorId: string }>;
}

const STATUS_BADGE: Record<PurchaseOrderStatus, string> = {
  DRAFT: "bg-muted text-muted-foreground border-border",
  SENT: "bg-status-info-surface text-status-info-ink border-status-info-rule",
  PARTIAL: "bg-status-warning-surface text-status-warning-ink border-status-warning-rule",
  RECEIVED: "bg-status-success-surface text-status-success-ink border-status-success-rule",
  CLOSED: "bg-muted text-muted-foreground border-border",
  CANCELLED: "bg-status-danger-surface text-status-danger-ink border-status-danger-rule",
};

type VendorPoRow = {
  id: number;
  poNumber: string;
  orderDate: string | null;
  expectedDeliveryDate: string | null;
  total: string;
  currency: string;
  status: PurchaseOrderStatus;
};

const VENDOR_PO_COLUMNS: DataTableColumn<VendorPoRow>[] = [
  {
    key: "poNumber",
    header: "PO #",
    className: "font-mono",
    cell: (row) => (
      <Link
        href={`/inventory/purchase-orders/${row.id}`}
        className="text-primary hover:underline transition-colors"
        onClick={(e) => e.stopPropagation()}
      >
        {row.poNumber}
      </Link>
    ),
  },
  {
    key: "orderDate",
    header: "Order date",
    className: "font-mono tabular-nums",
    cell: (row) => <span>{formatShortDate(row.orderDate) || "—"}</span>,
  },
  {
    key: "expectedDeliveryDate",
    header: "Expected delivery",
    className: "font-mono tabular-nums",
    cell: (row) => <span>{formatShortDate(row.expectedDeliveryDate) || "—"}</span>,
  },
  {
    key: "total",
    header: "Total",
    headerClassName: "text-right",
    className: "text-right font-mono tabular-nums",
    cell: (row) => <span>{row.currency} {Number(row.total).toFixed(2)}</span>,
  },
  {
    key: "status",
    header: "Status",
    cell: (row) => (
      <Badge variant="outline" className={cn("h-4 text-micro px-1.5 py-0", STATUS_BADGE[row.status])}>
        {row.status}
      </Badge>
    ),
  },
];

export default function VendorDetailPage({ params }: VendorDetailPageProps) {
  const { vendorId } = use(params);
  const id = parseInt(vendorId, 10);
  const [editOpen, setEditOpen] = useState<boolean>(false);

  const vendorQuery = useVendor(id);
  const posQuery = useVendorPurchaseOrders(id);
  const perfQuery = useVendorPerformance(id);
  const toggleMutation = useToggleVendorActive(id);

  function handleVendorRetry(): void {
    void vendorQuery.refetch();
  }

  function handlePosRetry(): void {
    void posQuery.refetch();
  }

  function handleEditOpen(): void {
    setEditOpen(true);
  }

  if (vendorQuery.isLoading) return <LoadingState variant="form" />;
  if (vendorQuery.error) return <ErrorState description={getErrorMessage(vendorQuery.error)} onRetry={handleVendorRetry} />;
  if (!vendorQuery.data) return <ErrorState title="Not found" description={`Vendor #${vendorId}`} />;

  const vendor = vendorQuery.data;
  const poItems: VendorPoRow[] = posQuery.data?.items ?? [];

  function handleToggleActive(): void {
    toggleMutation.mutate(
      { id, isActive: !vendor.isActive },
      {
        onSuccess: () => toast.success(`Vendor ${vendor.isActive ? "deactivated" : "activated"}`),
        onError: (err: unknown) => toast.error(getErrorMessage(err)),
      },
    );
  }

  return (
    <>
      <PageWrapper
        title={vendor.name}
        subtitle={`${vendor.code} · ${vendor.currency}`}
        backHref="/inventory/vendors"
        actions={
          <div className="flex items-center gap-2">
            <VendorAiActions vendorId={id} vendorName={vendor.name} />
            <Button
              size="sm"
              variant="outline"
              onClick={handleToggleActive}
              disabled={toggleMutation.isPending}
              className={
                vendor.isActive
                  ? "text-destructive hover:text-destructive"
                  : "text-status-success-ink hover:text-status-success-ink"
              }
            >
              {vendor.isActive ? "Deactivate" : "Activate"}
            </Button>
            <Button size="sm" variant="outline" onClick={handleEditOpen}>
              <Pencil className="mr-1 h-3.5 w-3.5" />
              Edit
            </Button>
          </div>
        }
      >
        <div className="flex flex-1 min-h-0 flex-col gap-4">
          <Card className="p-4">
            <dl className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
              <dt className="text-muted-foreground">Status</dt>
              <dd>
                <Badge
                  variant="outline"
                  className={cn(
                    "h-4 text-micro px-1.5 py-0",
                    vendor.isActive
                      ? "bg-status-success-surface text-status-success-ink border-status-success-rule"
                      : "bg-muted text-muted-foreground border-border",
                  )}
                >
                  {vendor.isActive ? "Active" : "Inactive"}
                </Badge>
              </dd>
              <dt className="text-muted-foreground">Code</dt>
              <dd className="font-mono text-xs">{vendor.code}</dd>
              <dt className="text-muted-foreground">Email</dt>
              <dd>{vendor.email ?? "—"}</dd>
              <dt className="text-muted-foreground">Phone</dt>
              <dd>{vendor.phone ?? "—"}</dd>
              <dt className="text-muted-foreground">GSTIN</dt>
              <dd className="font-mono text-xs">{vendor.gstin ?? "—"}</dd>
              <dt className="text-muted-foreground">Currency</dt>
              <dd>{vendor.currency}</dd>
              <dt className="text-muted-foreground">Lead time</dt>
              <dd className="font-mono tabular-nums text-label">{vendor.leadTimeDays} days</dd>
              <dt className="text-muted-foreground">Payment terms</dt>
              <dd className="font-mono tabular-nums text-label">Net {vendor.paymentTermsDays}</dd>
              {vendor.address && (
                <>
                  <dt className="text-muted-foreground">Address</dt>
                  <dd className="col-span-3 whitespace-pre-line">{vendor.address}</dd>
                </>
              )}
              {vendor.notes && (
                <>
                  <dt className="text-muted-foreground">Notes</dt>
                  <dd className="col-span-3">{vendor.notes}</dd>
                </>
              )}
            </dl>
          </Card>

          <div className="space-y-2">
            <h2 className="text-sm font-semibold text-foreground">Performance</h2>
            <StatCardGrid cols={3}>
              <StatCard
                label="On-Time Delivery"
                value={perfQuery.data ? `${(perfQuery.data.onTimeRate * 100).toFixed(1)}%` : "—"}
                icon={CheckCircle2}
                tone={
                  perfQuery.data && perfQuery.data.onTimeRate >= 0.9
                    ? "emerald"
                    : perfQuery.data && perfQuery.data.onTimeRate >= 0.7
                      ? "amber"
                      : "red"
                }
                isLoading={perfQuery.isLoading}
              />
              <StatCard
                label="Fill Rate"
                value={perfQuery.data ? `${(perfQuery.data.fillRate * 100).toFixed(1)}%` : "—"}
                icon={Package}
                tone={perfQuery.data && perfQuery.data.fillRate >= 0.9 ? "emerald" : "amber"}
                isLoading={perfQuery.isLoading}
              />
              <StatCard
                label="Return Rate"
                value={perfQuery.data ? `${(perfQuery.data.returnRate * 100).toFixed(1)}%` : "—"}
                icon={RotateCcw}
                tone={perfQuery.data && perfQuery.data.returnRate <= 0.05 ? "emerald" : "amber"}
                isLoading={perfQuery.isLoading}
              />
              <StatCard
                label="Avg Lead Time"
                value={perfQuery.data ? `${perfQuery.data.avgLeadTimeDays} days` : "—"}
                icon={Clock}
                tone="default"
                isLoading={perfQuery.isLoading}
              />
              <StatCard
                label="Open POs"
                value={perfQuery.data?.openPoCount ?? 0}
                icon={FileText}
                tone="blue"
                isLoading={perfQuery.isLoading}
              />
              <StatCard
                label="Total Spend"
                value={
                  perfQuery.data
                    ? `$${Number(perfQuery.data.totalSpend).toLocaleString(undefined, {
                        minimumFractionDigits: 0,
                        maximumFractionDigits: 0,
                      })}`
                    : "—"
                }
                icon={DollarSign}
                tone="default"
                isLoading={perfQuery.isLoading}
              />
            </StatCardGrid>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-foreground">Purchase Orders</h2>
              <Button size="sm" asChild>
                <Link href={`/inventory/purchase-orders/new?vendorId=${vendor.id}`}>
                  New PO
                </Link>
              </Button>
            </div>

            {posQuery.error && (
              <ErrorState description={getErrorMessage(posQuery.error)} onRetry={handlePosRetry} compact />
            )}

            {!posQuery.error && poItems.length === 0 && !posQuery.isLoading && (
              <InventoryEmptyState
                illustrationPreset="inventory"
                title="No purchase orders"
                description="Create a purchase order for this vendor."
                action={{
                  label: "New PO",
                  href: `/inventory/purchase-orders/new?vendorId=${vendor.id}`,
                }}
                compact
              />
            )}

            {(poItems.length > 0 || posQuery.isLoading) && (
              <DataTable
                data={poItems}
                columns={VENDOR_PO_COLUMNS}
                getRowKey={(row) => row.id}
                isLoading={posQuery.isLoading}
                minWidth="640px"
              />
            )}
          </div>
        </div>
      </PageWrapper>

      <EditVendorSheet vendor={vendor} open={editOpen} onOpenChange={setEditOpen} />
    </>
  );
}
