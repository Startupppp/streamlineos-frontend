import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";
import { apiClient } from "@/lib/api-client";
import { lazyContract } from "@/lib/api-envelope";
import { humanResourcesQueryKeys } from "@/lib/query-keys/human-resources";
import { useCan } from "@/hooks/api/access";
import { invalidateCalendarProjectionWindows } from "@/lib/calendar-projection-cache";

const noContentC = lazyContract(() =>
  import("@/hooks/api/cursor-page-schema").then((m) => m.noContentContract),
);

export interface Holiday {
  id: string;
  orgId: string;
  name: string;
  date: string;
  recurring: boolean;
  createdBy: string | null;
  createdAt: string;
}

interface CreateHolidayInput {
  name: string;
  date: string;
  recurring?: boolean;
}

interface UpdateHolidayInput extends Partial<CreateHolidayInput> {
  holidayId: string;
  expected?: Pick<Holiday, "name" | "date" | "recurring">;
}

export function useHolidays() {
  const canView = useCan("self:attendance");
  return useQuery<Holiday[]>({
    queryKey: humanResourcesQueryKeys.hr.holidays(),
    queryFn: ({ signal }) => apiClient.get<Holiday[]>("/me/attendance/holidays", undefined, signal, lazyContract(() => import("@/hooks/api/hr/holidays-schema").then(m => m.holidayListContract))),
    staleTime: 300_000,
    enabled: canView,
  });
}

export function useCreateHoliday() {
  const qc = useQueryClient();
  return useAuthorizedMutation("hr:attendance:manage", {
    mutationKey: ["hr", "holidays", "create"],
    mutationFn: (data: CreateHolidayInput) =>
      apiClient.post<Holiday>("/hr/attendance/holidays", data, undefined, lazyContract(() => import("@/hooks/api/hr/holidays-schema").then(m => m.holidayRowContract))),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: humanResourcesQueryKeys.hr.holidays() });
      invalidateCalendarProjectionWindows(qc);
    },
  });
}

export function useUpdateHoliday() {
  const qc = useQueryClient();
  return useAuthorizedMutation("hr:attendance:manage", {
    mutationKey: ["hr", "holidays", "update"],
    mutationFn: ({ holidayId, ...data }: UpdateHolidayInput) =>
      apiClient.patch<Holiday>(`/hr/attendance/holidays/${holidayId}`, data, undefined, lazyContract(() => import("@/hooks/api/hr/holidays-schema").then(m => m.holidayRowContract))),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: humanResourcesQueryKeys.hr.holidays() });
      invalidateCalendarProjectionWindows(qc);
    },
  });
}

export function useDeleteHoliday() {
  const qc = useQueryClient();
  return useAuthorizedMutation("hr:attendance:manage", {
    mutationKey: ["hr", "holidays", "delete"],
    mutationFn: (holidayId: string) =>
      apiClient.delete<void>(`/hr/attendance/holidays/${holidayId}`, undefined, undefined, noContentC),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: humanResourcesQueryKeys.hr.holidays() });
      invalidateCalendarProjectionWindows(qc);
    },
  });
}
