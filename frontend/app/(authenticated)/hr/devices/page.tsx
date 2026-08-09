"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { format } from "date-fns";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { CONTENT_FILL_PANEL } from "@/components/ui/content-fill-panel";
import { useCan } from "@/hooks/api/access";
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
            className="capitalize text-[11px]"
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
  const { data: failedSyncs, isLoading } = useFailedSyncs();

  if (isLoading) return <SyncLogsSkeleton />;

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
  const { data, isLoading } = useDeviceSyncLogs();
  const logs = data?.data ?? [];

  if (isLoading) return <SyncLogsSkeleton />;

  return (
    <SyncLogsTable
      logs={logs}
      emptyTitle="No sync logs yet"
      emptyDescription="Sync activity will appear here after devices sync"
      illustrationPreset="activity"
    />
  );
}

export default function DevicesPage() {
  const canManage = useCan("hr:biometric:manage");
  const [addOpen, setAddOpen] = useState(false);
  const [editDevice, setEditDevice] = useState<TimeDevice | null>(null);

  return (
    <PageWrapper
      title="Time Clock Devices"
      subtitle="Manage biometric, RFID, and mobile time clock devices"
      actions={
        canManage ? (
          <Button onClick={() => setAddOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Device
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
        <Tabs defaultValue="devices" className="flex min-h-0 flex-1 flex-col">
          <TabsList className="shrink-0">
            <TabsTrigger value="devices">Devices</TabsTrigger>
            <TabsTrigger value="failed-syncs">Failed Syncs</TabsTrigger>
            <TabsTrigger value="sync-logs">All Sync Logs</TabsTrigger>
          </TabsList>

          <TabsContent value="devices" className={TAB_CONTENT_CLASS}>
            <DevicesTable
              canManage={canManage}
              onAdd={() => setAddOpen(true)}
              onEdit={(d) => setEditDevice(d)}
            />
          </TabsContent>

          <TabsContent value="failed-syncs" className={TAB_CONTENT_CLASS}>
            <FailedSyncsTab />
          </TabsContent>

          <TabsContent value="sync-logs" className={TAB_CONTENT_CLASS}>
            <AllSyncLogsTab />
          </TabsContent>
        </Tabs>
      </motion.div>

      <DeviceSheet open={addOpen} onOpenChange={setAddOpen} />
      <DeviceSheet
        open={!!editDevice}
        onOpenChange={(v) => {
          if (!v) setEditDevice(null);
        }}
        device={editDevice}
      />
    </PageWrapper>
  );
}
