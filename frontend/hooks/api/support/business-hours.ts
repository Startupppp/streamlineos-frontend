"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";

export type BusinessHoursDay = "mon" | "tue" | "wed" | "thu" | "fri" | "sat" | "sun";

export interface BusinessHoursInterval {
  start: string;
  end: string;
}

export type BusinessHoursWeeklySchedule = Partial<Record<BusinessHoursDay, BusinessHoursInterval>>;

export interface BusinessHours {
  id: number;
  orgId: string;
  name: string;
  timezone: string;
  weeklySchedule: BusinessHoursWeeklySchedule;
  holidays: string[];
  is24x7: boolean;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateBusinessHoursInput {
  name: string;
  timezone?: string;
  weeklySchedule?: BusinessHoursWeeklySchedule;
  holidays?: string[];
  is24x7?: boolean;
  isDefault?: boolean;
}

export interface UpdateBusinessHoursInput {
  name?: string;
  timezone?: string;
  weeklySchedule?: BusinessHoursWeeklySchedule;
  holidays?: string[];
  is24x7?: boolean;
  isDefault?: boolean;
}

export function useBusinessHoursList() {
  return useQuery({
    queryKey: queryKeys.supportBusinessHours.list(),
    queryFn: ({ signal }) => apiClient.get<BusinessHours[]>("/support/business-hours", undefined, signal),
    staleTime: 60_000,
  });
}

export function useCreateBusinessHours() {
  const qc = useQueryClient();
  return useAuthorizedMutation("support:settings:manage", {
    mutationKey: ["supportBusinessHours", "create"],
    mutationFn: (input: CreateBusinessHoursInput) =>
      apiClient.post<BusinessHours>("/support/business-hours", input),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.supportBusinessHours.all }),
  });
}

export function useUpdateBusinessHours() {
  const qc = useQueryClient();
  return useAuthorizedMutation("support:settings:manage", {
    mutationKey: ["supportBusinessHours", "update"],
    mutationFn: ({ id, ...input }: UpdateBusinessHoursInput & { id: number }) =>
      apiClient.patch<BusinessHours>(`/support/business-hours/${id}`, input),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.supportBusinessHours.all }),
  });
}

export function useDeleteBusinessHours() {
  const qc = useQueryClient();
  return useAuthorizedMutation("support:tickets:reply", {
    mutationKey: ["supportBusinessHours", "delete"],
    mutationFn: (id: number) => apiClient.delete<{ success: boolean }>(`/support/business-hours/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.supportBusinessHours.all }),
  });
}
