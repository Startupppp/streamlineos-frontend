import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";
import { apiClient } from "@/lib/api-client";
import { lazyContract } from "@/lib/api-envelope";
import { humanResourcesQueryKeys } from "@/lib/query-keys/human-resources";
import { useCan } from "@/hooks/api/access";

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
    onSuccess: () => qc.invalidateQueries({ queryKey: humanResourcesQueryKeys.hr.holidays() }),
  });
}

export function useUpdateHoliday() {
  const qc = useQueryClient();
  return useAuthorizedMutation("hr:attendance:manage", {
    mutationKey: ["hr", "holidays", "update"],
    mutationFn: ({ id, ...data }: Partial<CreateHolidayInput> & { id: string }) =>
      apiClient.patch<Holiday>(`/hr/attendance/holidays/${id}`, data, undefined, lazyContract(() => import("@/hooks/api/hr/holidays-schema").then(m => m.holidayRowContract))),
    onSuccess: () => qc.invalidateQueries({ queryKey: humanResourcesQueryKeys.hr.holidays() }),
  });
}

export function useDeleteHoliday() {
  const qc = useQueryClient();
  return useAuthorizedMutation("hr:attendance:manage", {
    mutationKey: ["hr", "holidays", "delete"],
    mutationFn: (id: string) =>
      apiClient.delete<void>(`/hr/attendance/holidays/${id}`, undefined, undefined, noContentC),
    onSuccess: () => qc.invalidateQueries({ queryKey: humanResourcesQueryKeys.hr.holidays() }),
  });
}
