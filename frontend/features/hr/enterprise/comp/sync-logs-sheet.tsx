"use client";

import { format } from "date-fns";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
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
      <SheetContent className="w-full sm:max-w-lg flex flex-col gap-0 p-0">
        <SheetHeader className="px-6 py-4 border-b">
          <SheetTitle>Sync Logs</SheetTitle>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-2">
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
              <div key={log.id} className="flex items-center justify-between p-3 rounded-lg border bg-card">
                <div className="flex items-center gap-3 min-w-0">
                  <Badge variant={STATUS_VARIANT[log.status]} className="capitalize shrink-0">{log.status}</Badge>
                  <div className="min-w-0">
                    <p className="text-sm text-foreground">{log.recordsCount} records</p>
                    {log.error && <p className="text-xs text-red-500 truncate max-w-xs">{log.error}</p>}
                  </div>
                </div>
                <span className="text-xs text-muted-foreground shrink-0">{format(new Date(log.syncedAt), "dd MMM HH:mm")}</span>
              </div>
            ))
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
