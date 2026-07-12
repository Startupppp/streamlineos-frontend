"use client";

import type React from "react";
import { useState, useCallback, useMemo, Suspense } from "react";
import { Info, RefreshCw } from "lucide-react";
import { PlusIcon } from "@animateicons/react/lucide";
import { toast } from "sonner";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { InventoryEmptyState } from "@/features/inventory/components/inventory-empty-state";
import { ErrorState } from "@/components/shared";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { EmptySearchIllustration } from "@/components/illustrations";
import { cn } from "@/lib/utils";
import { SYNC_STATUS_BADGE, SYNC_STATUS_LABEL } from "@/features/inventory/lib";
import {
  useThreePlConnections,
  useSyncThreePlConnection,
  type ThreePlConnection,
} from "@/hooks/api/inventory/channels";
import { getErrorMessage } from "@/lib/get-error-message";
import { useAnimatedIcon } from "@/hooks/common/use-animated-icon";
import { ThreePlConnectionSheet } from "@/features/inventory/components/channels/three-pl-connection-sheet";

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
}

function SkeletonRows() {
  return (
    <div className="space-y-2">
      {Array.from({ length: 5 }).map((_, i) => (
        <Skeleton key={i} className="h-10 w-full rounded-md" />
      ))}
    </div>
  );
}

interface SyncButtonCellProps {
  connectionId: number;
}

function SyncButtonCell({ connectionId }: SyncButtonCellProps) {
  const syncMutation = useSyncThreePlConnection();

  function handleSync(e: React.MouseEvent): void {
    e.stopPropagation();
    syncMutation.mutate(connectionId, {
      onSuccess: () => toast.success("Sync triggered"),
      onError: (err) => toast.error(getErrorMessage(err)),
    });
  }

  return (
    <Button
      size="sm"
      variant="outline"
      className="h-7 text-xs gap-1.5"
      onClick={handleSync}
      disabled={syncMutation.isPending}
    >
      <RefreshCw className="h-3 w-3" />
      {syncMutation.isPending ? "Syncing…" : "Sync"}
    </Button>
  );
}

function ThreePlContent() {
  const { data, isLoading, isError, refetch } = useThreePlConnections();
  const connections = useMemo(() => (Array.isArray(data) ? data : []), [data]);

  const [sheetOpen, setSheetOpen] = useState(false);
  const [editConnection, setEditConnection] = useState<ThreePlConnection | undefined>(undefined);
  const { iconRef: addIconRef, hoverHandlers: addHoverHandlers } = useAnimatedIcon();

  const handleAddConnection = useCallback(() => {
    setEditConnection(undefined);
    setSheetOpen(true);
  }, []);

  const handleRowClick = useCallback((row: ThreePlConnection) => {
    setEditConnection(row);
    setSheetOpen(true);
  }, []);

  const handleSheetOpenChange = useCallback((open: boolean) => {
    setSheetOpen(open);
    if (!open) setEditConnection(undefined);
  }, []);

  function handleRetry(): void {
    void refetch();
  }

  const columns: DataTableColumn<ThreePlConnection>[] = useMemo(
    () => [
      {
        key: "name",
        header: "Name",
        cell: (row) => <span className="font-medium text-sm">{row.name}</span>,
        sortable: true,
        sortValue: (row) => row.name,
      },
      {
        key: "providerKey",
        header: "Provider",
        cell: (row) => (
          <span className="font-mono text-[11px] text-muted-foreground">{row.providerKey}</span>
        ),
      },
      {
        key: "isActive",
        header: "Active",
        cell: (row) => (
          <Badge
            variant="outline"
            className={cn(
              "text-[11px]",
              row.isActive
                ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                : "bg-slate-100 text-slate-700 border-slate-200",
            )}
          >
            {row.isActive ? "Active" : "Inactive"}
          </Badge>
        ),
      },
      {
        key: "syncStatus",
        header: "Sync Status",
        cell: (row) => {
          const isNotConnected =
            row.lastSyncError !== null &&
            row.lastSyncError.toLowerCase().includes("not connected");

          if (isNotConnected) {
            return (
              <div className="flex items-center gap-1.5">
                <Info className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                <span className="text-xs text-amber-600">Not connected</span>
              </div>
            );
          }

          if (!row.lastSyncStatus) {
            return <span className="text-xs text-muted-foreground">—</span>;
          }

          return (
            <Badge
              variant="outline"
              className={cn("text-[11px]", SYNC_STATUS_BADGE[row.lastSyncStatus])}
            >
              {SYNC_STATUS_LABEL[row.lastSyncStatus]}
            </Badge>
          );
        },
      },
      {
        key: "lastSyncAt",
        header: "Last Sync",
        cell: (row) => (
          <span className="text-xs text-muted-foreground">{formatDate(row.lastSyncAt)}</span>
        ),
      },
      {
        key: "error",
        header: "Error",
        cell: (row) => {
          const isNotConnected =
            row.lastSyncError !== null &&
            row.lastSyncError.toLowerCase().includes("not connected");

          if (isNotConnected) {
            return <span className="text-xs text-muted-foreground">—</span>;
          }

          return row.lastSyncError ? (
            <span
              className="text-xs text-red-600 truncate max-w-[180px] block"
              title={row.lastSyncError}
            >
              {row.lastSyncError}
            </span>
          ) : (
            <span className="text-xs text-muted-foreground">—</span>
          );
        },
      },
      {
        key: "actions",
        header: "",
        cell: (row) => <SyncButtonCell connectionId={row.id} />,
      },
    ],
    [],
  );

  const actions = (
    <Button size="sm" className="h-8 gap-1.5 text-xs" onClick={handleAddConnection} {...addHoverHandlers}>
      <PlusIcon ref={addIconRef} size={14} />
      Add Connection
    </Button>
  );

  if (isLoading) {
    return (
      <PageWrapper
        eyebrow="Inventory · Channels"
        title="3PL Connections"
        subtitle="Manage third-party logistics provider connections"
        actions={actions}
      >
        <SkeletonRows />
      </PageWrapper>
    );
  }

  if (isError) {
    return (
      <PageWrapper
        eyebrow="Inventory · Channels"
        title="3PL Connections"
        subtitle="Manage third-party logistics provider connections"
        actions={actions}
      >
        <ErrorState
          title="Failed to load 3PL connections"
          description="An error occurred while fetching connection data."
          onRetry={handleRetry}
        />
      </PageWrapper>
    );
  }

  return (
    <>
      <PageWrapper
        eyebrow="Inventory · Channels"
        title="3PL Connections"
        subtitle="Manage third-party logistics provider connections"
        badge={connections.length > 0 ? String(connections.length) : undefined}
        actions={actions}
      >
        {connections.length > 0 ? (
          <DataTable<ThreePlConnection>
            data={connections}
            columns={columns}
            getRowKey={(row) => row.id}
            onRowClick={handleRowClick}
          />
        ) : (
          <InventoryEmptyState
            illustration={<EmptySearchIllustration />}
            title="No 3PL connections"
            description="Add a third-party logistics provider to enable fulfilment integrations."
            action={{ label: "Add Connection", onClick: handleAddConnection }}
          />
        )}
      </PageWrapper>

      <ThreePlConnectionSheet
        open={sheetOpen}
        onOpenChange={handleSheetOpenChange}
        connection={editConnection}
      />
    </>
  );
}

export default function ThreePlPage() {
  return (
    <Suspense>
      <ThreePlContent />
    </Suspense>
  );
}
