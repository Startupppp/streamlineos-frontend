"use client";

import { useState } from "react";
import Link from "next/link";
import { Eye } from "lucide-react";
import { PlusIcon } from "@animateicons/react/lucide";
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
} from "@/components/ui/sheet";
import { Label } from "@/components/ui/label";
import { DataTable, DataTableSkeleton, type DataTableColumn } from "@/components/ui/data-table";
import { ErrorState } from "@/components/shared";
import { InventoryEmptyState } from "@/features/inventory/components/inventory-empty-state";
import { EmptyWarehouseIllustration } from "@/components/illustrations";
import {
  usePhysicalAudits,
  useCreatePhysicalAudit,
  type PhysicalAuditListItem,
} from "@/hooks/api/inventory/counts";
import { useWarehouses } from "@/hooks/api/inventory/warehouses";
import {
  CYCLE_COUNT_STATUS_BADGE,
  CYCLE_COUNT_STATUS_LABEL,
  type CycleCountStatus,
} from "@/features/inventory/lib/inventory-status";
import { useAnimatedIcon } from "@/hooks/common/use-animated-icon";
import { getErrorMessage } from "@/lib/get-error-message";

const STATUS_OPTIONS: CycleCountStatus[] = ["PLANNED", "COUNTING", "REVIEW", "POSTED", "CANCELLED"];
const PAGE_LIMIT = 20;

function StatusBadge({ status }: { status: CycleCountStatus }) {
  return (
    <Badge variant="outline" className={`text-[9px] h-4 px-1.5 py-0 ${CYCLE_COUNT_STATUS_BADGE[status]}`}>
      {CYCLE_COUNT_STATUS_LABEL[status]}
    </Badge>
  );
}

function NewAuditSheet({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const [warehouseId, setWarehouseId] = useState<string>("");
  const { data: warehouses = [] } = useWarehouses();
  const createMutation = useCreatePhysicalAudit();

  function handleWarehouseChange(value: string): void {
    setWarehouseId(value === "none" ? "" : value);
  }

  function handleClose(): void {
    setWarehouseId("");
    onClose();
  }

  function handleSubmit(): void {
    if (!warehouseId) return;
    createMutation.mutate({ warehouseId: Number(warehouseId) }, { onSuccess: handleClose });
  }

  return (
    <Sheet open={open} onOpenChange={(v) => { if (!v) handleClose(); }}>
      <SheetContent side="right" className="w-full sm:max-w-[480px] p-0 flex flex-col overflow-hidden">
        <SheetHeader className="bg-muted/40 p-6 pb-4 pr-12 border-b text-left">
          <SheetTitle>New Physical Audit</SheetTitle>
        </SheetHeader>
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="pa-warehouse">Warehouse *</Label>
            <Select value={warehouseId || "none"} onValueChange={handleWarehouseChange}>
              <SelectTrigger id="pa-warehouse" className="h-9 text-sm">
                <SelectValue placeholder="Select warehouse" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Select warehouse…</SelectItem>
                {warehouses.map((w) => (
                  <SelectItem key={w.id} value={String(w.id)}>{w.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <SheetFooter className="border-t px-6 py-4 gap-2 flex-row">
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
            Create Audit
          </LoadingButton>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

export function PhysicalAuditsClient() {
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [page, setPage] = useState(1);
  const [sheetOpen, setSheetOpen] = useState(false);
  const { iconRef: plusRef, hoverHandlers: plusHandlers } = useAnimatedIcon();

  const { data, isLoading, error, refetch } = usePhysicalAudits({
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

  const columns: DataTableColumn<PhysicalAuditListItem>[] = [
    {
      key: "auditNumber",
      header: "#",
      headerClassName: "w-[120px]",
      className: "font-mono text-xs text-muted-foreground",
      cell: (row) => row.auditNumber,
    },
    {
      key: "warehouse",
      header: "Warehouse",
      cell: (row) => row.warehouseName,
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
        <Button variant="ghost" size="icon" className="h-7 w-7" asChild>
          <Link href={`/inventory/physical-audits/${row.id}`}>
            <Eye className="h-3.5 w-3.5" aria-hidden="true" />
          </Link>
        </Button>
      ),
    },
  ];

  const filtersRow = (
    <Select value={statusFilter} onValueChange={handleStatusChange}>
      <SelectTrigger className="h-8 w-[160px] text-xs">
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
        eyebrow="Operations · Inventory"
        title="Physical Audits"
        subtitle="Warehouse-wide full stock audits."
        filters={filtersRow}
        actions={
          <Button size="sm" onClick={handleOpenSheet} {...plusHandlers}>
            <PlusIcon ref={plusRef} size={14} aria-hidden="true" />
            New Physical Audit
          </Button>
        }
      >
        {error ? (
          <ErrorState
            title="Failed to load physical audits"
            description={getErrorMessage(error)}
            onRetry={handleRetry}
          />
        ) : isLoading ? (
          <DataTableSkeleton rows={6} columns={6} className="flex-1" />
        ) : (
          <DataTable
            data={items}
            columns={columns}
            getRowKey={(row) => row.id}
            className="flex-1 min-h-0"
            emptyState={
              <InventoryEmptyState
                illustration={<EmptyWarehouseIllustration />}
                title="No physical audits yet"
                description="Create a physical audit to count all stock in a warehouse."
                action={{ label: "New Physical Audit", onClick: handleOpenSheet }}
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
      </PageWrapper>

      <NewAuditSheet open={sheetOpen} onClose={handleCloseSheet} />
    </>
  );
}
