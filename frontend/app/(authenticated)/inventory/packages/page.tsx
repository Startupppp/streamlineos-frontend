"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { PlusIcon } from "@animateicons/react/lucide";
import { AnimatedIconButton } from "@/components/ui/animated-icon-button";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { getErrorMessage } from "@/lib/get-error-message";
import { EmptyOrdersIllustration } from "@/components/illustrations";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { InventoryEmptyState } from "@/features/inventory/components/inventory-empty-state";
import { FILTER_SELECT_TRIGGER } from "@/components/ui/content-fill-panel";
import { ErrorState, NoPermissionState } from "@/components/shared";
import { PackageDetailSheet } from "@/features/inventory/components/shipping/package-detail-sheet";
import { PackageCreateDialog } from "@/features/inventory/components/shipping/package-create-dialog";
import {
  PACKAGE_STATUS_BADGE,
  PACKAGE_STATUS_LABEL,
  type PackageStatus,
} from "@/features/inventory/lib";
import { usePackages, type Package } from "@/hooks/api/inventory/shipping";
import { useCan } from "@/hooks/api/access";

const PAGE_LIMIT = 20;

function formatDate(value: string): string {
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? value : d.toLocaleDateString();
}

function PackagesPageInner() {
  const canView = useCan("inventory:packages:manage");
  const router = useRouter();
  const searchParams = useSearchParams();
  const [detailOpen, setDetailOpen] = useState<boolean>(false);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [createOpen, setCreateOpen] = useState<boolean>(false);

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
    setCreateOpen(true);
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
      header: "Package",
      cell: (pkg) =>
        pkg.shipmentId
          ? `Pkg · Shipment ${pkg.shipmentId}`
          : format(new Date(pkg.createdAt), "dd MMM yyyy"),
    },
    {
      key: "status",
      header: "Status",
      cell: (pkg) => (
        <Badge
          variant="outline"
          className={cn("h-4 text-micro px-1.5 py-0 border", PACKAGE_STATUS_BADGE[pkg.status])}
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
        <SelectTrigger className={cn(FILTER_SELECT_TRIGGER, "min-w-0 w-[160px] text-xs")}>
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

  if (!canView)
    return (
      <PageWrapper
        title="Packages"
        subtitle="Manage shipping packages"
      >
        <NoPermissionState permission="inventory:packages:manage" className="flex-1" />
      </PageWrapper>
    );

  return (
    <>
      <PageWrapper
        title="Packages"
        subtitle="Manage shipping packages"
        actions={
          <AnimatedIconButton icon={PlusIcon} iconSize={14} iconClassName="mr-1.5" size="sm" onClick={handleNewPackage}>
            New Package
          </AnimatedIconButton>
        }
        filters={filtersRow}
      >
        <div className="flex flex-1 min-h-0 flex-col gap-4">
          {packagesQuery.error ? (
            <ErrorState
              title="Failed to load packages"
              description={getErrorMessage(packagesQuery.error)}
              onRetry={handleRetry}
            />
          ) : (
            <DataTable
              data={items}
              columns={columns}
              className="flex-1 min-h-0"
              getRowKey={(pkg) => pkg.id}
              isLoading={packagesQuery.isLoading}
              onRowClick={handleRowClick}
              emptyState={
                <InventoryEmptyState
                  illustration={<EmptyOrdersIllustration />}
                  title="No packages yet"
                  description="Create a package to start organising shipments."
                  action={{ label: "New Package", onClick: handleNewPackage }}
                  className="border-0 bg-transparent"
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
        </div>
      </PageWrapper>

      <PackageDetailSheet
        open={detailOpen}
        onOpenChange={setDetailOpen}
        packageId={selectedId}
      />

      <PackageCreateDialog open={createOpen} onOpenChange={setCreateOpen} />
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
