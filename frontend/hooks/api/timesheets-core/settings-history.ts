"use client";

import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { usersAndCommerceQueryKeys } from "@/lib/query-keys/users-and-commerce";
import { useCan } from "@/hooks/api/access";
import type { SettingsHistoryEntry } from "@/features/timesheets/types";

export const SETTINGS_HISTORY_LIMIT = 50;

/**
 * The numbered snapshots behind "why is this period being treated this way?".
 *
 * `GET /timesheets/settings/history` had a query key declared for it in
 * `lib/query-keys` and no hook, so nothing ever called it. That mattered more
 * than an unread list usually would: TS-16 made a reason mandatory for a
 * material settings change specifically so a past period stays explainable, and
 * the place that reason is stored was unreadable. The requirement collected
 * justifications nobody could see.
 */
export function useSettingsHistory(enabled = true) {
  const canView = useCan("timesheets:settings:view");
  return useQuery({
    queryKey: usersAndCommerceQueryKeys.timesheets.settingsHistory(),
    queryFn: () =>
      apiClient.get<SettingsHistoryEntry[]>("/timesheets/settings/history", {
        limit: SETTINGS_HISTORY_LIMIT,
      }),
    /*
     * An append-only log that only this org's own admins write to, and a save
     * on the same screen invalidates it — so a long stale window is right.
     */
    staleTime: 5 * 60_000,
    enabled: enabled && canView,
  });
}
