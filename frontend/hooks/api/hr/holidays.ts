import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";

export interface Holiday {
  id: string;
  orgId: string;
  name: string;
  date: string;
  recurring: boolean;
  createdBy: string;
  createdAt: string;
}

interface CreateHolidayInput {
  name: string;
  date: string;
  recurring?: boolean;
}

export function useHolidays() {
  return useQuery<Holiday[]>({
    queryKey: queryKeys.hr.holidays(),
    queryFn: () => apiClient.get<Holiday[]>("/hr/attendance/holidays"),
    staleTime: 300_000,
  });
}

export function useCreateHoliday() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["hr", "holidays", "create"],
    mutationFn: (data: CreateHolidayInput) =>
      apiClient.post<Holiday>("/hr/attendance/holidays", data),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.hr.holidays() }),
  });
}

export function useUpdateHoliday() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["hr", "holidays", "update"],
    mutationFn: ({ id, ...data }: Partial<CreateHolidayInput> & { id: string }) =>
      apiClient.patch<Holiday>(`/hr/attendance/holidays/${id}`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.hr.holidays() }),
  });
}

export function useDeleteHoliday() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["hr", "holidays", "delete"],
    mutationFn: (id: string) =>
      apiClient.delete<void>(`/hr/attendance/holidays/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.hr.holidays() }),
  });
}
