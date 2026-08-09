"use client";

import { useState } from "react";
import Link from "next/link";
import { EyeIcon, PlusIcon } from "@animateicons/react/lucide";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/ui/loading-button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
  SheetBody,
} from "@/components/ui/sheet";
import { Label } from "@/components/ui/label";
import { DataTable, DataTableSkeleton, type DataTableColumn } from "@/components/ui/data-table";
import { ErrorState } from "@/components/shared";
import { InventoryEmptyState } from "@/features/inventory/components/inventory-empty-state";
import { EmptyWarehouseIllustration } from "@/components/illustrations";
import {
  useCycleCounts,
  useCreateCycleCount,
  type CycleCountListItem,
} from "@/hooks/api/inventory/counts";
import { useLocations } from "@/hooks/api/inventory/warehouses";
import { WarehouseSelect } from "@/components/inventory/warehouse-select";
import { useCategories } from "@/hooks/api/inventory/products";
import {
  CYCLE_COUNT_STATUS_BADGE,
  CYCLE_COUNT_STATUS_LABEL,
  type CycleCountStatus,
} from "@/features/inventory/lib/inventory-status";
import { useAnimatedIcon } from "@/hooks/common/use-animated-icon";
import { getErrorMessage } from "@/lib/get-error-message";
import { TruncatedText } from "@/components/ui/truncated-text";
import { FILTER_SELECT_TRIGGER } from "@/components/ui/content-fill-panel";
import { cn } from "@/lib/utils";

function ViewCountButton({ href }: { href: string }) {
  const { iconRef, hoverHandlers } = useAnimatedIcon();
  return (
    <Button variant="ghost" size="icon" className="w-7" asChild>
      <Link href={href} {...hoverHandlers}>
        <EyeIcon ref={iconRef} size={14} aria-hidden="true" />
      </Link>
    </Button>
  );
}

const STATUS_OPTIONS: CycleCountStatus[] = ["PLANNED", "COUNTING", "REVIEW", "POSTED", "CANCELLED"];
const PAGE_LIMIT = 20;

function StatusBadge({ status }: { status: CycleCountStatus }) {
  return (
    <Badge variant="outline" className={`text-[9px] h-4 px-1.5 py-0 ${CYCLE_COUNT_STATUS_BADGE[status]}`}>
      {CYCLE_COUNT_STATUS_LABEL[status]}
    </Badge>
  );
}

