"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { EmptyOrdersIllustration } from "@/components/illustrations";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { InventoryEmptyState } from "@/features/inventory/components/inventory-empty-state";
import { ErrorState, AppDialog } from "@/components/shared";
import { PackageDetailSheet } from "@/features/inventory/components/shipping/package-detail-sheet";
import {
  PACKAGE_STATUS_BADGE,
  PACKAGE_STATUS_LABEL,
  type PackageStatus,
} from "@/features/inventory/lib";
import { usePackages, useCreatePackage, type Package } from "@/hooks/api/inventory/shipping";
import { toast } from "sonner";

const PAGE_LIMIT = 20;

function formatDate(value: string): string {
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? value : d.toLocaleDateString();
}

function PackagesPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [detailOpen, setDetailOpen] = useState<boolean>(false);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [createOpen, setCreateOpen] = useState<boolean>(false);
  const [newShipmentId, setNewShipmentId] = useState<string>("");

  const statusParam = searchParams.get("status") ?? "";
  const page = Math.max(1, Number(searchParams.get("page") ?? "1"));

  function updateParams(updates: Record<string, string | null>): void {
    const params = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(updates)) {
      if (!value) {
        params.delete(key);
      } else {
        params.set(key, value);
      }
    }
    params.delete("page");
    router.replace(`?${params.toString()}`, { scroll: false });
  }

  function handleStatusChange(value: string): void {
    updateParams({ status: value === "all" ? null : value });
  }

  function handlePageChange(nextPage: number): void {
    const params = new URLSearchParams(searchParams.toString());
    if (nextPage <= 1) {
      params.delete("page");
    } else {
      params.set("page", String(nextPage));
    }
    router.replace(`?${params.toString()}`, { scroll: false });
  }

  function handleRowClick(pkg: Package): void {
    setSelectedId(pkg.id);
    setDetailOpen(true);
  }

  function handleNewPackage(): void {
    setNewShipmentId("");
    setCreateOpen(true);
  }

  function handleCreateClose(): void {
    setCreateOpen(false);
    setNewShipmentId("");
  }

  function handleShipmentIdChange(e: React.ChangeEvent<HTMLInputElement>): void {
    setNewShipmentId(e.target.value);
  }

  const createMutation = useCreatePackage();

  async function handleCreateSubmit(): Promise<void> {
    const shipmentId = newShipmentId ? Number(newShipmentId) : undefined;
    try {
      await createMutation.mutateAsync({ shipmentId });
      toast.success("Package created");
      handleCreateClose();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to create package");
    }
  }

  const statusFilter = (statusParam in PACKAGE_STATUS_BADGE ? statusParam as PackageStatus : undefined);

  const packagesQuery = usePackages({
    status: statusFilter,
    page,
    limit: PAGE_LIMIT,
  });

  const items = packagesQuery.data?.items ?? [];
  const total = packagesQuery.data?.total ?? 0;

  function handleRetry(): void {
    void packagesQuery.refetch();
  }

  const columns: DataTableColumn<Package>[] = [
    {
      key: "id",
      header: "Package ID",
      cell: (pkg) => (
        <span className="font-mono tabular-nums text-muted-foreground">#{pkg.id}</span>
      ),
    },
    {
      key: "status",
      header: "Status",
      cell: (pkg) => (
        <Badge
          variant="outline"
          className={cn("h-4 text-[9px] px-1.5 py-0 border", PACKAGE_STATUS_BADGE[pkg.status])}
        >
          {PACKAGE_STATUS_LABEL[pkg.status]}
        </Badge>
      ),
    },
    {
      key: "shipmentId",
      header: "Shipment",
      cell: (pkg) =>
        pkg.shipmentId ? (
          <span className="font-mono tabular-nums">#{pkg.shipmentId}</span>
        ) : (
          <span className="text-muted-foreground">—</span>
        ),
    },
    {
      key: "lines",
      header: "Lines",
      cell: (pkg) => (
        <span className="tabular-nums">{pkg.lines?.length ?? 0}</span>
      ),
    },
    {
      key: "createdAt",
      header: "Created",
      cell: (pkg) => (
        <span className="tabular-nums text-muted-foreground">{formatDate(pkg.createdAt)}</span>
      ),
    },
  ];

  const filtersRow = (
    <div className="flex w-full min-w-0 flex-nowrap items-center gap-2">
      <Select value={statusParam || "all"} onValueChange={handleStatusChange}>
        <SelectTrigger className="h-8 min-w-0 w-[160px] text-xs">
          <SelectValue placeholder="All statuses" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All statuses</SelectItem>
          <SelectItem value="OPEN">Open</SelectItem>
          <SelectItem value="CLOSED">Closed</SelectItem>
          <SelectItem value="SHIPPED">Shipped</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );

  return (
    <>
      <PageWrapper
        eyebrow="Inventory · Shipping"
        title="Packages"
        subtitle={total > 0 ? `${total} ${total === 1 ? "package" : "packages"}` : "Manage shipping packages"}
        actions={
          <Button size="sm" onClick={handleNewPackage}>
            <Plus className="mr-1.5 h-3.5 w-3.5" />
            New Package
          </Button>
        }
        filters={filtersRow}
      >
        {packagesQuery.error ? (
          <ErrorState
            title="Failed to load packages"
            description={packagesQuery.error.message}
            onRetry={handleRetry}
            className="min-h-[40vh]"
          />
        ) : (
          <DataTable
            data={items}
            columns={columns}
            getRowKey={(pkg) => pkg.id}
            isLoading={packagesQuery.isLoading}
            onRowClick={handleRowClick}
            emptyState={
              <InventoryEmptyState
                illustration={<EmptyOrdersIllustration />}
                title="No packages yet"
                description="Create a package to start organising shipments."
                action={{ label: "New Package", onClick: handleNewPackage }}
                className="border-0 bg-transparent min-h-[40vh]"
              />
            }
            pagination={{
              mode: "server",
              page,
              pageSize: PAGE_LIMIT,
              total,
              onPageChange: handlePageChange,
            }}
            minWidth="540px"
          />
        )}
      </PageWrapper>

      <PackageDetailSheet
        open={detailOpen}
        onOpenChange={setDetailOpen}
        packageId={selectedId}
      />

      <AppDialog
        open={createOpen}
        onOpenChange={handleCreateClose}
        title="New Package"
        description="Create an empty package. You can add lines after creation."
        footer={
          <div className="grid grid-cols-2 gap-2 w-full">
            <Button variant="outline" size="sm" onClick={handleCreateClose}>
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleCreateSubmit}
              disabled={createMutation.isPending}
            >
              {createMutation.isPending ? "Creating…" : "Create"}
            </Button>
          </div>
        }
      >
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="new-pkg-shipment" className="text-xs">Shipment ID (optional)</Label>
            <Input
              id="new-pkg-shipment"
              type="number"
              min="1"
              placeholder="Leave blank if unassigned"
              value={newShipmentId}
              onChange={handleShipmentIdChange}
              className="h-8 text-sm"
            />
          </div>
        </div>
      </AppDialog>
    </>
  );
}

export default function PackagesPage() {
  return (
    <Suspense>
      <PackagesPageInner />
    </Suspense>
  );
}
