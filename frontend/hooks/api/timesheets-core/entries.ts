"use client";

import { useMutation, useQuery, useQueryClient, type QueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { apiClient } from "@/lib/api-client";
import { lazyContract } from "@/lib/api-envelope";
import { usersAndCommerceQueryKeys } from "@/lib/query-keys/users-and-commerce";
import { getErrorMessage } from "@/lib/get-error-message";
import { useCan } from "@/hooks/api/access";
import type {
  AttendanceDraftResult,
  CreateEntryInput,
  CursorPage,
  EntriesQuery,
  EntryStatus,
  TimesheetEntry,
  UpdateEntryInput,
} from "@/features/timesheets/types";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";

const entriesListC = lazyContract(() =>
  import("@/hooks/api/timesheets-core/timesheets-entry-schema").then((m) => m.entriesListResponseContract),
);
const entryVoidC = lazyContract(() =>
  import("@/hooks/api/timesheets-core/timesheets-entry-schema").then((m) => m.entryVoidResultContract),
);
const entryC = lazyContract(() =>
  import("@/hooks/api/timesheets-core/timesheets-entry-schema").then((m) => m.entryContract),
);

type EntriesQueryParams = {
  userId?: string;
  projectId?: number;
  ticketId?: number;
  status?: EntryStatus;
  startDate?: string;
  endDate?: string;
  billable?: "true" | "false";
  cursor?: string;
  limit?: number;
};

function toParams(query: EntriesQuery): EntriesQueryParams {
  return {
    userId: query.userId,
    projectId: query.projectId,
    ticketId: query.ticketId,
    status: query.status,
    startDate: query.startDate,
    endDate: query.endDate,
    billable: query.billable === undefined ? undefined : query.billable ? "true" : "false",
    cursor: query.cursor,
    limit: query.limit,
  };
}

export function useTimesheetEntries(query: EntriesQuery = {}, enabled = true) {
  const canView = useCan("timesheets:entries:view");
  const params: EntriesQueryParams = toParams(query);
  return useQuery({
    queryKey: usersAndCommerceQueryKeys.timesheets.entries(params),
    queryFn: ({ signal }) => apiClient.get<CursorPage<TimesheetEntry>>("/timesheets/entries", params, signal, entriesListC),
    staleTime: 30_000,
    placeholderData: (prev) => prev,
    enabled: enabled && canView,
  });
}

function invalidateWeekReads(qc: QueryClient): void {
  void qc.invalidateQueries({ queryKey: usersAndCommerceQueryKeys.timesheets.entries() });
  void qc.invalidateQueries({ queryKey: usersAndCommerceQueryKeys.timesheets.periodCurrent() });
  void qc.invalidateQueries({ queryKey: usersAndCommerceQueryKeys.timesheets.periodApprovers() });
}

export function useCreateTimesheetEntry() {
  const qc = useQueryClient();
  return useAuthorizedMutation("timesheets:entries:create", {
    mutationKey: ["timesheets", "entries", "create"],
    mutationFn: (data: CreateEntryInput) =>
      apiClient.post<TimesheetEntry>("/timesheets/entries", data, undefined, entryC),
    onSuccess: () => {
      invalidateWeekReads(qc);
      toast.success("Time logged");
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  });
}

export function useDraftEntriesFromAttendance() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["timesheets", "entries", "from-attendance"],
    mutationFn: (range: { start: string; end: string }) =>
      apiClient.post<AttendanceDraftResult>("/timesheets/entries/from-attendance", range),
    onSuccess: (result) => {
      if (result.entriesCreated > 0) {
        invalidateWeekReads(qc);
      }
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  });
}

export function useUpdateTimesheetEntry() {
  const qc = useQueryClient();
  return useAuthorizedMutation("timesheets:entries:update", {
    mutationKey: ["timesheets", "entries", "update"],
    mutationFn: ({ entryId, data }: { entryId: number; data: UpdateEntryInput }) =>
      apiClient.patch<TimesheetEntry>(`/timesheets/entries/${entryId}`, data, undefined, entryC),
    onMutate: async ({ entryId, data }) => {
      await qc.cancelQueries({ queryKey: usersAndCommerceQueryKeys.timesheets.entries() });
      const snapshots = qc.getQueriesData<CursorPage<TimesheetEntry>>({
        queryKey: usersAndCommerceQueryKeys.timesheets.entries(),
      });
      qc.setQueriesData<CursorPage<TimesheetEntry>>(
        { queryKey: usersAndCommerceQueryKeys.timesheets.entries() },
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
      invalidateWeekReads(qc);
    },
  });
}

export function useVoidTimesheetEntry() {
  const qc = useQueryClient();
  return useAuthorizedMutation("timesheets:entries:void", {
    mutationKey: ["timesheets", "entries", "void"],
    mutationFn: ({ entryId, reason }: { entryId: number; reason: string }) =>
      apiClient.post<{ success: true }>(`/timesheets/entries/${entryId}/void`, { reason }, undefined, entryVoidC),
    onMutate: async ({ entryId }) => {
      await qc.cancelQueries({ queryKey: usersAndCommerceQueryKeys.timesheets.entries() });
      const snapshots = qc.getQueriesData<CursorPage<TimesheetEntry>>({
        queryKey: usersAndCommerceQueryKeys.timesheets.entries(),
      });
      qc.setQueriesData<CursorPage<TimesheetEntry>>(
        { queryKey: usersAndCommerceQueryKeys.timesheets.entries() },
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
      invalidateWeekReads(qc);
    },
  });
}
