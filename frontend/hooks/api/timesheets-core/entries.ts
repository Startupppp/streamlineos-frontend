"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import { getErrorMessage } from "@/lib/get-error-message";
import { useCan } from "@/hooks/api/access";
import type {
  CreateEntryInput,
  CursorPage,
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
    cursor: query.cursor,
    limit: query.limit,
  };
}

export function useTimesheetEntries(query: EntriesQuery = {}, enabled = true) {
  const canView = useCan("timesheets:entries:view");
  const params = toParams(query);
  return useQuery({
    queryKey: queryKeys.timesheets.entries(params),
    queryFn: () => apiClient.get<CursorPage<TimesheetEntry>>("/timesheets/entries", params),
    staleTime: 30_000,
    placeholderData: (prev) => prev,
    enabled: enabled && canView,
  });
}

export function useCreateTimesheetEntry() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["timesheets", "entries", "create"],
    mutationFn: (data: CreateEntryInput) =>
      apiClient.post<TimesheetEntry>("/timesheets/entries", data),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.timesheets.entries() });
      void qc.invalidateQueries({ queryKey: queryKeys.timesheets.periodCurrent() });
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
    onMutate: async ({ entryId, data }) => {
      await qc.cancelQueries({ queryKey: queryKeys.timesheets.entries() });
      const snapshots = qc.getQueriesData<CursorPage<TimesheetEntry>>({
        queryKey: queryKeys.timesheets.entries(),
      });
      qc.setQueriesData<CursorPage<TimesheetEntry>>(
        { queryKey: queryKeys.timesheets.entries() },
        (prev) =>
          prev
            ? {
                ...prev,
                data: prev.data.map((e) =>
                  e.id === entryId
                    ? {
                        ...e,
                        hours: data.hours !== undefined ? String(data.hours) : e.hours,
                        description: data.description !== undefined ? data.description : e.description,
                        isBillable: data.isBillable !== undefined ? data.isBillable : e.isBillable,
                        billingType: data.billingType !== undefined ? data.billingType : e.billingType,
                        projectId: data.projectId !== undefined ? data.projectId : e.projectId,
                        workLink: data.workLink !== undefined ? data.workLink : e.workLink,
                      }
                    : e,
                ),
              }
            : prev,
      );
      return { snapshots };
    },
    onError: (error, _vars, ctx) => {
      if (ctx?.snapshots)
        for (const [key, data] of ctx.snapshots) qc.setQueryData(key, data);
      toast.error(getErrorMessage(error));
    },
    onSuccess: () => {
      toast.success("Entry updated");
    },
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.timesheets.entries() });
      void qc.invalidateQueries({ queryKey: queryKeys.timesheets.periodCurrent() });
    },
  });
}

export function useVoidTimesheetEntry() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["timesheets", "entries", "void"],
    mutationFn: ({ entryId, reason }: { entryId: number; reason: string }) =>
      apiClient.post<{ success: boolean }>(`/timesheets/entries/${entryId}/void`, { reason }),
    onMutate: async ({ entryId }) => {
      await qc.cancelQueries({ queryKey: queryKeys.timesheets.entries() });
      const snapshots = qc.getQueriesData<CursorPage<TimesheetEntry>>({
        queryKey: queryKeys.timesheets.entries(),
      });
      qc.setQueriesData<CursorPage<TimesheetEntry>>(
        { queryKey: queryKeys.timesheets.entries() },
        (prev) =>
          prev
            ? {
                ...prev,
                data: prev.data.map((e) =>
                  e.id === entryId
                    ? { ...e, voidedAt: new Date().toISOString(), status: "REJECTED" as const }
                    : e,
                ),
              }
            : prev,
      );
      return { snapshots };
    },
    onError: (error, _vars, ctx) => {
      if (ctx?.snapshots)
        for (const [key, data] of ctx.snapshots) qc.setQueryData(key, data);
      toast.error(getErrorMessage(error));
    },
    onSuccess: () => {
      toast.success("Entry voided");
    },
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.timesheets.entries() });
      void qc.invalidateQueries({ queryKey: queryKeys.timesheets.periodCurrent() });
    },
  });
}
