"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import { getErrorMessage } from "@/lib/get-error-message";
import type {
  CreateEntryInput,
  EntriesQuery,
  TimesheetEntry,
  UpdateEntryInput,
} from "@/features/timesheets/types";

function toParams(query: EntriesQuery): Record<string, unknown> {
  return {
    userId: query.userId,
    projectId: query.projectId,
    ticketId: query.ticketId,
    status: query.status,
    startDate: query.startDate,
    endDate: query.endDate,
    billable: query.billable === undefined ? undefined : String(query.billable),
    page: query.page,
    limit: query.limit,
  };
}

export function useTimesheetEntries(query: EntriesQuery = {}, enabled = true) {
  const params = toParams(query);
  return useQuery({
    queryKey: queryKeys.timesheets.entries(params),
    queryFn: () => apiClient.get<TimesheetEntry[]>("/timesheets/entries", params),
    staleTime: 30_000,
    placeholderData: (prev) => prev,
    enabled,
  });
}

export function useCreateTimesheetEntry() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["timesheets", "entries", "create"],
    mutationFn: (data: CreateEntryInput) =>
      apiClient.post<TimesheetEntry>("/timesheets/entries", data),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.timesheets.all });
      toast.success("Time logged");
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  });
}

export function useUpdateTimesheetEntry() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["timesheets", "entries", "update"],
    mutationFn: ({ entryId, data }: { entryId: number; data: UpdateEntryInput }) =>
      apiClient.patch<TimesheetEntry>(`/timesheets/entries/${entryId}`, data),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.timesheets.all });
      toast.success("Entry updated");
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  });
}

export function useVoidTimesheetEntry() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["timesheets", "entries", "void"],
    mutationFn: ({ entryId, reason }: { entryId: number; reason: string }) =>
      apiClient.post<{ success: boolean }>(`/timesheets/entries/${entryId}/void`, { reason }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.timesheets.all });
      toast.success("Entry voided");
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  });
}
