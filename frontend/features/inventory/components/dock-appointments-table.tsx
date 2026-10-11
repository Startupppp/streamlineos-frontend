"use client";

import { useCallback } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { InventoryEmptyState } from "./inventory-empty-state";
import { EmptyOrdersIllustration } from "@/components/illustrations";
import { cn } from "@/lib/utils";
import { getErrorMessage } from "@/lib/get-error-message";
import {
  useSetAppointmentStatus,
  type DockAppointment,
  type DockAppointmentStatus,
} from "@/hooks/api/inventory/stock-types-dock";

const STATUS_BADGE: Record<DockAppointmentStatus, string> = {
  BOOKED: "bg-status-info-surface text-status-info-ink border-status-info-rule",
  ARRIVED: "bg-status-warning-surface text-status-warning-ink border-status-warning-rule",
  COMPLETED: "bg-status-success-surface text-status-success-ink border-status-success-rule",
  CANCELLED: "bg-muted text-muted-foreground border-border",
  NO_SHOW: "bg-status-danger-surface text-status-danger-ink border-status-danger-rule",
};

function formatWindow(startIso: string, endIso: string): string {
  const options: Intl.DateTimeFormatOptions = { hour: "2-digit", minute: "2-digit" };
  return `${new Date(startIso).toLocaleTimeString(undefined, options)}–${new Date(endIso).toLocaleTimeString(undefined, options)}`;
}

interface DockAppointmentsTableProps {
  appointments: DockAppointment[];
}

export function DockAppointmentsTable({ appointments }: DockAppointmentsTableProps) {
  const setStatus = useSetAppointmentStatus();

  const handleSetStatus = useCallback(
    (appointmentId: number, status: "ARRIVED" | "NO_SHOW") => {
      setStatus.mutate(
        { appointmentId, status },
        { onError: (err) => toast.error(getErrorMessage(err)) },
      );
    },
    [setStatus],
  );

  const columns: DataTableColumn<DockAppointment>[] = [
    {
      key: "door",
      header: "Door",
      cell: (row) => <span className="font-mono text-sm font-semibold">{row.doorCode}</span>,
    },
    { key: "window", header: "Window", cell: (row) => formatWindow(row.windowStart, row.windowEnd) },
    { key: "direction", header: "Direction", cell: (row) => row.direction },
    {
      key: "carrier",
      header: "Carrier",
      cell: (row) => row.carrierName ?? row.vehicleRef ?? "—",
    },
    {
      key: "status",
      header: "Status",
      cell: (row) => (
        <Badge variant="outline" className={cn("text-dense", STATUS_BADGE[row.status])}>
          {row.status}
        </Badge>
      ),
    },
    {
      key: "actions",
      header: "",
      cell: (row) =>
        row.status === "BOOKED" ? (
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              className="text-xs"
              onClick={() => handleSetStatus(row.id, "ARRIVED")}
            >
              Arrived
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="text-xs"
              onClick={() => handleSetStatus(row.id, "NO_SHOW")}
            >
              No show
            </Button>
          </div>
        ) : null,
    },
  ];

  if (appointments.length === 0) {
    return (
      <InventoryEmptyState
        illustration={<EmptyOrdersIllustration />}
        title="Nothing booked for this day"
        description="Book a slot above. Two vehicles cannot hold the same door at the same time — the database refuses it, not the screen."
      />
    );
  }

  return (
    <DataTable
      data={appointments}
      columns={columns}
      getRowKey={(row) => row.id}
      pagination={{ pageSize: 25 }}
      className="flex-1 min-h-0"
    />
  );
}
