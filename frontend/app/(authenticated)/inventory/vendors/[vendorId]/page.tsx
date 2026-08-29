"use client";

import { use, useState } from "react";
import Link from "next/link";
import { Pencil } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { getErrorMessage } from "@/lib/get-error-message";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { LoadingState, ErrorState, NoPermissionState } from "@/components/shared";
import { EditVendorSheet } from "@/features/inventory/components/edit-vendor-sheet";
import { VendorAiActions } from "@/features/inventory/components/vendor-ai-actions";
import { VendorScorecardPanel } from "@/features/inventory/components/vendor-scorecard-panel";
import { VendorDeliveriesTable } from "@/features/inventory/components/vendor-deliveries-table";
import { useVendor } from "@/hooks/api/inventory";
import {
  useVendorPerformance,
  useVendorDeliveries,
  useToggleVendorActive,
} from "@/hooks/api/inventory/vendors";
import { useCan } from "@/hooks/api/access";

interface VendorDetailPageProps {
  params: Promise<{ vendorId: string }>;
}

const DELIVERIES_PAGE_SIZE = 10;

export default function VendorDetailPage({ params }: VendorDetailPageProps) {
  const { vendorId } = use(params);
  const id = parseInt(vendorId, 10);
  const canView = useCan("inventory:vendors:read");
  const [editOpen, setEditOpen] = useState<boolean>(false);
  const [deliveriesPage, setDeliveriesPage] = useState<number>(1);

  const vendorQuery = useVendor(id);
  const scorecardQuery = useVendorPerformance(id);
  const deliveriesQuery = useVendorDeliveries(id, {
    page: deliveriesPage,
    limit: DELIVERIES_PAGE_SIZE,
  });
  const toggleMutation = useToggleVendorActive(id);

  function handleVendorRetry(): void {
    void vendorQuery.refetch();
  }

  function handleScorecardRetry(): void {
    void scorecardQuery.refetch();
  }

  function handleDeliveriesRetry(): void {
    void deliveriesQuery.refetch();
  }

  function handleEditOpen(): void {
    setEditOpen(true);
  }

  // Denial and absence are different answers. Without this a reader who may not
  // see vendors is told the vendor does not exist, because the gated query
  // never fired.
  if (!canView) return <NoPermissionState permission="inventory:vendors:read" className="flex-1" />;
  if (vendorQuery.isLoading) return <LoadingState variant="form" />;
  if (vendorQuery.error) return <ErrorState description={getErrorMessage(vendorQuery.error)} onRetry={handleVendorRetry} />;
  if (!vendorQuery.data) return <ErrorState title="Not found" description={`Vendor #${vendorId}`} />;

  const vendor = vendorQuery.data;

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
            <VendorScorecardPanel
              scorecard={scorecardQuery.data}
              isLoading={scorecardQuery.isLoading}
              error={scorecardQuery.error}
              onRetry={handleScorecardRetry}
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-semibold text-foreground">Deliveries</h2>
                <p className="text-dense text-muted-foreground">
                  Every purchase order the rates above were computed from.
                </p>
              </div>
              <Button size="sm" asChild>
                <Link href={`/inventory/purchase-orders/new?vendorId=${vendor.id}`}>
                  New PO
                </Link>
              </Button>
            </div>

            <VendorDeliveriesTable
              vendorId={vendor.id}
              items={deliveriesQuery.data?.items ?? []}
              total={deliveriesQuery.data?.total ?? 0}
              page={deliveriesPage}
              pageSize={DELIVERIES_PAGE_SIZE}
              isLoading={deliveriesQuery.isLoading}
              error={deliveriesQuery.error}
              onPageChange={setDeliveriesPage}
              onRetry={handleDeliveriesRetry}
            />
          </div>
        </div>
      </PageWrapper>

      <EditVendorSheet vendor={vendor} open={editOpen} onOpenChange={setEditOpen} />
    </>
  );
}
