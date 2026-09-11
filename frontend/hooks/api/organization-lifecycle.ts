"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { UseQueryOptions } from "@tanstack/react-query";
import { apiClient, setAutoSignOutSuppressed } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";

type ArchivedOrganization = {
  id: string;
  name: string;
  slug: string | null;
};

export const useArchivedOrganizations = (
  options?: Omit<
    UseQueryOptions<ArchivedOrganization[], Error>,
    "queryKey" | "queryFn"
  >,
) => {
  const { enabled: callerEnabled, ...restOptions } = options ?? {};
  return useQuery<ArchivedOrganization[], Error>({
    queryKey: queryKeys.organization.archived(),
    queryFn: () =>
      apiClient.get<ArchivedOrganization[]>("/organization/archived"),
    staleTime: 30_000,
    ...restOptions,
    enabled: callerEnabled ?? true,
  });
};

export const useArchiveOrg = () => {
  return useMutation<
    { success: boolean; nextOrgId: string | null },
    Error,
    void
  >({
    mutationKey: ["archive", "org"],
    mutationFn: () =>
      apiClient.post<{ success: boolean; nextOrgId: string | null }>(
        "/organization/archive",
        {},
      ),
    onMutate: () => {
      setAutoSignOutSuppressed(true);
    },
    onSettled: () => {
      window.setTimeout(() => setAutoSignOutSuppressed(false), 4000);
    },
  });
};

export const useRestoreOrg = () => {
  const queryClient = useQueryClient();
  return useMutation<{ success: boolean; orgId: string }, Error, string>({
    mutationKey: ["restore", "org"],
    mutationFn: (orgId) =>
      apiClient.post<{ success: boolean; orgId: string }>(
        "/organization/restore",
        { orgId },
      ),
    onMutate: () => {
      setAutoSignOutSuppressed(true);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.organization.all,
      });
      void queryClient.invalidateQueries({
        queryKey: queryKeys.organization.archived(),
      });
      void queryClient.invalidateQueries({
        queryKey: queryKeys.organization.settings(),
      });
    },
    onSettled: () => {
      window.setTimeout(() => setAutoSignOutSuppressed(false), 4000);
    },
  });
};

interface CreateOrganizationResult {
  id: string;
  name: string;
  slug: string;
}

export const useCreateOrganization = () => {
  const queryClient = useQueryClient();
  return useMutation<
    CreateOrganizationResult,
    Error,
    { name: string; slug: string; billingEmail?: string }
  >({
    mutationKey: ["organization", "create"],
    mutationFn: (data) =>
      apiClient.post<CreateOrganizationResult>("/organization", data),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.organization.all,
      });
    },
  });
};

export const useLeaveOrg = () => {
  return useMutation<{ success: boolean; nextOrgId?: string }, Error, void>({
    mutationKey: ["organization", "leave"],
    mutationFn: () =>
      apiClient.post<{ success: boolean; nextOrgId?: string }>(
        "/organization/leave",
        {},
      ),
    onMutate: () => {
      setAutoSignOutSuppressed(true);
    },
    onSettled: () => {
      window.setTimeout(() => setAutoSignOutSuppressed(false), 4000);
    },
  });
};

export const useDeleteOrg = () => {
  return useMutation<
    { success: true; nextOrgId: string | null },
    Error,
    { confirmation: string }
  >({
    mutationKey: ["organization", "delete"],
    mutationFn: (data) =>
      apiClient.delete<{ success: true; nextOrgId: string | null }>(
        "/organization",
        data,
      ),
    onMutate: () => {
      setAutoSignOutSuppressed(true);
    },
    onSettled: () => {
      window.setTimeout(() => setAutoSignOutSuppressed(false), 4000);
    },
  });
};
