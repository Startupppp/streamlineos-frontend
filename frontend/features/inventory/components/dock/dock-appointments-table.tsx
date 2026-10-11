"use client";

import { useCallback, useMemo } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { InventoryEmptyState } from "@/features/inventory/components/inventory-empty-state";
import { EmptyOrdersIllustration } from "@/components/illustrations";
import { cn } from "@/lib/utils";
import { getErrorMessage } from "@/lib/get-error-message";
import {
  useSetAppointmentStatus,
  type DockAppointment,
  type DockAppointmentStatus,
} from "@/hooks/api/inventory/stock-types-dock";

type ArrivalStatus = "ARRIVED" | "NO_SHOW";

const STATUS_BADGE: Record<DockAppointmentStatus, string> = {
  BOOKED: "bg-status-info-surface text-status-info-ink border-status-info-rule",
  ARRIVED: "bg-status-warning-surface text-status-warning-ink border-status-warning-rule",
  COMPLETED: "bg-status-success-surface text-status-success-ink border-status-success-rule",
  CANCELLED: "bg-muted text-muted-foreground border-border",
  NO_SHOW: "bg-status-danger-surface text-status-danger-ink border-status-danger-rule",
};

const TIME_FORMAT: Intl.DateTimeFormatOptions = { hour: "2-digit", minute: "2-digit" };

function formatWindow(startIso: string, endIso: string): string {
  return `${new Date(startIso).toLocaleTimeString(undefined, TIME_FORMAT)}–${new Date(endIso).toLocaleTimeString(undefined, TIME_FORMAT)}`;
}

function getRowKey(row: DockAppointment) {
  return row.id;
}

interface AppointmentActionsProps {
  appointmentId: number;
  onSetStatus: (appointmentId: number, status: ArrivalStatus) => void;
}

function AppointmentActions({ appointmentId, onSetStatus }: AppointmentActionsProps) {
  const handleArrived = useCallback(
    () => onSetStatus(appointmentId, "ARRIVED"),
    [appointmentId, onSetStatus],
  );
  const handleNoShow = useCallback(
    () => onSetStatus(appointmentId, "NO_SHOW"),
    [appointmentId, onSetStatus],
  );
  return (
    <div className="flex gap-2">
      <Button type="button" size="sm" variant="outline" onClick={handleArrived}>
        Arrived
      </Button>
      <Button type="button" size="sm" variant="ghost" onClick={handleNoShow}>
        No show
      </Button>
    </div>
  );
}

interface DockAppointmentsTableProps {
  appointments: DockAppointment[];
}

export function DockAppointmentsTable({ appointments }: DockAppointmentsTableProps) {
  const { mutate: setStatus } = useSetAppointmentStatus();

  const handleSetStatus = useCallback(
    (appointmentId: number, status: ArrivalStatus) => {
      setStatus(
        { appointmentId, status },
        { onError: (err) => toast.error(getErrorMessage(err)) },
      );
    },
    [setStatus],
  );

  const columns = useMemo<DataTableColumn<DockAppointment>[]>(
    () => [
      {
        key: "door",
        header: "Door",
        cell: (row) => <span className="font-mono text-sm font-semibold">{row.doorCode}</span>,
      },
      {
        key: "window",
        header: "Window",
        cell: (row) => (
          <span className="tabular-nums">{formatWindow(row.windowStart, row.windowEnd)}</span>
        ),
      },
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
            <AppointmentActions appointmentId={row.id} onSetStatus={handleSetStatus} />
          ) : null,
      },
    ],
    [handleSetStatus],
  );

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
      getRowKey={getRowKey}
      pagination={{ pageSize: 25 }}
      className="flex-1 min-h-0"
    />
  );
}
