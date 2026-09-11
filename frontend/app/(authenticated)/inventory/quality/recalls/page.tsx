"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { PlusIcon } from "@animateicons/react/lucide";
import { AnimatedIconButton } from "@/components/ui/animated-icon-button";
import { format } from "date-fns";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Badge } from "@/components/ui/badge";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { ErrorState, NoPermissionState } from "@/components/shared";
import { getErrorMessage } from "@/lib/get-error-message";
import { InventoryEmptyState } from "@/features/inventory/components/inventory-empty-state";
import { EmptySearchIllustration } from "@/components/illustrations";
import { useRecalls } from "@/hooks/api/inventory/quality";
import type { Recall } from "@/hooks/api/inventory/quality";
import { RecallDetailSheet } from "@/features/inventory/components/quality/recall-detail-sheet";
import { RecallPlanSheet } from "@/features/inventory/components/quality/recall-plan-sheet";
import {
  RECALL_QUARANTINE_BADGE,
  RECALL_STATUS_BADGE,
  RECALL_STATUS_LABEL,
  isRecallLineUnheld,
  toRecallLineQuarantine,
  type RecallLineQuarantine,
} from "@/features/inventory/lib";
import { cn } from "@/lib/utils";
import { TABLE_TITLE_CELL, TEXT_ONE_LINE } from "@/lib/text-overflow";
import { useCan } from "@/hooks/api/access";

const PAGE_LIMIT = 20;

function RecallsPageInner() {
  const canView = useCan("inventory:quality:read");
  const router = useRouter();
  const searchParams = useSearchParams();

  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [createOpen, setCreateOpen] = useState(false);

  const page = Math.max(1, Number(searchParams.get("page") ?? "1"));

  function handlePageChange(nextPage: number): void {
    const params = new URLSearchParams(searchParams.toString());
    if (nextPage <= 1) params.delete("page");
    else params.set("page", String(nextPage));
    router.replace(`?${params.toString()}`, { scroll: false });
  }

  function handleRowClick(row: Recall): void {
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

  const recallsQuery = useRecalls({ page, limit: PAGE_LIMIT });

  const items = recallsQuery.data?.items ?? [];
  const total = recallsQuery.data?.total ?? 0;

  function handleRetry(): void {
    void recallsQuery.refetch();
  }

  const columns: DataTableColumn<Recall>[] = [
    {
      key: "title",
      header: "Title",
      className: TABLE_TITLE_CELL,
      cell: (r) => (
        <span className={cn("font-medium", TEXT_ONE_LINE)} title={r.title}>
          {r.title}
        </span>
      ),
    },
    {
      key: "recallNumber",
      header: "Recall #",
      headerClassName: "w-[120px]",
      className: "font-mono text-muted-foreground",
      cell: (r) => r.recallNumber,
    },
    {
      key: "status",
      header: "Status",
      headerClassName: "w-[110px]",
      cell: (r) => (
        <Badge
          variant="outline"
          className={cn("h-4 text-micro px-1.5 py-0 border", RECALL_STATUS_BADGE[r.status])}
        >
          {RECALL_STATUS_LABEL[r.status]}
        </Badge>
      ),
    },
    {
      key: "lots",
      header: "Lots",
      headerClassName: "w-[70px] text-right",
      className: "text-right tabular-nums text-muted-foreground",
      cell: (r) => r.lines.length,
    },
    /**
     * INV-33. Whether the quarantine actually held anything.
     *
     * A recall commits even when it held nothing, and the Status column says
     * OPEN in both cases — so without this the list reports a recall that
     * blocked no stock exactly like one that blocked all of it.
     */
    {
      key: "quarantine",
      header: "Quarantine",
      headerClassName: "w-[130px]",
      cell: (r) => {
        const unheld = r.lines.filter((line) =>
          isRecallLineUnheld(toRecallLineQuarantine(line.status)),
        ).length;
        if (r.lines.length === 0) return <span className="text-muted-foreground">—</span>;
        const outcome: RecallLineQuarantine =
          unheld === 0 ? "QUARANTINED" : unheld === r.lines.length ? "NOT_QUARANTINABLE" : "OPEN";
        return (
          <Badge
            variant="outline"
            className={cn("h-4 text-micro px-1.5 py-0 border", RECALL_QUARANTINE_BADGE[outcome])}
          >
            {unheld === 0 ? "All held" : `${unheld} unheld`}
          </Badge>
        );
      },
    },
    {
      key: "createdAt",
      header: "Created",
      headerClassName: "w-[130px]",
      className: "text-muted-foreground",
      cell: (r) => format(new Date(r.createdAt), "dd MMM yyyy"),
    },
  ];

  if (!canView)
    return (
      <PageWrapper
        title="Recalls"
        subtitle="Manage product recalls"
      >
        <NoPermissionState permission="inventory:quality:read" className="flex-1" />
      </PageWrapper>
    );

  return (
    <>
      <PageWrapper
        title="Recalls"
        subtitle="Manage product recalls"
        actions={
          <AnimatedIconButton icon={PlusIcon} iconSize={14} iconClassName="mr-1.5" size="sm" onClick={handleOpenCreate}>
            New Recall
          </AnimatedIconButton>
        }
      >
        <div className="flex flex-1 min-h-0 flex-col gap-4">
          {recallsQuery.error ? (
            <ErrorState
              title="Failed to load recalls"
              description={getErrorMessage(recallsQuery.error)}
              onRetry={handleRetry}
            />
          ) : (
            <DataTable
              data={items}
              columns={columns}
              className="flex-1 min-h-0"
              getRowKey={(r) => r.id}
              onRowClick={handleRowClick}
              isLoading={recallsQuery.isLoading}
              emptyState={
                <InventoryEmptyState
                  illustration={<EmptySearchIllustration />}
                  title="No recalls yet"
                  description="Product recalls will appear here once created."
                  action={{ label: "New Recall", onClick: handleOpenCreate }}
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

      <RecallDetailSheet
        open={selectedId !== null}
        onOpenChange={handleDetailOpenChange}
        recallId={selectedId}
      />

      <RecallPlanSheet open={createOpen} onOpenChange={handleCreateOpenChange} />
    </>
  );
}

export default function RecallsPage() {
  return (
    <Suspense fallback={null}>
      <RecallsPageInner />
    </Suspense>
  );
}
