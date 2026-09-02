"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import { getErrorMessage } from "@/lib/get-error-message";
import type {
  TimesheetSettings,
  UpdateTimesheetSettingsInput,
} from "@/features/timesheets/types";
import { useCan } from "../access";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";

export function useTimesheetSettings(enabled = true) {
  const canView = useCan("timesheets:settings:view");
  return useQuery({
    queryKey: queryKeys.timesheets.settings(),
    queryFn: ({ signal }) => apiClient.get<TimesheetSettings>("/timesheets/settings", undefined, signal),
    staleTime: 5 * 60_000,
    enabled: enabled && canView,
  });
}

export function useUpdateTimesheetSettings() {
  const qc = useQueryClient();
  return useAuthorizedMutation("timesheets:settings:manage", {
    mutationKey: ["timesheets", "settings", "update"],
    mutationFn: (data: UpdateTimesheetSettingsInput) =>
      apiClient.patch<TimesheetSettings>("/timesheets/settings", data),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.timesheets.settings() });
      toast.success("Settings saved");
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  });
}
