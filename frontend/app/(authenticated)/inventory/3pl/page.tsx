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
import { ErrorState } from "@/components/shared/error-state";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { EmptySearchIllustration } from "@/components/illustrations";
import { cn } from "@/lib/utils";
import { LoadingButton } from "@/components/ui/loading-button";
import { SYNC_STATUS_BADGE, SYNC_STATUS_LABEL, type SyncStatus } from "@/features/inventory/lib";
import {
  useThreePlConnections,
  useSyncThreePlConnection,
  type ThreePlConnection,
} from "@/hooks/api/inventory/channels";
import { getErrorMessage } from "@/lib/get-error-message";
import { useAnimatedIcon } from "@/hooks/common/use-animated-icon";
import { ThreePlConnectionSheet } from "@/features/inventory/components/channels/three-pl-connection-sheet";

const SYNC_STATUS_VALUES: ReadonlyArray<SyncStatus> = ["IDLE", "SYNCING", "SUCCESS", "ERROR", "PAUSED"];

function resolveSyncStatus(raw: string | null): SyncStatus | undefined {
  if (!raw) return undefined;
  return SYNC_STATUS_VALUES.find((s) => s === raw);
}

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
}

function SkeletonRows() {
  return (
    <div className="space-y-2">
      {Array.from({ length: 10 }).map((_, i) => (
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
    <LoadingButton
      size="sm"
      variant="outline"
      className="text-xs gap-1.5"
      onClick={handleSync}
      isPending={syncMutation.isPending}
      loadingText="Syncing…"
    >
      <RefreshCw className="h-3 w-3" />
      Sync
    </LoadingButton>
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
        key: "provider",
        header: "Provider",
        cell: (row) => (
          <span className="font-mono text-dense text-muted-foreground">{row.provider}</span>
        ),
      },
      {
        key: "status",
        header: "Status",
        cell: (row) => (
          <Badge
            variant="outline"
            className={cn(
              "text-dense",
              row.status === "CONNECTED"
                ? "bg-status-success-surface text-status-success-ink border-status-success-rule"
                : row.status === "ERROR"
                  ? "bg-status-danger-surface text-status-danger-ink border-status-danger-rule"
                  : "bg-muted text-muted-foreground border-border",
            )}
          >
            {row.status === "CONNECTED" ? "Connected" : row.status === "ERROR" ? "Error" : "Disconnected"}
          </Badge>
        ),
      },
      {
        key: "syncStatus",
        header: "Sync Status",
        cell: (row) => {
          const isNotConnected =
            row.lastSyncStatus !== null &&
            row.lastSyncStatus.toLowerCase().includes("not connected");

          if (isNotConnected) {
            return (
              <div className="flex items-center gap-1.5">
                <Info className="h-3.5 w-3.5 text-status-warning-ink shrink-0" />
                <span className="text-xs text-status-warning-ink">Not connected</span>
              </div>
            );
          }

          const syncStatus = resolveSyncStatus(row.lastSyncStatus);
          if (!syncStatus) return <span className="text-xs text-muted-foreground">—</span>;

          return (
            <Badge
              variant="outline"
              className={cn("text-dense", SYNC_STATUS_BADGE[syncStatus])}
            >
              {SYNC_STATUS_LABEL[syncStatus]}
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
            row.lastSyncStatus !== null &&
            row.lastSyncStatus.toLowerCase().includes("not connected");

          if (isNotConnected) {
            return <span className="text-xs text-muted-foreground">—</span>;
          }

          const syncStatus = resolveSyncStatus(row.lastSyncStatus);
          const rawError = !syncStatus ? row.lastSyncStatus : null;

          return rawError ? (
            <span
              className="text-xs text-status-danger-ink truncate max-w-[180px] block"
              title={rawError}
            >
              {rawError}
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
    <Button onClick={handleAddConnection} {...addHoverHandlers}>
      <PlusIcon ref={addIconRef} size={14} />
      Add Connection
    </Button>
  );

  if (isLoading) {
    return (
      <PageWrapper
        title="3PL Connections"
        subtitle="Manage third-party logistics provider connections"
        actions={actions}
      >
        <div className="flex flex-1 min-h-0 flex-col gap-4">
          <SkeletonRows />
        </div>
      </PageWrapper>
    );
  }

  if (isError) {
    return (
      <PageWrapper
        title="3PL Connections"
        subtitle="Manage third-party logistics provider connections"
        actions={actions}
      >
        <div className="flex flex-1 min-h-0 flex-col gap-4">
          <ErrorState
            title="Failed to load 3PL connections"
            description="An error occurred while fetching connection data."
            onRetry={handleRetry}
          />
        </div>
      </PageWrapper>
    );
  }

  return (
    <>
      <PageWrapper
        title="3PL Connections"
        subtitle="Manage third-party logistics provider connections"
        actions={actions}
      >
        <div className="flex flex-1 min-h-0 flex-col gap-4">
          {connections.length > 0 ? (
            <DataTable<ThreePlConnection>
              data={connections}
              columns={columns}
              className="flex-1 min-h-0"
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
        </div>
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
