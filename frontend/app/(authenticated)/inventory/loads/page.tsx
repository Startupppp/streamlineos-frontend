"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { PlusIcon } from "@animateicons/react/lucide";
import { AnimatedIconButton } from "@/components/ui/animated-icon-button";
import { cn } from "@/lib/utils";
import { EmptyTransferIllustration } from "@/components/illustrations";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Badge } from "@/components/ui/badge";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { TruncatedText } from "@/components/ui/truncated-text";
import { InventoryEmptyState } from "@/features/inventory/components/inventory-empty-state";
import { ErrorState, AppSheet, NoPermissionState } from "@/components/shared";
import { LoadCreateSheet } from "@/features/inventory/components/shipping/load-create-sheet";
import { LoadDetailPanel } from "@/features/inventory/components/shipping/load-detail-panel";
import {
  LOAD_STATUS_BADGE,
  LOAD_STATUS_LABEL,
} from "@/features/inventory/lib";
import {
  useLoads,
  type Load,
} from "@/hooks/api/inventory/shipping";
import { getErrorMessage } from "@/lib/get-error-message";
import { useCan } from "@/hooks/api/access";
import { formatShortDate } from "@/lib/date-utils";

const PAGE_LIMIT = 20;

function LoadsPageInner() {
  const canView = useCan("inventory:loads:manage");
  const router = useRouter();
  const searchParams = useSearchParams();
  const [detailOpen, setDetailOpen] = useState<boolean>(false);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [createOpen, setCreateOpen] = useState<boolean>(false);

  const page = Math.max(1, Number(searchParams.get("page") ?? "1"));

  function handlePageChange(nextPage: number): void {
    const params = new URLSearchParams(searchParams.toString());
    if (nextPage <= 1) {
      params.delete("page");
    } else {
      params.set("page", String(nextPage));
    }
    router.replace(`?${params.toString()}`, { scroll: false });
  }

  function handleRowClick(load: Load): void {
    setSelectedId(load.id);
    setDetailOpen(true);
  }

  function handleNewLoad(): void {
    setCreateOpen(true);
  }

  function handleDetailClose(open: boolean): void {
    setDetailOpen(open);
    if (!open) setSelectedId(null);
  }

  function handleDetailPanelClose(): void {
    handleDetailClose(false);
  }

  const loadsQuery = useLoads({ page, limit: PAGE_LIMIT });
  const items = loadsQuery.data?.items ?? [];
  const total = loadsQuery.data?.total ?? 0;

  function handleRetry(): void {
    void loadsQuery.refetch();
  }

  const columns: DataTableColumn<Load>[] = [
    {
      key: "loadNumber",
      header: "Load",
      cell: (l) => <span className="font-mono font-semibold text-foreground">{l.loadNumber}</span>,
    },
    {
      key: "status",
      header: "Status",
      cell: (l) => (
        <Badge
          variant="outline"
          className={cn("h-4 text-micro px-1.5 py-0 border", LOAD_STATUS_BADGE[l.status])}
        >
          {LOAD_STATUS_LABEL[l.status]}
        </Badge>
      ),
    },
    {
      key: "destination",
      header: "Destination",
      cell: (l) => (
        <TruncatedText text={l.destination ?? "—"} className="text-muted-foreground" />
      ),
    },
    {
      key: "vehicleRef",
      header: "Vehicle",
      headerClassName: "hidden md:table-cell",
      className: "text-muted-foreground hidden md:table-cell",
      cell: (l) => <>{l.vehicleRef ?? "—"}</>,
    },
    {
      key: "createdAt",
      header: "Created",
      cell: (l) => (
        <span className="tabular-nums text-muted-foreground">{formatShortDate(l.createdAt) || "—"}</span>
      ),
    },
  ];

  const selectedLoad = selectedId !== null ? items.find((l) => l.id === selectedId) : undefined;

  if (!canView)
    return (
      <PageWrapper
        title="Loads"
        subtitle="Group shipments into transport loads"
      >
        <NoPermissionState permission="inventory:loads:manage" className="flex-1" />
      </PageWrapper>
    );

  return (
    <>
      <PageWrapper
        title="Loads"
        subtitle="Group shipments into transport loads"
        actions={
          <AnimatedIconButton icon={PlusIcon} iconSize={14} iconClassName="mr-1.5" size="sm" onClick={handleNewLoad}>
            New Load
          </AnimatedIconButton>
        }
      >
        <div className="flex flex-1 min-h-0 flex-col gap-4">
          {loadsQuery.error ? (
            <ErrorState
              title="Failed to load loads"
              description={getErrorMessage(loadsQuery.error)}
              onRetry={handleRetry}
            />
          ) : (
            <DataTable
              data={items}
              columns={columns}
              className="flex-1 min-h-0"
              getRowKey={(l) => l.id}
              isLoading={loadsQuery.isLoading}
              onRowClick={handleRowClick}
              emptyState={
                <InventoryEmptyState
                  illustration={<EmptyTransferIllustration />}
                  title="No loads yet"
                  description="Create a load to group shipments for transport."
                  action={{ label: "New Load", onClick: handleNewLoad }}
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

      <AppSheet
        open={detailOpen}
        onOpenChange={handleDetailClose}
        title={selectedLoad ? `Load ${selectedLoad.loadNumber}` : "Load Details"}
        description={selectedLoad ? `Status: ${LOAD_STATUS_LABEL[selectedLoad.status]}` : undefined}
      >
        {selectedId !== null && (
          <LoadDetailPanel loadId={selectedId} onClose={handleDetailPanelClose} />
        )}
      </AppSheet>

      <LoadCreateSheet open={createOpen} onOpenChange={setCreateOpen} />
    </>
  );
}

export default function LoadsPage() {
  return (
    <Suspense>
      <LoadsPageInner />
    </Suspense>
  );
}
