"use client";

import { useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";
import { humanResourcesQueryKeys } from "@/lib/query-keys/human-resources";
import {
  addHolidayC,
  deleteHolidayC,
  updateHolidayC,
} from "@/hooks/api/hr/leaves-contracts";
import type {
  AddHolidayInput,
  DeleteHolidayInput,
  UpdateHolidayInput,
} from "@/types/hr";

function invalidateHolidaySurfaces(qc: ReturnType<typeof useQueryClient>) {
  void qc.invalidateQueries({ queryKey: [...humanResourcesQueryKeys.hr.all, "holidaysYear"] });
  void qc.invalidateQueries({ queryKey: [...humanResourcesQueryKeys.hr.all, "holidaysCalendar"] });
  void qc.invalidateQueries({ queryKey: [...humanResourcesQueryKeys.hr.all, "monthlyAttendance"] });
  void qc.invalidateQueries({ queryKey: humanResourcesQueryKeys.hr.holidays() });
}

export function useAddLegacyHoliday() {
  const qc = useQueryClient();
  return useAuthorizedMutation("hr:attendance:manage", {
    mutationKey: ["hr", "holidays", "create"],
    mutationFn: (data: AddHolidayInput) =>
      apiClient.post<{ success: boolean }>("/hr/holidays", data, undefined, addHolidayC),
    onSuccess: () => {
      invalidateHolidaySurfaces(qc);
    },
  });
}

export function useDeleteLegacyHoliday() {
  const qc = useQueryClient();
  return useAuthorizedMutation("hr:attendance:manage", {
    mutationKey: ["hr", "holidays", "delete"],
    mutationFn: ({ holidayId }: DeleteHolidayInput) =>
      apiClient.delete<{ success: boolean }>(`/hr/holidays/${holidayId}`, undefined, undefined, deleteHolidayC),
    onSuccess: () => {
      invalidateHolidaySurfaces(qc);
    },
  });
}

export function useUpdateLegacyHoliday() {
  const qc = useQueryClient();
  return useAuthorizedMutation("hr:attendance:manage", {
    mutationKey: ["hr", "holidays", "update"],
    mutationFn: ({ holidayId, ...data }: UpdateHolidayInput) =>
      apiClient.patch<{ success: boolean }>(`/hr/holidays/${holidayId}`, data, undefined, updateHolidayC),
    onSuccess: () => {
      invalidateHolidaySurfaces(qc);
    },
  });
}
