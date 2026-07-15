"use client";

import { format } from "date-fns";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetBody } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { useDeviceSyncLogs } from "@/hooks/api/hr/enterprise-comp";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  deviceId?: number | null;
}

const STATUS_VARIANT: Record<string, "default" | "secondary" | "destructive"> = {
  success: "default",
  partial: "secondary",
  failed: "destructive",
};

export function SyncLogsSheet({ open, onOpenChange, deviceId }: Props) {
  const { data, isLoading } = useDeviceSyncLogs(deviceId ? { deviceId } : undefined);
  const logs = data?.data ?? [];

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="flex w-full flex-col gap-0 overflow-hidden p-0 sm:max-w-lg">
        <SheetHeader className="shrink-0 border-b border-border px-6 py-4 text-left">
          <SheetTitle>Sync Logs</SheetTitle>
        </SheetHeader>

        <SheetBody className="space-y-2 px-6 py-4">
          {isLoading ? (
            Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-10 rounded-lg" />)
          ) : !logs.length ? (
            <EmptyState
              illustrationPreset="default"
              title="No sync logs"
              description="Sync logs will appear here after devices sync"
              compact
              className="h-48 border-0 shadow-none"
            />
          ) : (
            logs.map((log) => (
              <div key={log.id} className="flex items-center justify-between rounded-lg border bg-card p-3">
                <div className="flex min-w-0 items-center gap-3">
                  <Badge variant={STATUS_VARIANT[log.status]} className="shrink-0 capitalize">{log.status}</Badge>
                  <div className="min-w-0">
                    <p className="text-sm text-foreground">{log.recordsCount} records</p>
                    {log.error && <p className="max-w-xs truncate text-xs text-red-500">{log.error}</p>}
                  </div>
                </div>
                <span className="shrink-0 text-xs text-muted-foreground">{format(new Date(log.syncedAt), "dd MMM HH:mm")}</span>
              </div>
            ))
          )}
        </SheetBody>
      </SheetContent>
    </Sheet>
  );
}
