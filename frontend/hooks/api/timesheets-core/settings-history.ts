"use client";

import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { usersAndCommerceQueryKeys } from "@/lib/query-keys/users-and-commerce";
import { useCan } from "@/hooks/api/access";
import type { SettingsHistoryEntry } from "@/features/timesheets/types";

export const SETTINGS_HISTORY_LIMIT = 50;

export function useSettingsHistory(enabled = true) {
  const canView = useCan("timesheets:settings:view");
  return useQuery({
    queryKey: usersAndCommerceQueryKeys.timesheets.settingsHistory(),
    queryFn: ({ signal }) =>
      apiClient.get<SettingsHistoryEntry[]>("/timesheets/settings/history", {
        limit: SETTINGS_HISTORY_LIMIT,
      }, signal),
    staleTime: 5 * 60_000,
    enabled: enabled && canView,
  });
}
