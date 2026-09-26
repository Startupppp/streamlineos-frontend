"use client";

import { useCallback, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { format } from "date-fns";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { CursorPageControls } from "@/components/ui/cursor-page-controls";
import { CONTENT_FILL_PANEL } from "@/components/ui/content-fill-panel";
import { useCan } from "@/hooks/api/access";
import { PageState } from "@/components/shared/page-state";
import { usePageState } from "@/hooks/api/use-page-state";
import { getErrorMessage } from "@/lib/get-error-message";
import { DevicesTable } from "@/features/hr/enterprise/comp/devices-table";
import { DeviceSheet } from "@/features/hr/enterprise/comp/device-sheet";
import {
  useFailedSyncs,
  useDeviceSyncLogs,
  type TimeDevice,
  type DeviceSyncLog,
} from "@/hooks/api/hr/enterprise-comp";

const TAB_CONTENT_CLASS = "mt-4 flex min-h-0 flex-1 flex-col";

const SYNC_STATUS_VARIANT: Record<
  DeviceSyncLog["status"],
  "default" | "secondary" | "destructive"
> = {
  success: "default",
  partial: "secondary",
  failed: "destructive",
};

function SyncLogsSkeleton() {
  return (
    <div className="space-y-2">
      {Array.from({ length: 8 }).map((_, i) => (
        <Skeleton key={i} className="h-12 rounded-lg" />
      ))}
    </div>
  );
}

function SyncLogsTable({
  logs,
  emptyTitle,
  emptyDescription,
  illustrationPreset,
}: {
  logs: DeviceSyncLog[];
  emptyTitle: string;
  emptyDescription: string;
  illustrationPreset: "default" | "devices" | "activity";
}) {
  const columns = useMemo<DataTableColumn<DeviceSyncLog>[]>(
    () => [
      {
        key: "deviceId",
        header: "Device",
        cell: (r) => (
          <span className="font-medium text-sm">Device #{r.deviceId}</span>
        ),
      },
      {
        key: "status",
        header: "Status",
        cell: (r) => (
          <Badge
            variant={SYNC_STATUS_VARIANT[r.status]}
            className="capitalize text-dense"
          >
            {r.status}
          </Badge>
        ),
      },
      {
        key: "recordsCount",
        header: "Records",
        cell: (r) => (
          <span className="tabular-nums text-sm">{r.recordsCount}</span>
        ),
      },
      {
        key: "error",
        header: "Error",
        cell: (r) =>
          r.error ? (
            <span className="line-clamp-1 max-w-[280px] text-xs text-destructive">
              {r.error}
            </span>
          ) : (
            <span className="text-xs text-muted-foreground">—</span>
          ),
      },
      {
        key: "syncedAt",
        header: "Synced",
        cell: (r) => (
          <span className="text-xs text-muted-foreground tabular-nums">
            {format(new Date(r.syncedAt), "dd MMM yyyy HH:mm")}
          </span>
        ),
      },
    ],
    [],
  );

  if (!logs.length) {
    return (
      <EmptyState
        illustrationPreset={illustrationPreset}
        title={emptyTitle}
        description={emptyDescription}
        className={CONTENT_FILL_PANEL}
        compact
      />
    );
  }

  return (
    <DataTable
      className="flex-1 min-h-0"
      getRowKey={(r) => r.id}
      columns={columns}
      data={logs}
    />
  );
}

function FailedSyncsTab() {
  const { data: failedSyncs, isLoading, isError, error, refetch } = useFailedSyncs();

  const handleRetry = useCallback(() => {
    void refetch();
  }, [refetch]);

  if (isLoading) return <SyncLogsSkeleton />;

  if (isError) {
    return (
      <ErrorState
        className={CONTENT_FILL_PANEL}
        title="Couldn't load failed syncs"
        description={getErrorMessage(error)}
        onRetry={handleRetry}
      />
    );
  }

  return (
    <SyncLogsTable
      logs={failedSyncs ?? []}
      emptyTitle="No failed syncs"
      emptyDescription="All device syncs completed successfully"
      illustrationPreset="devices"
    />
  );
}

function AllSyncLogsTab() {
  const [cursorHistory, setCursorHistory] = useState<Array<string | undefined>>([undefined]);
  const page = cursorHistory.length;
  const cursor = cursorHistory.at(-1);
  const { data, isLoading, isFetching, isError, error, refetch } = useDeviceSyncLogs({ cursor });
  const logs = data?.data ?? [];

  const handlePreviousPage = useCallback(() => {
    setCursorHistory((history) => history.length > 1 ? history.slice(0, -1) : history);
  }, []);

  const handleNextPage = useCallback(() => {
    const nextCursor = data?.pagination.nextCursor;
    if (nextCursor) setCursorHistory((history) => [...history, nextCursor]);
  }, [data?.pagination.nextCursor]);

  const handleRetry = useCallback(() => {
    void refetch();
  }, [refetch]);

  if (isLoading) return <SyncLogsSkeleton />;

  if (isError) {
    return (
      <ErrorState
        className={CONTENT_FILL_PANEL}
        title="Couldn't load sync logs"
        description={getErrorMessage(error)}
        onRetry={handleRetry}
      />
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      <SyncLogsTable
        logs={logs}
        emptyTitle="No sync logs yet"
        emptyDescription="Sync activity will appear here after devices sync"
        illustrationPreset="activity"
      />
      {data && (page > 1 || data.pagination.hasMore) ? (
        <CursorPageControls
          page={page}
          hasNext={data.pagination.hasMore}
          disabled={isFetching}
          onPrevious={handlePreviousPage}
          onNext={handleNextPage}
        />
      ) : null}
    </div>
  );
}

export function DevicesPage() {
  const canManage = useCan("hr:biometric:manage");
  // All three tabs read hr:biometric:manage-gated queries; a denied read looks
  // like "No sync logs yet" unless denial is resolved first (FE-47).
  const pageState = usePageState({
    permission: "hr:biometric:manage",
    isLoading: false,
    isError: false,
    error: null,
  });
  const [addOpen, setAddOpen] = useState(false);
  const [editDevice, setEditDevice] = useState<TimeDevice | null>(null);

  function handleAddOpen() {
    setAddOpen(true);
  }

  function handleEditDevice(d: TimeDevice) {
    setEditDevice(d);
  }

  function handleEditOpenChange(v: boolean) {
    if (!v) setEditDevice(null);
  }

  return (
    <PageWrapper
      title="Time Clock Devices"
      subtitle="Manage biometric, RFID, and mobile time clock devices"
      actions={
        canManage ? (
          <Button onClick={handleAddOpen}>
            <Plus className="h-4 w-4 mr-2" />
            Register device
          </Button>
        ) : undefined
      }
    >
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.22, ease: "easeOut" }}
        className="flex min-h-0 flex-1 flex-col"
      >
        <PageState resolution={pageState} loading={<SyncLogsSkeleton />} className="flex-1">
        <Tabs defaultValue="devices" className="flex min-h-0 flex-1 flex-col">
          <TabsList className="shrink-0">
            <TabsTrigger value="devices">Devices</TabsTrigger>
            <TabsTrigger value="failed-syncs">Failed Syncs</TabsTrigger>
            <TabsTrigger value="sync-logs">All Sync Logs</TabsTrigger>
          </TabsList>

          <TabsContent value="devices" className={TAB_CONTENT_CLASS}>
            <DevicesTable
              canManage={canManage}
              onAdd={handleAddOpen}
              onEdit={handleEditDevice}
            />
          </TabsContent>

          <TabsContent value="failed-syncs" className={TAB_CONTENT_CLASS}>
            <FailedSyncsTab />
          </TabsContent>

          <TabsContent value="sync-logs" className={TAB_CONTENT_CLASS}>
            <AllSyncLogsTab />
          </TabsContent>
        </Tabs>
        </PageState>
      </motion.div>

      <DeviceSheet open={addOpen} onOpenChange={setAddOpen} />
      <DeviceSheet
        open={!!editDevice}
        onOpenChange={handleEditOpenChange}
        device={editDevice}
      />
    </PageWrapper>
  );
}
