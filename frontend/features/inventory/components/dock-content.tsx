"use client";

import { useCallback, useMemo, useState } from "react";
import { DatePicker } from "@/components/ui/date-picker";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState, NoPermissionState } from "@/components/shared";
import { useCan } from "@/hooks/api/access";
import {
  useDockAppointments,
  useDockDoors,
} from "@/hooks/api/inventory/stock-types-dock";
import { DockBookingForm } from "./dock-booking-form";
import { DockAppointmentsTable } from "./dock-appointments-table";

function startOfDay(date: Date): string {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  return copy.toISOString();
}

export function DockContent() {
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

  const handleRetry = useCallback(() => {
    void appointments.refetch();
    void doors.refetch();
  }, [appointments, doors]);

  const rows = useMemo(
    () => (Array.isArray(appointments.data) ? appointments.data : []),
    [appointments.data],
  );

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
      <div className="flex flex-1 min-h-0 flex-col gap-4">
        <DockBookingForm day={day} doors={doors.data ?? []} />
        <DockAppointmentsTable appointments={rows} />
      </div>
    </PageWrapper>
  );
}
