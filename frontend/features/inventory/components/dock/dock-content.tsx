"use client";

import { useCallback, useMemo, useState } from "react";
import { DatePicker } from "@/components/ui/date-picker";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Skeleton } from "@/components/ui/skeleton";
import { PageState } from "@/components/shared/page-state";
import { NoPermissionState } from "@/components/shared/no-permission-state";
import { usePageState } from "@/hooks/api/use-page-state";
import {
  useDockAppointments,
  useDockDoors,
} from "@/hooks/api/inventory/stock-types-dock";
import { DockBookingForm } from "./dock-booking-form";
import { DockAppointmentsTable } from "./dock-appointments-table";

const SKELETON_ROWS = ["r1", "r2", "r3", "r4", "r5", "r6", "r7", "r8"];

function dayRange(day: string) {
  const from = new Date(`${day}T00:00:00`);
  const to = new Date(from);
  to.setDate(to.getDate() + 1);
  return { from: from.toISOString(), to: to.toISOString() };
}

function DockSkeleton() {
  return (
    <div className="space-y-3">
      {SKELETON_ROWS.map((row) => (
        <Skeleton key={row} className="h-10 w-full" />
      ))}
    </div>
  );
}

export function DockContent() {
  const [day, setDay] = useState(() => new Date().toISOString().slice(0, 10));
  const range = useMemo(() => dayRange(day), [day]);

  const doors = useDockDoors();
  const appointments = useDockAppointments(range);

  const pageState = usePageState({
    permission: "inventory:dock:manage",
    isLoading: appointments.isLoading,
    isError: appointments.isError,
    error: appointments.error,
  });

  // The denied answer PageState would draw, stated here so the route owns it.
  const deniedView =
    pageState.kind === "denied" ? (
      <NoPermissionState
        permission={pageState.permission ?? undefined}
        description={pageState.message}
      />
    ) : null;

  const { refetch: refetchAppointments } = appointments;
  const { refetch: refetchDoors } = doors;
  const handleRetry = useCallback(() => {
    void refetchAppointments();
    void refetchDoors();
  }, [refetchAppointments, refetchDoors]);

  const rows = useMemo(
    () => (Array.isArray(appointments.data) ? appointments.data : []),
    [appointments.data],
  );
  const doorList = useMemo(() => doors.data ?? [], [doors.data]);

  return (
    <PageWrapper
      title="Dock"
      subtitle="Which vehicle is at which door, and when"
      actions={
        <DatePicker
          ariaLabel="Day"
          className="w-40"
          value={day}
          onChange={setDay}
          placeholder="Pick a date"
          dateFormat="dd MMM yyyy"
        />
      }
    >
      <PageState
        resolution={pageState}
        loading={<DockSkeleton />}
        views={pageState.kind === "denied" ? { denied: deniedView } : undefined}
        onRetry={handleRetry}
      >
        <div className="flex flex-1 min-h-0 flex-col gap-4">
          <DockBookingForm day={day} doors={doorList} />
          <DockAppointmentsTable appointments={rows} />
        </div>
      </PageState>
    </PageWrapper>
  );
}
