"use client";

import { Suspense, useCallback, useMemo, useState } from "react";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { ErrorState, NoPermissionState } from "@/components/shared";
import { InventoryEmptyState } from "@/features/inventory/components/inventory-empty-state";
import { EmptyWarehouseIllustration } from "@/components/illustrations";
import { FILTER_SELECT_TRIGGER } from "@/components/ui/content-fill-panel";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { useCan } from "@/hooks/api/access";
import { useLaborBoard, type LaborBoardRow } from "@/hooks/api/inventory/slotting-labor";

const LABOR_READ = "inventory:labor:read";

function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.round((seconds % 3600) / 60);
  return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
}

const COLUMNS: DataTableColumn<LaborBoardRow>[] = [
  {
    key: "person",
    header: "Person",
    cell: (row) => <span className="text-sm font-medium">{row.userName ?? row.userId}</span>,
    sortable: true,
    sortValue: (row) => row.userName ?? row.userId,
  },
  {
    key: "lines",
    header: "Lines",
    headerClassName: "text-right",
    className: "text-right font-mono tabular-nums text-muted-foreground",
    cell: (row) => row.lines,
    sortable: true,
    sortValue: (row) => row.lines,
  },
  {
    key: "units",
    header: "Units",
    headerClassName: "text-right",
    className: "text-right font-mono tabular-nums",
    cell: (row) => row.unitsDone.toLocaleString(undefined, { maximumFractionDigits: 2 }),
    sortable: true,
    sortValue: (row) => row.unitsDone,
  },
  {
    key: "worked",
    header: "Worked",
    headerClassName: "text-right",
    className: "text-right font-mono tabular-nums text-muted-foreground",
    cell: (row) => formatDuration(row.actualSeconds),
  },
  {
    key: "uph",
    header: "Units/hour",
    headerClassName: "text-right",
    className: "text-right font-mono tabular-nums font-semibold",
    cell: (row) =>
      row.unitsPerHour === null
        ? "—"
        : row.unitsPerHour.toLocaleString(undefined, { maximumFractionDigits: 1 }),
    sortable: true,
    sortValue: (row) => row.unitsPerHour ?? 0,
  },
  {
    key: "performance",
    header: "vs standard",
    headerClassName: "text-right",
    className: "text-right",
    cell: (row) => (
      <Badge
        variant="outline"
        className={cn(
          "text-dense font-mono tabular-nums",
          row.performancePct >= 100
            ? "bg-status-success-surface text-status-success-ink border-status-success-rule"
            : row.performancePct >= 85
              ? "bg-status-warning-surface text-status-warning-ink border-status-warning-rule"
              : "bg-status-danger-surface text-status-danger-ink border-status-danger-rule",
        )}
      >
        {row.performancePct.toFixed(0)}%
      </Badge>
    ),
    sortable: true,
    sortValue: (row) => row.performancePct,
  },
];

function LaborContent() {
  const canView = useCan(LABOR_READ);
  const [windowDays, setWindowDays] = useState("7");
  const { data, isLoading, isError, refetch } = useLaborBoard({ windowDays: Number(windowDays) });
  const rows = useMemo(() => (Array.isArray(data) ? data : []), [data]);

  const handleRetry = useCallback(() => {
    void refetch();
  }, [refetch]);

  const filters = (
    <Select value={windowDays} onValueChange={setWindowDays}>
      <SelectTrigger className={FILTER_SELECT_TRIGGER}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="1">Today</SelectItem>
        <SelectItem value="7">Last 7 days</SelectItem>
        <SelectItem value="30">Last 30 days</SelectItem>
      </SelectContent>
    </Select>
  );

  if (!canView) {
    return (
      <PageWrapper title="Labour">
        <NoPermissionState permission={LABOR_READ} className="flex-1" />
      </PageWrapper>
    );
  }

  if (isLoading) {
    return (
      <PageWrapper title="Labour" actions={filters}>
        <div className="space-y-3">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-full" />
          ))}
        </div>
      </PageWrapper>
    );
  }

  if (isError) {
    return (
      <PageWrapper title="Labour" actions={filters}>
        <ErrorState
          title="Failed to load the labour board"
          description="An error occurred while fetching completed floor work."
          onRetry={handleRetry}
        />
      </PageWrapper>
    );
  }

  return (
    <PageWrapper
      title="Labour"
      subtitle="Units per hour and performance against standard"
      actions={filters}
    >
      <div className="flex flex-1 min-h-0 flex-col gap-3">
        <p className="text-xs text-muted-foreground">
          A lite standard: a fixed setup cost, a per-scan cost, a cost per bin change and a small
          cost per extra unit. It is not an engineered standard — there is no surveyed building
          behind it — and it is not pay. Above 100% is faster than standard.
        </p>
        {rows.length > 0 ? (
          <DataTable data={rows} columns={COLUMNS} getRowKey={(row) => row.userId} className="flex-1 min-h-0" />
        ) : (
          <InventoryEmptyState
            illustration={<EmptyWarehouseIllustration />}
            title="No completed work in this window"
            description="Picks and putaways record themselves as they are confirmed. Widen the window, or wait for the shift to start."
          />
        )}
      </div>
    </PageWrapper>
  );
}

export default function LaborPage() {
  return (
    <Suspense>
      <LaborContent />
    </Suspense>
  );
}
