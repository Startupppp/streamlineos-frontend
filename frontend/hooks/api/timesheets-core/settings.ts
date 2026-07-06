"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import { getErrorMessage } from "@/lib/get-error-message";
import type { TimesheetSettings } from "@/features/timesheets-core/types";

export function useTimesheetSettings(enabled = true) {
  return useQuery({
    queryKey: queryKeys.timesheets.settings(),
    queryFn: () => apiClient.get<TimesheetSettings>("/timesheets/settings"),
    staleTime: 5 * 60_000,
    enabled,
  });
}

export function useUpdateTimesheetSettings() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["timesheets", "settings", "update"],
    mutationFn: (data: Partial<TimesheetSettings>) =>
      apiClient.patch<TimesheetSettings>("/timesheets/settings", data),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.timesheets.settings() });
      toast.success("Settings saved");
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  });
}
