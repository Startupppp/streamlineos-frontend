"use client";

import { useState } from "react";
import Link from "next/link";
import { EyeIcon, PlusIcon } from "@animateicons/react/lucide";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DataTable, DataTableSkeleton, type DataTableColumn } from "@/components/ui/data-table";
import { ErrorState, NoPermissionState } from "@/components/shared";
import { InventoryEmptyState } from "@/features/inventory/components/inventory-empty-state";
import { EmptyWarehouseIllustration } from "@/components/illustrations";
import {
  useCycleCounts,
  type CycleCountListItem,
} from "@/hooks/api/inventory/counts";
import {
  CYCLE_COUNT_STATUS_BADGE,
  CYCLE_COUNT_STATUS_LABEL,
  type CycleCountStatus,
  isCycleCountStatus,
} from "@/features/inventory/lib/inventory-status";
import { useAnimatedIcon } from "@/hooks/common/use-animated-icon";
import { getErrorMessage } from "@/lib/get-error-message";
import { useCan } from "@/hooks/api/access";
import { COUNT_READ_KEY, COUNT_WRITE_KEY } from "@/hooks/api/inventory/counts";
import { TruncatedText } from "@/components/ui/truncated-text";
import { FILTER_SELECT_TRIGGER } from "@/components/ui/content-fill-panel";
import { cn } from "@/lib/utils";
import { NewCycleCountSheet } from "./new-cycle-count-sheet";

function ViewCountButton({ href }: { href: string }) {
  const { iconRef, hoverHandlers } = useAnimatedIcon();
  return (
    <Button variant="ghost" size="icon" className="w-7" aria-label="View cycle count" asChild>
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
    <Badge variant="outline" className={`text-micro h-4 px-1.5 py-0 ${CYCLE_COUNT_STATUS_BADGE[status]}`}>
      {CYCLE_COUNT_STATUS_LABEL[status]}
    </Badge>
  );
}

export function CycleCountsClient() {
  const [statusFilter, setStatusFilter] = useState<CycleCountStatus | "all">("all");
  const [page, setPage] = useState(1);
  const [sheetOpen, setSheetOpen] = useState(false);
  const { iconRef: plusRef, hoverHandlers: plusHandlers } = useAnimatedIcon();
  const canView = useCan(COUNT_READ_KEY);
  const canCount = useCan(COUNT_WRITE_KEY);

  const { data, isLoading, error, refetch } = useCycleCounts({
    status: statusFilter === "all" ? undefined : statusFilter,
    page,
  });

  const items = data?.items ?? [];
  const total = data?.total ?? 0;

  function handleStatusChange(value: string): void {
    setStatusFilter(value === "all" || isCycleCountStatus(value) ? value : "all");
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
          canCount ? (
            <Button size="sm" onClick={handleOpenSheet} {...plusHandlers}>
              <PlusIcon ref={plusRef} size={14} aria-hidden="true" />
              New Cycle Count
            </Button>
          ) : undefined
        }
      >
        <div className="flex flex-1 min-h-0 flex-col">
        {/*
         * G8 — denied is a different answer from empty.
         *
         * The list query is gated on the read key inside its hook, so a reader
         * without it received an empty page and was told the warehouse has no
         * cycle counts. The branch sits below every hook on purpose: an early return
         * above them would make hook order depend on a permission, which only
         * breaks for the person who lacks it.
         */}
        {!canView ? (
          <NoPermissionState className="flex-1" permission={COUNT_READ_KEY} />
        ) : error ? (
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
                action={canCount ? { label: "New Cycle Count", onClick: handleOpenSheet } : undefined}
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
