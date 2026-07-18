"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { PlusIcon } from "@animateicons/react/lucide";
import { AnimatedIconButton } from "@/components/ui/animated-icon-button";
import { format } from "date-fns";
import { toast } from "sonner";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { ErrorState } from "@/components/shared";
import { getErrorMessage } from "@/lib/get-error-message";
import { InventoryEmptyState } from "@/features/inventory/components/inventory-empty-state";
import { EmptyWarehouseIllustration } from "@/components/illustrations";
import { useQualityHolds, useReleaseQualityHold } from "@/hooks/api/inventory/quality";
import type { QualityHold } from "@/hooks/api/inventory/quality";
import { HoldCreateSheet } from "@/features/inventory/components/quality/hold-create-sheet";
import { HoldDetailSheet } from "@/features/inventory/components/quality/hold-detail-sheet";
import { QUALITY_HOLD_STATUS_BADGE, QUALITY_HOLD_STATUS_LABEL } from "@/features/inventory/lib";
import type { QualityHoldStatus } from "@/features/inventory/lib";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";

const PAGE_LIMIT = 20;

const HOLD_STATUSES: QualityHoldStatus[] = ["ACTIVE", "RELEASED", "EXPIRED"];

function HoldsPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [createOpen, setCreateOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedHoldId, setSelectedHoldId] = useState<number | null>(null);

  const statusParam = searchParams.get("status") ?? "";
  const page = Math.max(1, Number(searchParams.get("page") ?? "1"));

  const releaseMut = useReleaseQualityHold();

  function updateParams(updates: Record<string, string | null>): void {
    const params = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(updates)) {
      if (!value) params.delete(key);
      else params.set(key, value);
    }
    params.delete("page");
    router.replace(`?${params.toString()}`, { scroll: false });
  }

  function handleStatusChange(value: string): void {
    updateParams({ status: value === "all" ? null : value });
  }

  function handlePageChange(nextPage: number): void {
    const params = new URLSearchParams(searchParams.toString());
    if (nextPage <= 1) params.delete("page");
    else params.set("page", String(nextPage));
    router.replace(`?${params.toString()}`, { scroll: false });
  }

  function handleCreateOpenChange(v: boolean): void {
    setCreateOpen(v);
  }

  function handleRowClick(row: QualityHold): void {
    setSelectedHoldId(row.id);
    setDetailOpen(true);
  }

  function handleDetailOpenChange(v: boolean): void {
    setDetailOpen(v);
    if (!v) setSelectedHoldId(null);
  }

  function handleOpenCreate(): void {
    setCreateOpen(true);
  }

  function handleRelease(holdId: number): void {
    releaseMut.mutate(holdId, {
      onSuccess: () => toast.success("Hold released"),
      onError: (e) => toast.error(e.message),
    });
  }

  function handleClearFilters(): void {
    router.replace("?", { scroll: false });
  }

  const statusFilter = (HOLD_STATUSES as readonly string[]).includes(statusParam)
    ? (statusParam as QualityHoldStatus)
    : undefined;

  const holdsQuery = useQualityHolds({
    status: statusFilter,
    page,
    limit: PAGE_LIMIT,
  });

  const items = holdsQuery.data?.items ?? [];
  const total = holdsQuery.data?.total ?? 0;

  function handleRetry(): void {
    void holdsQuery.refetch();
  }

  const hasFilters = !!statusParam;

  const columns: DataTableColumn<QualityHold>[] = [
    {
      key: "variant",
      header: "Variant ID",
      cell: (r) => r.productVariantId,
    },
    {
      key: "qty",
      header: "Qty",
      headerClassName: "w-[80px] text-right",
      className: "text-right tabular-nums",
      cell: (r) => r.quantity,
    },
    {
      key: "reason",
      header: "Reason",
      className: "text-muted-foreground max-w-[200px] truncate",
      cell: (r) => r.reason,
    },
    {
      key: "status",
      header: "Status",
      cell: (r) => (
        <Badge
          variant="outline"
          className={cn("h-4 text-[9px] px-1.5 py-0 border", QUALITY_HOLD_STATUS_BADGE[r.status])}
        >
          {QUALITY_HOLD_STATUS_LABEL[r.status]}
        </Badge>
      ),
    },
    {
      key: "createdAt",
      header: "Created",
      headerClassName: "w-[130px]",
      className: "text-muted-foreground",
      cell: (r) => format(new Date(r.createdAt), "dd MMM yyyy"),
    },
    {
      key: "actions",
      header: "",
      headerClassName: "w-[80px]",
      cell: (r) =>
        r.status === "ACTIVE" ? (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button size="sm" variant="outline" className="h-6 text-xs px-2" disabled={releaseMut.isPending}>
                Release
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Release this hold?</AlertDialogTitle>
                <AlertDialogDescription>
                  The inventory will be returned to available stock.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={() => handleRelease(r.id)}>Release</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        ) : null,
    },
  ];

  const filtersRow = (
    <div className="flex w-full min-w-0 flex-nowrap items-center gap-2">
      <Select value={statusParam || "all"} onValueChange={handleStatusChange}>
        <SelectTrigger className="text-xs w-44">
          <SelectValue placeholder="All statuses" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All statuses</SelectItem>
          {HOLD_STATUSES.map((s) => (
            <SelectItem key={s} value={s}>{QUALITY_HOLD_STATUS_LABEL[s]}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );

  return (
    <>
      <PageWrapper
        title="Quality Holds"
        subtitle={total > 0 ? `${total} ${total === 1 ? "hold" : "holds"}` : "Manage inventory quality holds"}
        actions={
          <AnimatedIconButton icon={PlusIcon} iconSize={14} iconClassName="mr-1.5" size="sm" onClick={handleOpenCreate}>
            Create Hold
          </AnimatedIconButton>
        }
        filters={filtersRow}
      >
        {holdsQuery.error ? (
          <ErrorState
            title="Failed to load holds"
            description={getErrorMessage(holdsQuery.error)}
            onRetry={handleRetry}
            className="flex-1"
          />
        ) : (
          <DataTable
            className="flex-1 min-h-0"
            data={items}
            columns={columns}
            getRowKey={(r) => r.id}
            onRowClick={handleRowClick}
            isLoading={holdsQuery.isLoading}
            emptyState={
              <InventoryEmptyState
                illustration={<EmptyWarehouseIllustration />}
                title={hasFilters ? "No holds found" : "No holds yet"}
                description={hasFilters ? "Try adjusting your filters." : "Create a quality hold to quarantine inventory."}
                action={
                  hasFilters
                    ? { label: "Clear filters", onClick: handleClearFilters }
                    : { label: "Create Hold", onClick: handleOpenCreate }
                }
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
      </PageWrapper>

      <HoldCreateSheet open={createOpen} onOpenChange={handleCreateOpenChange} />
      <HoldDetailSheet open={detailOpen} onOpenChange={handleDetailOpenChange} holdId={selectedHoldId} />
    </>
  );
}

export default function HoldsPage() {
  return (
    <Suspense>
      <HoldsPageInner />
    </Suspense>
  );
}
