"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { useCan } from "@/hooks/api/access";
import type { CursorPage } from "@/hooks/api/accounting";
import { coreKeys, toQuery } from "./core-keys";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";
import {
  recurringJournalListContract,
  recurringJournalTemplateResponseContract,
  recurringJournalDeleteContract,
  recurringJournalRunNowContract,
} from "@/hooks/api/accounting/core-recurring-schema";

export interface RecurringJournalLine {
  accountId: number;
  debit: number;
  credit: number;
  description?: string;
}

export type RecurringFrequency = "DAILY" | "WEEKLY" | "MONTHLY" | "QUARTERLY" | "YEARLY";

export interface RecurringJournal {
  id: number;
  orgId: string;
  name: string;
  description: string | null;
  frequency: string;
  nextRunDate: string | null;
  lastRunDate: string | null;
  endDate: string | null;
  lines: RecurringJournalLine[];
  isActive: boolean;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface RecurringJournalParams {
  cursor?: string;
  limit?: number;
}

export interface CreateRecurringJournalInput {
  name: string;
  description?: string;
  frequency: RecurringFrequency;
  nextRunDate: string;
  endDate?: string;
  lines: RecurringJournalLine[];
}

export interface UpdateRecurringJournalInput {
  name?: string;
  description?: string;
  frequency?: RecurringFrequency;
  nextRunDate?: string;
  endDate?: string;
  lines?: RecurringJournalLine[];
  isActive?: boolean;
}

export function useRecurringJournals(params: RecurringJournalParams = {}) {
  const can = useCan("accounting:recurring:read");
  return useQuery<CursorPage<RecurringJournal>, Error>({
    queryKey: coreKeys.recurringJournals(params),
    queryFn: ({ signal }) =>
      apiClient.get(
        "/accounting/recurring-journals",
        toQuery(params), signal, recurringJournalListContract,
      ),
    staleTime: 60_000,
    enabled: can,
  });
}

export function useCreateRecurringJournal() {
  const queryClient = useQueryClient();
  return useAuthorizedMutation<RecurringJournal, Error, CreateRecurringJournalInput>("accounting:recurring:manage", {
    mutationKey: [...coreKeys.all, "create-recurring-journal"],
    mutationFn: (body) =>
      apiClient.post("/accounting/recurring-journals", body, undefined, recurringJournalTemplateResponseContract),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: coreKeys.all });
    },
  });
}

export function useUpdateRecurringJournal(templateId: number) {
  const queryClient = useQueryClient();
  return useAuthorizedMutation<RecurringJournal, Error, UpdateRecurringJournalInput>("accounting:recurring:manage", {
    mutationKey: [...coreKeys.all, "update-recurring-journal", templateId],
    mutationFn: (body) =>
      apiClient.patch(`/accounting/recurring-journals/${templateId}`, body, undefined, recurringJournalTemplateResponseContract),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: coreKeys.all });
    },
  });
}

export function useDeleteRecurringJournal(templateId: number) {
  const queryClient = useQueryClient();
  return useAuthorizedMutation<void, Error, void>("accounting:recurring:manage", {
    mutationKey: [...coreKeys.all, "delete-recurring-journal", templateId],
    mutationFn: () =>
      apiClient.delete(`/accounting/recurring-journals/${templateId}`, undefined, undefined, recurringJournalDeleteContract),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: coreKeys.all });
    },
  });
}

export function useRunRecurringJournalNow(templateId: number) {
  const queryClient = useQueryClient();
  return useAuthorizedMutation<{ created: boolean; entryId?: number }, Error, void>("accounting:recurring:manage", {
    mutationKey: [...coreKeys.all, "run-recurring-now", templateId],
    mutationFn: () =>
      apiClient.post(
        `/accounting/recurring-journals/${templateId}/run-now`,
        undefined, undefined, recurringJournalRunNowContract,
      ),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: coreKeys.all });
    },
  });
}
