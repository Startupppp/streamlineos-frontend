"use client";

import { useCallback } from "react";
import { Badge } from "@/components/ui/badge";
import { PageState } from "@/components/shared/page-state";
import { usePageState } from "@/hooks/api/use-page-state";
import { EmptyState } from "@/components/ui/empty-state";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { useBiometricLogs, type BiometricLog } from "@/hooks/api/hr/biometric";
import { format } from "date-fns";

const columns: DataTableColumn<BiometricLog>[] = [
  {
    key: "device",
    header: "Device",
    cell: (log) => <span className="text-sm">Device #{log.deviceId}</span>,
  },
  {
    key: "employee",
    header: "Employee",
    cell: (log) => (
      <span className="text-sm truncate min-w-0 block max-w-[160px]">{log.userId ?? "—"}</span>
    ),
  },
  {
    key: "punchTime",
    header: "Punch Time",
    cell: (log) => (
      <span className="text-sm">
        {format(new Date(log.punchTime), "dd MMM yyyy, HH:mm")}
      </span>
    ),
  },
  {
    key: "type",
    header: "Type",
    cell: (log) => (
      <Badge
        variant={log.punchType === "IN" ? "default" : "secondary"}
        className="text-dense"
      >
        {log.punchType}
      </Badge>
    ),
  },
  {
    key: "processed",
    header: "Processed",
    cell: (log) => (
      <span
        className={`text-xs font-medium ${log.processed ? "text-status-success-ink" : "text-status-warning-ink"}`}
      >
        {log.processed ? "Yes" : "Pending"}
      </span>
    ),
  },
];

function getRowKey(log: BiometricLog) {
  return log.id;
}

export function BiometricLogsList() {
  const { data: logs, isLoading, isError, error, refetch } = useBiometricLogs();

  const handleRetry = useCallback(() => {
    void refetch();
  }, [refetch]);

  // Gated on hr:attendance:view; the route has no guard, so a denied caller
  // read "No punch logs" (FE-47).
  const pageState = usePageState({ permission: "hr:attendance:view", isLoading, isError, error });

  if (pageState.kind !== "ready" && pageState.kind !== "empty" && pageState.kind !== "loading") {
    return (
      <PageState resolution={pageState} loading={null} onRetry={handleRetry} className="flex-1">
        {null}
      </PageState>
    );
  }

  return (
    <DataTable
      className="flex-1 min-h-0"
      data={logs ?? []}
      columns={columns}
      getRowKey={getRowKey}
      isLoading={isLoading}
      pagination={{ pageSize: 25 }}
      emptyState={
        <EmptyState
          illustrationPreset="activity"
          title="No punch logs"
          description="Biometric punch records will appear here after syncing"
          className="border-0 bg-transparent shadow-none h-64"
          compact
        />
      }
    />
  );
}
