"use client";

import { useCallback, useMemo } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { RecordList } from "@/components/renderer";
import { useTenantLayout } from "@/components/renderer/use-tenant-layout";
import { InventoryEmptyState } from "@/features/inventory/components/inventory-empty-state";
import { EmptyOrdersIllustration } from "@/components/illustrations";
import { getErrorMessage } from "@/lib/get-error-message";
import { DOCK_APPOINTMENT_LAYOUT } from "@/lib/renderer/inventory/dock-appointment-layout";
import {
  useSetAppointmentStatus,
  type DockAppointment,
} from "@/hooks/api/inventory/stock-types-dock";

type ArrivalStatus = "ARRIVED" | "NO_SHOW";

const TIME_FORMAT: Intl.DateTimeFormatOptions = { hour: "2-digit", minute: "2-digit" };

function formatWindow(startIso: string, endIso: string): string {
  return `${new Date(startIso).toLocaleTimeString(undefined, TIME_FORMAT)}–${new Date(endIso).toLocaleTimeString(undefined, TIME_FORMAT)}`;
}

/**
 * The row as the list shows it: the window and carrier are derived, not stored.
 * Mapped rather than intersected so it stays assignable to the engine's row type.
 */
type DockAppointmentRow = { [K in keyof DockAppointment]: DockAppointment[K] } & {
  window: string;
  carrier: string;
};

function toRow(row: DockAppointment): DockAppointmentRow {
  return {
    ...row,
    window: formatWindow(row.windowStart, row.windowEnd),
    carrier: row.carrierName ?? row.vehicleRef ?? "",
  };
}

function getRowKey(row: DockAppointmentRow) {
  return String(row.id);
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

  const layout = useTenantLayout(DOCK_APPOINTMENT_LAYOUT);
  const rows = useMemo(() => appointments.map(toRow), [appointments]);

  const renderActions = useCallback(
    (row: DockAppointmentRow) =>
      row.status === "BOOKED" ? (
        <AppointmentActions appointmentId={row.id} onSetStatus={handleSetStatus} />
      ) : null,
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
    <RecordList
      layout={layout}
      rows={rows}
      getRowKey={getRowKey}
      actions={renderActions}
      pagination={{ pageSize: 25 }}
      className="flex-1 min-h-0"
    />
  );
}
