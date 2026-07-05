"use client";

import { use, useState } from "react";
import Link from "next/link";
import { Pencil, Package, CheckCircle2, RotateCcw, Clock, FileText, DollarSign } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { getErrorMessage } from "@/lib/get-error-message";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { StatCard, StatCardGrid } from "@/components/ui/stat-card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { LoadingState, ErrorState } from "@/components/shared";
import { EmptyState } from "@/components/ui/empty-state";
import { EditVendorSheet } from "@/features/inventory/components/edit-vendor-sheet";
import { useVendor, useVendorPurchaseOrders } from "@/hooks/api/inventory";
import { useVendorPerformance, useToggleVendorActive } from "@/hooks/api/inventory/vendors";
import type { PurchaseOrderStatus } from "@/types/inventory";

interface VendorDetailPageProps {
  params: Promise<{ vendorId: string }>;
}

const STATUS_BADGE: Record<PurchaseOrderStatus, string> = {
  DRAFT: "bg-slate-100 text-slate-700 border-slate-200",
  SENT: "bg-blue-50 text-blue-700 border-blue-200",
  PARTIAL: "bg-amber-50 text-amber-700 border-amber-200",
  RECEIVED: "bg-emerald-50 text-emerald-700 border-emerald-200",
  CLOSED: "bg-slate-100 text-slate-700 border-slate-200",
  CANCELLED: "bg-red-50 text-red-700 border-red-200",
};

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
  if (vendorQuery.error) return <ErrorState description={vendorQuery.error.message} onRetry={handleVendorRetry} />;
  if (!vendorQuery.data) return <ErrorState title="Not found" description={`Vendor #${vendorId}`} />;

  const vendor = vendorQuery.data;
  const poItems = posQuery.data?.items ?? [];

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
        eyebrow="Inventory / Vendors"
        title={vendor.name}
        subtitle={`${vendor.code} · ${vendor.currency}`}
        backHref="/inventory/vendors"
        actions={
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={handleToggleActive}
              disabled={toggleMutation.isPending}
              className={
                vendor.isActive
                  ? "text-destructive hover:text-destructive"
                  : "text-emerald-600 hover:text-emerald-700"
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
        <div className="space-y-4">
          <Card className="p-4">
            <dl className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
              <dt className="text-muted-foreground">Status</dt>
              <dd>
                <Badge
                  variant="outline"
                  className={cn(
                    "h-4 text-[9px] px-1.5 py-0",
                    vendor.isActive
                      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                      : "bg-slate-100 text-slate-700 border-slate-200",
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
              <dd className="font-mono tabular-nums text-[13px]">{vendor.leadTimeDays} days</dd>
              <dt className="text-muted-foreground">Payment terms</dt>
              <dd className="font-mono tabular-nums text-[13px]">Net {vendor.paymentTermsDays}</dd>
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

            {posQuery.isLoading && <LoadingState variant="table" rows={4} />}
            {posQuery.error && (
              <ErrorState description={posQuery.error.message} onRetry={handlePosRetry} compact />
            )}

            {!posQuery.isLoading && !posQuery.error && poItems.length === 0 && (
              <EmptyState
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

            {poItems.length > 0 && (
              <Card className="overflow-x-auto">
                <Table className="min-w-[640px]">
                  <TableHeader className="sticky top-0 z-10 bg-muted/80 backdrop-blur-sm">
                    <TableRow className="border-b-2 border-border">
                      <TableHead className="text-[10px] uppercase tracking-wider font-bold px-2 py-1.5">
                        PO #
                      </TableHead>
                      <TableHead className="text-[10px] uppercase tracking-wider font-bold px-2 py-1.5">
                        Order date
                      </TableHead>
                      <TableHead className="text-[10px] uppercase tracking-wider font-bold px-2 py-1.5">
                        Expected delivery
                      </TableHead>
                      <TableHead className="text-[10px] uppercase tracking-wider font-bold px-2 py-1.5 text-right">
                        Total
                      </TableHead>
                      <TableHead className="text-[10px] uppercase tracking-wider font-bold px-2 py-1.5">
                        Status
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {poItems.map((po) => (
                      <TableRow key={po.id} className="h-8 hover:bg-muted/30 transition-colors">
                        <TableCell className="px-2 py-1 font-mono text-[11px]">
                          <Link
                            href={`/inventory/purchase-orders/${po.id}`}
                            className="text-blue-600 hover:underline transition-colors"
                          >
                            {po.poNumber}
                          </Link>
                        </TableCell>
                        <TableCell className="px-2 py-1 font-mono tabular-nums text-[11px]">
                          {formatDate(po.orderDate)}
                        </TableCell>
                        <TableCell className="px-2 py-1 font-mono tabular-nums text-[11px]">
                          {formatDate(po.expectedDeliveryDate)}
                        </TableCell>
                        <TableCell className="px-2 py-1 text-right font-mono tabular-nums text-[11px]">
                          {po.currency} {Number(po.total).toFixed(2)}
                        </TableCell>
                        <TableCell className="px-2 py-1">
                          <StatusBadge status={po.status} />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Card>
            )}
          </div>
        </div>
      </PageWrapper>

      <EditVendorSheet vendor={vendor} open={editOpen} onOpenChange={setEditOpen} />
    </>
  );
}
