"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";

export interface Roster {
  id: number;
  orgId: string;
  name: string;
  weekStart: string;
  weekEnd: string;
  status: string;
  createdAt: string;
}

export interface RosterEntry {
  id: number;
  rosterId: number;
  userId: string;
  shiftId: number | null;
  date: string;
  isDayOff: boolean;
  notes: string | null;
}

export function useRosters() {
  return useQuery({
    queryKey: [...queryKeys.hr.all, "rosters"],
    queryFn: () => apiClient.get<Roster[]>("/hr/rosters"),
    staleTime: 2 * 60_000,
  });
}

export function useCreateRoster() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["hr", "rosters", "create"],
    mutationFn: (data: { name: string; weekStart: string; weekEnd: string }) =>
      apiClient.post<Roster>("/hr/rosters", data),
    onSuccess: () => qc.invalidateQueries({ queryKey: [...queryKeys.hr.all, "rosters"] }),
  });
}

export function useRosterEntries(rosterId: number) {
  return useQuery({
    queryKey: [...queryKeys.hr.all, "rosterEntries", rosterId],
    queryFn: () => apiClient.get<RosterEntry[]>(`/hr/rosters/${rosterId}/entries`),
    staleTime: 30_000,
    enabled: rosterId > 0,
  });
}

export function usePublishRoster() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["hr", "rosters", "publish"],
    mutationFn: (id: number) => apiClient.patch<Roster>(`/hr/rosters/${id}/publish`, {}),
    onSuccess: () => qc.invalidateQueries({ queryKey: [...queryKeys.hr.all, "rosters"] }),
  });
}
