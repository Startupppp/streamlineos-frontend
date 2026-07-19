"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { PlusIcon } from "@animateicons/react/lucide";
import { AnimatedIconButton } from "@/components/ui/animated-icon-button";
import { format } from "date-fns";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Badge } from "@/components/ui/badge";
import { SearchInput } from "@/components/ui/search-input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { ErrorState } from "@/components/shared";
import { getErrorMessage } from "@/lib/get-error-message";
import { InventoryEmptyState } from "@/features/inventory/components/inventory-empty-state";
import { EmptyOrdersIllustration } from "@/components/illustrations";
import { useQualityInspections } from "@/hooks/api/inventory/quality";
import type { Inspection } from "@/hooks/api/inventory/quality";
import { InspectionDetailSheet } from "@/features/inventory/components/quality/inspection-detail-sheet";
import { CreateInspectionSheet } from "@/features/inventory/components/quality/create-inspection-sheet";
import { INSPECTION_STATUS_BADGE, INSPECTION_STATUS_LABEL } from "@/features/inventory/lib";
import type { InspectionStatus } from "@/features/inventory/lib";
import { cn } from "@/lib/utils";
import { FILTER_SELECT_TRIGGER } from "@/components/ui/content-fill-panel";

const PAGE_LIMIT = 20;

const INSPECTION_STATUSES: InspectionStatus[] = [
  "PENDING", "IN_PROGRESS", "PASSED", "FAILED", "DISPOSITION_REQUIRED", "COMPLETED", "CANCELLED",
];

function InspectionsPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [createOpen, setCreateOpen] = useState(false);

  const statusParam = searchParams.get("status") ?? "";
  const sourceParam = searchParams.get("source") ?? "";
  const page = Math.max(1, Number(searchParams.get("page") ?? "1"));

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

  function handleSourceChange(value: string): void {
    updateParams({ source: value || null });
  }

  function handlePageChange(nextPage: number): void {
    const params = new URLSearchParams(searchParams.toString());
    if (nextPage <= 1) params.delete("page");
    else params.set("page", String(nextPage));
    router.replace(`?${params.toString()}`, { scroll: false });
  }

  function handleRowClick(row: Inspection): void {
    setSelectedId(row.id);
  }

  function handleDetailOpenChange(v: boolean): void {
    if (!v) setSelectedId(null);
  }

  function handleCreateOpenChange(v: boolean): void {
    setCreateOpen(v);
  }

  function handleOpenCreate(): void {
    setCreateOpen(true);
  }

  const statusFilter = (INSPECTION_STATUSES as readonly string[]).includes(statusParam)
    ? (statusParam as InspectionStatus)
    : undefined;

  const inspectionsQuery = useQualityInspections({
    status: statusFilter,
    source: sourceParam || undefined,
    page,
    limit: PAGE_LIMIT,
  });

  const items = inspectionsQuery.data?.items ?? [];
  const total = inspectionsQuery.data?.total ?? 0;

  function handleRetry(): void {
    void inspectionsQuery.refetch();
  }

  function handleClearFilters(): void {
    router.replace("?", { scroll: false });
  }

  const hasFilters = !!(statusParam || sourceParam);

  const columns: DataTableColumn<Inspection>[] = [
    {
      key: "status",
      header: "Status",
      cell: (r) => (
        <Badge
          variant="outline"
          className={cn("h-4 text-[9px] px-1.5 py-0 border", INSPECTION_STATUS_BADGE[r.status])}
        >
          {INSPECTION_STATUS_LABEL[r.status]}
        </Badge>
      ),
    },
    {
      key: "source",
      header: "Source",
      className: "text-muted-foreground",
      cell: (r) => r.source ?? "—",
    },
    {
      key: "lines",
      header: "Lines",
      headerClassName: "w-[60px] text-right",
      className: "text-right tabular-nums text-muted-foreground",
      cell: (r) => r.lines.length,
    },
    {
      key: "createdAt",
      header: "Created",
      headerClassName: "w-[130px]",
      className: "text-muted-foreground",
      cell: (r) => format(new Date(r.createdAt), "dd MMM yyyy"),
      sortable: true,
      sortValue: (r) => r.createdAt,
    },
  ];

  const filtersRow = (
    <div className="flex w-full min-w-0 flex-nowrap items-center gap-2">
      <SearchInput
        value={sourceParam}
        onValueChange={handleSourceChange}
        placeholder="Filter by source…"
        className="flex-1 max-w-xs"
      />
      <Select value={statusParam || "all"} onValueChange={handleStatusChange}>
        <SelectTrigger className={cn(FILTER_SELECT_TRIGGER, "text-xs w-48")}>
          <SelectValue placeholder="All statuses" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All statuses</SelectItem>
          {INSPECTION_STATUSES.map((s) => (
            <SelectItem key={s} value={s}>{INSPECTION_STATUS_LABEL[s]}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );

  return (
    <>
      <PageWrapper
        title="Inspections"
        subtitle="Manage quality inspections"
        actions={
          <AnimatedIconButton icon={PlusIcon} iconSize={14} iconClassName="mr-1.5" size="sm" onClick={handleOpenCreate}>
            New Inspection
          </AnimatedIconButton>
        }
        filters={filtersRow}
      >
        <div className="flex flex-1 min-h-0 flex-col gap-4">
          {inspectionsQuery.error ? (
            <ErrorState
              title="Failed to load inspections"
              description={getErrorMessage(inspectionsQuery.error)}
              onRetry={handleRetry}
            />
          ) : (
            <DataTable
              data={items}
              columns={columns}
              className="flex-1 min-h-0"
              getRowKey={(r) => r.id}
              onRowClick={handleRowClick}
              isLoading={inspectionsQuery.isLoading}
              emptyState={
                <InventoryEmptyState
                  illustration={<EmptyOrdersIllustration />}
                  title={hasFilters ? "No inspections found" : "No inspections yet"}
                  description={hasFilters ? "Try adjusting your filters." : "Create your first quality inspection."}
                  action={
                    hasFilters
                      ? { label: "Clear filters", onClick: handleClearFilters }
                      : { label: "New Inspection", onClick: handleOpenCreate }
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
              minWidth="560px"
            />
          )}
        </div>
      </PageWrapper>

      <InspectionDetailSheet
        open={selectedId !== null}
        onOpenChange={handleDetailOpenChange}
        inspectionId={selectedId}
      />

      <CreateInspectionSheet
        open={createOpen}
        onOpenChange={handleCreateOpenChange}
      />
    </>
  );
}

export default function InspectionsPage() {
  return (
    <Suspense>
      <InspectionsPageInner />
    </Suspense>
  );
}
