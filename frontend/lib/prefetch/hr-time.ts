import "server-only";

import type { z } from "zod";

import { dehydrate } from "@tanstack/react-query";
import { createServerQueryClient } from "./server-query-client";
import { serverGet } from "@/lib/server-fetch";
import { resolvePrefetchGate } from "@/lib/prefetch/prefetch-gate";
import { humanResourcesQueryKeys } from "@/lib/query-keys/human-resources";
import { attendanceStatusContract } from "@/hooks/api/hr/attendance-schema";
import { holidayListContract } from "@/hooks/api/hr/holidays-schema";
import { geofenceListContract } from "@/hooks/api/hr/geofencing-schema";
import { rostersListContract } from "@/hooks/api/hr/rosters-schema";
import { shiftTemplateListContract } from "@/hooks/api/hr/shifts-schema";
import { compOffBalanceListContract } from "@/hooks/api/hr/comp-off-schema";
import { overtimeListContract } from "@/hooks/api/hr/overtime-schema";

type AttendanceStatus = z.infer<typeof attendanceStatusContract>;
type HolidayList = z.infer<typeof holidayListContract>;
type GeofenceList = z.infer<typeof geofenceListContract>;
type RosterList = z.infer<typeof rostersListContract>;
type ShiftList = z.infer<typeof shiftTemplateListContract>;
type CompOffList = z.infer<typeof compOffBalanceListContract>;
type OvertimeList = z.infer<typeof overtimeListContract>;

export async function prefetchAttendanceStatus() {
  try {
    const gate = await resolvePrefetchGate();
    if (!gate.can("hr:attendance:view")) return dehydrate(await createServerQueryClient());
    const queryClient = await createServerQueryClient();
    await queryClient.prefetchQuery({
      queryKey: humanResourcesQueryKeys.hr.attendanceStatus(),
      queryFn: () => serverGet<AttendanceStatus>("/me/attendance/status", attendanceStatusContract),
      staleTime: 2 * 60_000,
    });
    return dehydrate(queryClient);
  } catch {
    return dehydrate(await createServerQueryClient());
  }
}

export async function prefetchHrHolidays() {
  try {
    const gate = await resolvePrefetchGate();
    if (!gate.can("self:attendance")) return dehydrate(await createServerQueryClient());
    const queryClient = await createServerQueryClient();
    await queryClient.prefetchQuery({
      queryKey: humanResourcesQueryKeys.hr.holidays(),
      queryFn: () => serverGet<HolidayList>("/me/attendance/holidays", holidayListContract),
      staleTime: 5 * 60_000,
    });
    return dehydrate(queryClient);
  } catch {
    return dehydrate(await createServerQueryClient());
  }
}

export async function prefetchGeofences() {
  try {
    const gate = await resolvePrefetchGate();
    if (!gate.can("hr:attendance:view")) return dehydrate(await createServerQueryClient());
    const queryClient = await createServerQueryClient();
    await queryClient.prefetchQuery({
      queryKey: [...humanResourcesQueryKeys.hr.all, "geofences"],
      queryFn: () => serverGet<GeofenceList>("/hr/geofencing", geofenceListContract),
      staleTime: 5 * 60_000,
    });
    return dehydrate(queryClient);
  } catch {
    return dehydrate(await createServerQueryClient());
  }
}

export async function prefetchRosters() {
  try {
    const gate = await resolvePrefetchGate();
    if (!gate.can("hr:attendance:view")) return dehydrate(await createServerQueryClient());
    const queryClient = await createServerQueryClient();
    await queryClient.prefetchQuery({
      queryKey: [...humanResourcesQueryKeys.hr.all, "rosters"],
      queryFn: () => serverGet<RosterList>("/hr/rosters", rostersListContract),
      staleTime: 2 * 60_000,
    });
    return dehydrate(queryClient);
  } catch {
    return dehydrate(await createServerQueryClient());
  }
}

export async function prefetchShifts() {
  try {
    const gate = await resolvePrefetchGate();
    if (!gate.can("hr:attendance:view")) return dehydrate(await createServerQueryClient());
    const queryClient = await createServerQueryClient();
    await queryClient.prefetchQuery({
      queryKey: [...humanResourcesQueryKeys.hr.all, "shifts"],
      queryFn: () => serverGet<ShiftList>("/hr/shifts", shiftTemplateListContract),
      staleTime: 5 * 60_000,
    });
    return dehydrate(queryClient);
  } catch {
    return dehydrate(await createServerQueryClient());
  }
}

export async function prefetchCompOff() {
  try {
    const gate = await resolvePrefetchGate();
    if (!gate.can("hr:attendance:view")) return dehydrate(await createServerQueryClient());
    const queryClient = await createServerQueryClient();
    await queryClient.prefetchQuery({
      queryKey: humanResourcesQueryKeys.hr.compOff(),
      queryFn: () => serverGet<CompOffList>("/hr/overtime/comp-off", compOffBalanceListContract),
      staleTime: 60_000,
    });
    return dehydrate(queryClient);
  } catch {
    return dehydrate(await createServerQueryClient());
  }
}

export async function prefetchOvertimeRequests() {
  try {
    const gate = await resolvePrefetchGate();
    if (!gate.can("hr:attendance:view")) return dehydrate(await createServerQueryClient());
    const queryClient = await createServerQueryClient();
    await queryClient.prefetchQuery({
      queryKey: [...humanResourcesQueryKeys.hr.all, "overtimeRequests", {}],
      queryFn: () => serverGet<OvertimeList>("/hr/overtime", overtimeListContract),
      staleTime: 30_000,
    });
    return dehydrate(queryClient);
  } catch {
    return dehydrate(await createServerQueryClient());
  }
}
