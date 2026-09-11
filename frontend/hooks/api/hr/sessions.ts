"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { lazyContract } from "@/lib/api-envelope";
import { accessAndCrmQueryKeys } from "@/lib/query-keys/access-and-crm";

const sessionListContract = lazyContract(() =>
  import("@/hooks/api/hr/sessions-schema").then((m) => m.sessionListContract),
);
const revokeOneContract = lazyContract(() =>
  import("@/hooks/api/hr/sessions-schema").then((m) => m.sessionRevokeOneContract),
);
const revokeAllContract = lazyContract(() =>
  import("@/hooks/api/hr/sessions-schema").then((m) => m.sessionRevokeAllContract),
);

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
    queryKey: accessAndCrmQueryKeys.sessions.list(),
    queryFn: ({ signal }) => apiClient.get("/sessions", undefined, signal, sessionListContract),
    staleTime: 30 * 1000,
  });

export const useRevokeSession = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["sessions", "revoke"],
    mutationFn: (sessionId: string) => apiClient.delete(`/sessions/${sessionId}`, undefined, undefined, revokeOneContract),
    onSuccess: () => qc.invalidateQueries({ queryKey: accessAndCrmQueryKeys.sessions.all }),
  });
};

export const useRevokeAllSessions = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["sessions", "revoke-all"],
    mutationFn: () => apiClient.delete("/sessions", undefined, undefined, revokeAllContract),
    onSuccess: () => qc.invalidateQueries({ queryKey: accessAndCrmQueryKeys.sessions.all }),
  });
};
