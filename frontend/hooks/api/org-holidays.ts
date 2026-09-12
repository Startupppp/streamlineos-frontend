"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { UseMutationOptions, UseQueryOptions } from "@tanstack/react-query";
import { platformCoreQueryKeys } from "@/lib/query-keys/platform-core";
import { apiClient } from "@/lib/api-client";
import { useCan } from "@/hooks/api/access";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";
import { lazyContract } from "@/lib/api-envelope";

const noContentContract = lazyContract(() =>
  import("@/hooks/api/cursor-page-schema").then((m) => m.noContentContract),
);
const holidayListContract = lazyContract(() =>
  import("@/hooks/api/org-hierarchy-schema").then((m) => m.holidayListContract),
);
const createHolidayContract = lazyContract(() =>
  import("@/hooks/api/org-hierarchy-schema").then((m) => m.createHolidayContract),
);

export interface OrgHoliday {
  id: string;
  name: string;
  date: string;
  recurring: boolean;
  createdAt: string;
}

export interface AddHolidayInput {
  name: string;
  date: string;
  recurring?: boolean;
}

export function useOrgHolidays(
  options?: Omit<UseQueryOptions<OrgHoliday[], Error>, "queryKey" | "queryFn">,
) {
  const canViewSettings = useCan("settings:view");
  return useQuery<OrgHoliday[]>({
    queryKey: platformCoreQueryKeys.organization.holidays,
    queryFn: ({ signal }) =>
      apiClient.get<OrgHoliday[]>("/organization/holidays", undefined, signal, holidayListContract),
    staleTime: 5 * 60_000,
    ...options,
    enabled: canViewSettings && (options?.enabled ?? true),
  });
}

export function useCreateOrgHoliday(
  options?: Omit<UseMutationOptions<OrgHoliday, Error, AddHolidayInput>, "mutationKey" | "mutationFn">,
) {
  const qc = useQueryClient();
  return useAuthorizedMutation<OrgHoliday, Error, AddHolidayInput>("settings:manage", {
    mutationKey: ["org", "holidays", "create"],
    mutationFn: (input: AddHolidayInput) =>
      apiClient.post<OrgHoliday>("/organization/holidays", input, undefined, createHolidayContract),
    ...options,
    onSuccess: (data, variables, context, mutFnCtx) => {
      void qc.invalidateQueries({ queryKey: platformCoreQueryKeys.organization.holidays });
      options?.onSuccess?.(data, variables, context, mutFnCtx);
    },
  });
}

export function useDeleteOrgHoliday(
  options?: Omit<UseMutationOptions<void, Error, string>, "mutationKey" | "mutationFn">,
) {
  const qc = useQueryClient();
  return useAuthorizedMutation<void, Error, string>("settings:manage", {
    mutationKey: ["org", "holidays", "delete"],
    mutationFn: (id: string) =>
      apiClient.delete<void>(`/organization/holidays/${id}`, undefined, undefined, noContentContract),
    ...options,
    onSuccess: (data, variables, context, mutFnCtx) => {
      void qc.invalidateQueries({ queryKey: platformCoreQueryKeys.organization.holidays });
      options?.onSuccess?.(data, variables, context, mutFnCtx);
    },
  });
}
