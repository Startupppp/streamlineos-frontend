import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";

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
    queryKey: ["hr", "holidays"],
    queryFn: () => apiClient.get("/hr/attendance/holidays").then((r) => r.data),
    staleTime: 300_000,
  });
}

export function useCreateHoliday() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["hr", "holidays", "create"],
    mutationFn: (data: CreateHolidayInput) =>
      apiClient.post("/hr/attendance/holidays", data).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["hr", "holidays"] }),
  });
}

export function useUpdateHoliday() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["hr", "holidays", "update"],
    mutationFn: ({ id, ...data }: Partial<CreateHolidayInput> & { id: string }) =>
      apiClient.patch(`/hr/attendance/holidays/${id}`, data).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["hr", "holidays"] }),
  });
}

export function useDeleteHoliday() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["hr", "holidays", "delete"],
    mutationFn: (id: string) =>
      apiClient.delete(`/hr/attendance/holidays/${id}`).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["hr", "holidays"] }),
  });
}
