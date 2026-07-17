"use client";

import { Badge } from "@/components/ui/badge";
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
        className="text-[11px]"
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
        className={`text-xs font-medium ${log.processed ? "text-emerald-600" : "text-amber-600"}`}
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
  const { data: logs, isLoading } = useBiometricLogs();

  return (
    <DataTable
      className="flex-1 min-h-0"
      data={logs ?? []}
      columns={columns}
      getRowKey={getRowKey}
      isLoading={isLoading}
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
