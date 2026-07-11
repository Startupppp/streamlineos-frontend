"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";

export interface Mentorship {
  id: number;
  orgId: string;
  mentorId: string;
  menteeId: string;
  status: "active" | "completed" | "paused";
  startedAt: string | null;
  endedAt: string | null;
  goal: string | null;
  createdAt: string;
  updatedAt: string;
}

const keys = {
  list: () => ["hr", "mentorships", "list"] as const,
};

export function useMentorships() {
  return useQuery({
    queryKey: keys.list(),
    queryFn: () => apiClient.get<Mentorship[]>("/hr/mentorships"),
    staleTime: 60_000,
  });
}

export function useCreateMentorship() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { mentorId: string; menteeId: string; goal?: string; startedAt?: string }) =>
      apiClient.post<Mentorship>("/hr/mentorships", body),
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.list() }),
  });
}

export function useUpdateMentorship() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...body }: Partial<Mentorship> & { id: number }) =>
      apiClient.patch<Mentorship>(`/hr/mentorships/${id}`, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.list() }),
  });
}
