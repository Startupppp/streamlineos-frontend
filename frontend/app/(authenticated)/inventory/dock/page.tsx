"use client";

import { Suspense, useCallback, useMemo, useState } from "react";
import { toast } from "sonner";
import { CalendarClock } from "lucide-react";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { LoadingButton } from "@/components/ui/loading-button";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { ErrorState, NoPermissionState } from "@/components/shared";
import { InventoryEmptyState } from "@/features/inventory/components/inventory-empty-state";
import { EmptyOrdersIllustration } from "@/components/illustrations";
import { cn } from "@/lib/utils";
import { getErrorMessage } from "@/lib/get-error-message";
import { useCan } from "@/hooks/api/access";
import {
  useBookAppointment,
  useDockAppointments,
  useDockDoors,
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

function startOfDay(date: Date): string {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  return copy.toISOString();
}

function formatWindow(startIso: string, endIso: string): string {
  const options: Intl.DateTimeFormatOptions = { hour: "2-digit", minute: "2-digit" };
  return `${new Date(startIso).toLocaleTimeString(undefined, options)}–${new Date(endIso).toLocaleTimeString(undefined, options)}`;
}

function DockContent() {
  const canView = useCan("inventory:dock:manage");
  const [day, setDay] = useState(() => new Date().toISOString().slice(0, 10));

  const range = useMemo(() => {
    const from = new Date(`${day}T00:00:00`);
    const to = new Date(from);
    to.setDate(to.getDate() + 1);
    return { from: startOfDay(from), to: to.toISOString() };
  }, [day]);

  const doors = useDockDoors();
  const appointments = useDockAppointments(range);
  const book = useBookAppointment();
  const setStatus = useSetAppointmentStatus();

  const [doorId, setDoorId] = useState("");
  const [windowStart, setWindowStart] = useState("");
  const [windowEnd, setWindowEnd] = useState("");
  const [carrierName, setCarrierName] = useState("");

  const rows = useMemo(
    () => (Array.isArray(appointments.data) ? appointments.data : []),
    [appointments.data],
  );

  const handleRetry = useCallback(() => {
    void appointments.refetch();
    void doors.refetch();
  }, [appointments, doors]);

  const handleBook = useCallback(() => {
    const door = Number(doorId);
    if (!Number.isInteger(door) || door <= 0) {
      toast.error("Choose a door");
      return;
    }
    if (windowStart === "" || windowEnd === "") {
      toast.error("Enter the window");
      return;
    }
    book.mutate(
      {
        doorId: door,
        direction: "INBOUND",
        windowStart: new Date(`${day}T${windowStart}`).toISOString(),
        windowEnd: new Date(`${day}T${windowEnd}`).toISOString(),
        ...(carrierName ? { carrierName } : {}),
      },
      {
        onSuccess: () => {
          toast.success("Slot booked");
          setWindowStart("");
          setWindowEnd("");
        },
        // A collision comes back as a 409 naming the door and the window,
        // because the caller's next act is to pick a different one.
        onError: (err) => toast.error(getErrorMessage(err)),
      },
    );
  }, [book, carrierName, day, doorId, windowEnd, windowStart]);

  const COLUMNS: DataTableColumn<DockAppointment>[] = [
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
              onClick={() => setStatus.mutate({ appointmentId: row.id, status: "ARRIVED" })}
            >
              Arrived
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="text-xs"
              onClick={() => setStatus.mutate({ appointmentId: row.id, status: "NO_SHOW" })}
            >
              No show
            </Button>
          </div>
        ) : null,
    },
  ];

  if (!canView) {
    return (
      <PageWrapper title="Dock">
        <NoPermissionState permission="inventory:dock:manage" className="flex-1" />
      </PageWrapper>
    );
  }

  if (appointments.isLoading) {
    return (
      <PageWrapper title="Dock">
        <div className="space-y-3">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-full" />
          ))}
        </div>
      </PageWrapper>
    );
  }

  if (appointments.isError) {
    return (
      <PageWrapper title="Dock">
        <ErrorState
          title="Failed to load the dock calendar"
          description="An error occurred while fetching appointments."
          onRetry={handleRetry}
        />
      </PageWrapper>
    );
  }

  return (
    <PageWrapper
      title="Dock"
      subtitle="Which vehicle is at which door, and when"
      actions={
        <Input
          type="date"
          aria-label="Day"
          className="w-40"
          value={day}
          onChange={(e) => setDay(e.target.value)}
        />
      }
    >
      <div className="flex flex-1 min-h-0 flex-col gap-4">
        <div className="rounded-lg border border-border bg-muted/30 p-4 space-y-3">
          <p className="text-dense font-semibold uppercase tracking-wider text-muted-foreground">
            Book a slot
          </p>
          <div className="grid gap-3 sm:grid-cols-4">
            <div className="space-y-1.5">
              <Label htmlFor="dock-door">Door id</Label>
              <Input
                id="dock-door"
                inputMode="numeric"
                value={doorId}
                onChange={(e) => setDoorId(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="dock-from">From</Label>
              <Input
                id="dock-from"
                type="time"
                value={windowStart}
                onChange={(e) => setWindowStart(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="dock-to">To</Label>
              <Input
                id="dock-to"
                type="time"
                value={windowEnd}
                onChange={(e) => setWindowEnd(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="dock-carrier">Carrier</Label>
              <Input
                id="dock-carrier"
                value={carrierName}
                onChange={(e) => setCarrierName(e.target.value)}
              />
            </div>
          </div>
          <LoadingButton size="sm" onClick={handleBook} isPending={book.isPending} loadingText="Booking…">
            <CalendarClock className="h-3.5 w-3.5" />
            Book
          </LoadingButton>
        </div>

        {rows.length > 0 ? (
          <DataTable
            data={rows}
            columns={COLUMNS}
            getRowKey={(row) => row.id}
            className="flex-1 min-h-0"
          />
        ) : (
          <InventoryEmptyState
            illustration={<EmptyOrdersIllustration />}
            title="Nothing booked for this day"
            description="Book a slot above. Two vehicles cannot hold the same door at the same time — the database refuses it, not the screen."
          />
        )}
      </div>
    </PageWrapper>
  );
}

export default function DockPage() {
  return (
    <Suspense>
      <DockContent />
    </Suspense>
  );
}