function NewCycleCountSheet({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const [warehouseId, setWarehouseId] = useState<string>("");
  const [locationId, setLocationId] = useState<string>("");
  const [categoryId, setCategoryId] = useState<string>("");

  const { data: locations = [] } = useLocations(warehouseId ? Number(warehouseId) : 0);
  const { data: categories = [] } = useCategories();
  const createMutation = useCreateCycleCount();

  function handleWarehouseChange(value: string): void {
    setWarehouseId(value === "none" ? "" : value);
    setLocationId("");
  }

  function handleLocationChange(value: string): void {
    setLocationId(value === "none" ? "" : value);
  }

  function handleCategoryChange(value: string): void {
    setCategoryId(value === "none" ? "" : value);
  }

  function handleClose(): void {
    setWarehouseId("");
    setLocationId("");
    setCategoryId("");
    onClose();
  }

  function handleSubmit(): void {
    if (!warehouseId) return;
    createMutation.mutate(
      {
        warehouseId: Number(warehouseId),
        locationId: locationId ? Number(locationId) : undefined,
        categoryId: categoryId ? Number(categoryId) : undefined,
      },
      { onSuccess: handleClose },
    );
  }

  return (
    <Sheet open={open} onOpenChange={(v) => { if (!v) handleClose(); }}>
      <SheetContent side="right" className="w-full sm:max-w-[480px] p-0 flex flex-col overflow-hidden">
        <SheetHeader className="bg-muted/40 p-6 pb-4 pr-12 border-b text-left">
          <SheetTitle>New Cycle Count</SheetTitle>
        </SheetHeader>
        <SheetBody className="space-y-4 px-6 py-4">
          <div className="space-y-1.5">
            <Label htmlFor="cc-warehouse" className="text-xs font-semibold text-foreground/80">Warehouse *</Label>
            <WarehouseSelect
              value={warehouseId}
              onChange={handleWarehouseChange}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="cc-location" className="text-xs font-semibold text-foreground/80">Location (optional)</Label>
            <Select
              value={locationId || "none"}
              onValueChange={handleLocationChange}
              disabled={!warehouseId}
            >
              <SelectTrigger id="cc-location" className="text-sm">
                <SelectValue placeholder="All locations" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">All locations</SelectItem>
                {locations.map((l) => (
                  <SelectItem key={l.id} value={String(l.id)}>{l.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="cc-category" className="text-xs font-semibold text-foreground/80">Category (optional)</Label>
            <Select value={categoryId || "none"} onValueChange={handleCategoryChange}>
              <SelectTrigger id="cc-category" className="text-sm">
                <SelectValue placeholder="All categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">All categories</SelectItem>
                {categories.map((c) => (
                  <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </SheetBody>
        <SheetFooter className="shrink-0 flex-row gap-2 border-t border-border bg-muted/30 px-6 py-4">
          <Button variant="outline" className="flex-1" onClick={handleClose} disabled={createMutation.isPending}>
            Cancel
          </Button>
          <LoadingButton
            className="flex-1"
            onClick={handleSubmit}
            disabled={!warehouseId}
            isPending={createMutation.isPending}
            loadingText="Creating…"
          >
            Create Count
          </LoadingButton>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

export function CycleCountsClient() {
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [page, setPage] = useState(1);
  const [sheetOpen, setSheetOpen] = useState(false);
  const { iconRef: plusRef, hoverHandlers: plusHandlers } = useAnimatedIcon();

  const { data, isLoading, error, refetch } = useCycleCounts({
    status: statusFilter === "all" ? undefined : statusFilter,
    page,
  });

  const items = data?.items ?? [];
  const total = data?.total ?? 0;

  function handleStatusChange(value: string): void {
    setStatusFilter(value);
    setPage(1);
  }

  function handlePageChange(nextPage: number): void {
    setPage(nextPage);
  }

  function handleRetry(): void {
    void refetch();
  }

  function handleOpenSheet(): void {
    setSheetOpen(true);
  }

  function handleCloseSheet(): void {
    setSheetOpen(false);
  }

  const columns: DataTableColumn<CycleCountListItem>[] = [
    {
      key: "countNumber",
      header: "#",
      headerClassName: "w-[120px]",
      className: "font-mono text-xs text-muted-foreground",
      cell: (row) => row.countNumber,
    },
    {
      key: "warehouse",
      header: "Warehouse",
      cell: (row) => <TruncatedText text={row.warehouseName} className="text-sm" />,
    },
    {
      key: "location",
      header: "Location",
      className: "text-muted-foreground",
      cell: (row) => <TruncatedText text={row.locationName ?? "—"} className="text-sm text-muted-foreground" />,
    },
    {
      key: "category",
      header: "Category",
      className: "text-muted-foreground",
      cell: (row) => <TruncatedText text={row.categoryName ?? "—"} className="text-sm text-muted-foreground" />,
    },
    {
      key: "lineCount",
      header: "Lines",
      headerClassName: "w-[70px] text-right",
      className: "text-right tabular-nums text-muted-foreground",
      cell: (row) => row.lineCount,
    },
    {
      key: "status",
      header: "Status",
      headerClassName: "w-[120px]",
      cell: (row) => <StatusBadge status={row.status} />,
    },
    {
      key: "createdAt",
      header: "Created",
      headerClassName: "w-[120px]",
      className: "text-muted-foreground text-xs tabular-nums",
      cell: (row) => new Date(row.createdAt).toLocaleDateString(),
    },
    {
      key: "actions",
      header: "",
      headerClassName: "w-[60px]",
      cell: (row) => (
        <ViewCountButton href={`/inventory/cycle-counts/${row.id}`} />
      ),
    },
  ];

  const filtersRow = (
    <Select value={statusFilter} onValueChange={handleStatusChange}>
      <SelectTrigger className={cn(FILTER_SELECT_TRIGGER, "w-[160px]")}>
        <SelectValue placeholder="All statuses" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">All statuses</SelectItem>
        {STATUS_OPTIONS.map((s) => (
          <SelectItem key={s} value={s}>{CYCLE_COUNT_STATUS_LABEL[s]}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  );

  return (
    <>
      <PageWrapper
        title="Cycle Counts"
        subtitle="Count inventory by location or category to verify stock accuracy."
        filters={filtersRow}
        actions={
          <Button size="sm" onClick={handleOpenSheet} {...plusHandlers}>
            <PlusIcon ref={plusRef} size={14} aria-hidden="true" />
            New Cycle Count
          </Button>
        }
      >
        <div className="flex flex-1 min-h-0 flex-col">
        {error ? (
          <ErrorState
            title="Failed to load cycle counts"
            description={getErrorMessage(error)}
            onRetry={handleRetry}
          />
        ) : isLoading ? (
          <DataTableSkeleton rows={12} columns={8} className="flex-1 min-h-0" />
        ) : (
          <DataTable
            data={items}
            columns={columns}
            getRowKey={(row) => row.id}
            className="flex-1 min-h-0"
            emptyState={
              <InventoryEmptyState
                illustration={<EmptyWarehouseIllustration />}
                title="No cycle counts yet"
                description="Create a cycle count to verify stock accuracy."
                action={{ label: "New Cycle Count", onClick: handleOpenSheet }}
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
            minWidth="640px"
          />
        )}
        </div>
      </PageWrapper>

      <NewCycleCountSheet open={sheetOpen} onClose={handleCloseSheet} />
    </>
  );
}
