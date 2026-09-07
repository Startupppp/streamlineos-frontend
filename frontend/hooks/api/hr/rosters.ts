"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";
import { apiClient } from "@/lib/api-client";
import { lazyContract } from "@/lib/api-envelope";
import { humanResourcesQueryKeys } from "@/lib/query-keys/human-resources";
import { useCan, useModuleEnabled } from "@/hooks/api/access";

const rostersListC = lazyContract(() =>
  import("@/hooks/api/hr/rosters-schema").then((m) => m.rostersListContract),
);
const createRosterC = lazyContract(() =>
  import("@/hooks/api/hr/rosters-schema").then((m) => m.createRosterContract),
);
const rosterEntriesC = lazyContract(() =>
  import("@/hooks/api/hr/rosters-schema").then((m) => m.rosterEntriesContract),
);
const publishRosterC = lazyContract(() =>
  import("@/hooks/api/hr/rosters-schema").then((m) => m.publishRosterContract),
);

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
  isDayOff: boolean | null;
  notes: string | null;
}

export function useRosters() {
  const canView = useCan("hr:attendance:view");
  const hrEnabled = useModuleEnabled("hr");
  return useQuery({
    queryKey: [...humanResourcesQueryKeys.hr.all, "rosters"],
    queryFn: ({ signal }) => apiClient.get<Roster[]>("/hr/rosters", undefined, signal, rostersListC),
    staleTime: 2 * 60_000,
    enabled: hrEnabled && canView,
  });
}

export function useCreateRoster() {
  const qc = useQueryClient();
  return useAuthorizedMutation("hr:attendance:manage", {
    mutationKey: ["hr", "rosters", "create"],
    mutationFn: (data: { name: string; weekStart: string; weekEnd: string }) =>
      apiClient.post<Roster>("/hr/rosters", data, undefined, createRosterC),
    onSuccess: () => qc.invalidateQueries({ queryKey: [...humanResourcesQueryKeys.hr.all, "rosters"] }),
  });
}

export function useRosterEntries(rosterId: number) {
  const canView = useCan("hr:attendance:view");
  const hrEnabled = useModuleEnabled("hr");
  return useQuery({
    queryKey: [...humanResourcesQueryKeys.hr.all, "rosterEntries", rosterId],
    queryFn: ({ signal }) => apiClient.get<RosterEntry[]>(`/hr/rosters/${rosterId}/entries`, undefined, signal, rosterEntriesC),
    staleTime: 30_000,
    enabled: hrEnabled && canView && rosterId > 0,
  });
}

export function usePublishRoster() {
  const qc = useQueryClient();
  return useAuthorizedMutation("hr:attendance:manage", {
    mutationKey: ["hr", "rosters", "publish"],
    mutationFn: (rosterId: number) =>
      apiClient.patch<Roster>(`/hr/rosters/${rosterId}/publish`, {}, undefined, publishRosterC),
    onSuccess: () => qc.invalidateQueries({ queryKey: [...humanResourcesQueryKeys.hr.all, "rosters"] }),
  });
}
