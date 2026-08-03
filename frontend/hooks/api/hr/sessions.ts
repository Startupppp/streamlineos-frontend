"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";

export interface UserSession {
  id: string;
  userAgent: string | null;
  browser: string;
  os: string | null;
  platform: string | null;
  ipAddress: string | null;
  lastActive: string;
  createdAt: string;
  isCurrent: boolean;
}

export const useSessions = () =>
  useQuery<UserSession[]>({
    queryKey: queryKeys.sessions.list(),
    queryFn: () => apiClient.get<UserSession[]>("/sessions"),
    staleTime: 30 * 1000,
  });

export const useRevokeSession = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["sessions", "revoke"],
    mutationFn: (sessionId: string) => apiClient.delete(`/sessions/${sessionId}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.sessions.all }),
  });
};

export const useRevokeAllSessions = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["sessions", "revoke-all"],
    mutationFn: () => apiClient.delete("/sessions"),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.sessions.all }),
  });
};
