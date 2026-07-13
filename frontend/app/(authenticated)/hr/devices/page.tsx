"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { useCan } from "@/hooks/api/access";
import { DevicesTable } from "@/features/hr/enterprise/comp/devices-table";
import { DeviceSheet } from "@/features/hr/enterprise/comp/device-sheet";
import { SyncLogsSheet } from "@/features/hr/enterprise/comp/sync-logs-sheet";
import { useFailedSyncs } from "@/hooks/api/hr/enterprise-comp";
import type { TimeDevice } from "@/hooks/api/hr/enterprise-comp";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";

export default function DevicesPage() {
  const canManage = useCan("hr:biometric:manage");
  const [addOpen, setAddOpen] = useState(false);
  const [editDevice, setEditDevice] = useState<TimeDevice | null>(null);
  const [logsOpen, setLogsOpen] = useState(false);

  const { data: failedSyncs, isLoading: failedLoading } = useFailedSyncs();

  return (
    <PageWrapper
      title="Time Clock Devices"
      subtitle="Manage biometric, RFID, and mobile time clock devices"
      actions={
        canManage ? (
          <Button onClick={() => setAddOpen(true)} className="bg-primary hover:bg-primary/90 text-primary-foreground">
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
      >
        <Tabs defaultValue="devices">
          <TabsList className="mb-4">
            <TabsTrigger value="devices">Devices</TabsTrigger>
            <TabsTrigger value="failed-syncs">Failed Syncs</TabsTrigger>
            <TabsTrigger value="sync-logs">All Sync Logs</TabsTrigger>
          </TabsList>

          <TabsContent value="devices">
            <DevicesTable
              canManage={canManage}
              onAdd={() => setAddOpen(true)}
              onEdit={(d) => setEditDevice(d)}
            />
          </TabsContent>

          <TabsContent value="failed-syncs">
            {failedLoading ? (
              <div className="space-y-2">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-12 rounded-lg" />)}</div>
            ) : !failedSyncs?.length ? (
              <EmptyState illustrationPreset="default" title="No failed syncs" description="All device syncs completed successfully" compact className="h-48 border-0 shadow-none" />
            ) : (
              <div className="space-y-2">
                {failedSyncs.map((log) => (
                  <div key={log.id} className="flex items-center justify-between p-3 rounded-lg border bg-card">
                    <div>
                      <p className="text-sm font-medium">Device #{log.deviceId}</p>
                      {log.error && <p className="text-xs text-red-500">{log.error}</p>}
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="destructive">Failed</Badge>
                      <span className="text-xs text-muted-foreground">{format(new Date(log.syncedAt), "dd MMM HH:mm")}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="sync-logs">
            <Button variant="outline" size="sm" onClick={() => setLogsOpen(true)}>
              View Full Sync Log
            </Button>
          </TabsContent>
        </Tabs>
      </motion.div>

      <DeviceSheet open={addOpen} onOpenChange={setAddOpen} />
      <DeviceSheet open={!!editDevice} onOpenChange={(v) => { if (!v) setEditDevice(null); }} device={editDevice} />
      <SyncLogsSheet open={logsOpen} onOpenChange={setLogsOpen} />
    </PageWrapper>
  );
}
