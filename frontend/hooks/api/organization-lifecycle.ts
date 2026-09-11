"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { UseQueryOptions } from "@tanstack/react-query";
import { apiClient, setAutoSignOutSuppressed } from "@/lib/api-client";
import { lazyContract } from "@/lib/api-envelope";
import { platformCoreQueryKeys } from "@/lib/query-keys/platform-core";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";

const archivedOrgListContract = lazyContract(() =>
  import("@/hooks/api/org-settings-schema").then((m) => m.archivedOrgListContract),
);
const archiveOrgContract = lazyContract(() =>
  import("@/hooks/api/org-settings-schema").then((m) => m.archiveOrgContract),
);
const restoreOrgContract = lazyContract(() =>
  import("@/hooks/api/org-settings-schema").then((m) => m.restoreOrgContract),
);
const createOrgContract = lazyContract(() =>
  import("@/hooks/api/org-settings-schema").then((m) => m.createOrgContract),
);
const leaveOrgContract = lazyContract(() =>
  import("@/hooks/api/org-settings-schema").then((m) => m.leaveOrgContract),
);
const deleteOrgContract = lazyContract(() =>
  import("@/hooks/api/org-settings-schema").then((m) => m.deleteOrgContract),
);

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
    queryKey: platformCoreQueryKeys.organization.archived(),
    queryFn: ({ signal }) =>
      apiClient.get<ArchivedOrganization[]>("/organization/archived", undefined, signal, archivedOrgListContract),
    staleTime: 30_000,
    ...restOptions,
    enabled: callerEnabled ?? true,
  });
};

export const useArchiveOrg = () => {
  return useAuthorizedMutation<
    { success: boolean; nextOrgId: string | null },
    Error,
    void
  >("settings:manage", {
    mutationKey: ["archive", "org"],
    mutationFn: () =>
      apiClient.post<{ success: boolean; nextOrgId: string | null }>(
        "/organization/archive",
        {},
        undefined,
        archiveOrgContract,
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
        undefined,
        restoreOrgContract,
      ),
    onMutate: () => {
      setAutoSignOutSuppressed(true);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: platformCoreQueryKeys.organization.all,
      });
      void queryClient.invalidateQueries({
        queryKey: platformCoreQueryKeys.organization.archived(),
      });
      void queryClient.invalidateQueries({
        queryKey: platformCoreQueryKeys.organization.settings(),
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
      apiClient.post<CreateOrganizationResult>("/organization", data, undefined, createOrgContract),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: platformCoreQueryKeys.organization.all,
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
        undefined,
        leaveOrgContract,
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
  return useAuthorizedMutation<
    { success: true; nextOrgId: string | null },
    Error,
    { confirmation: string }
  >("settings:manage", {
    mutationKey: ["organization", "delete"],
    mutationFn: (data) =>
      apiClient.delete<{ success: true; nextOrgId: string | null }>(
        "/organization",
        data,
        undefined,
        deleteOrgContract,
      ),
    onMutate: () => {
      setAutoSignOutSuppressed(true);
    },
    onSettled: () => {
      window.setTimeout(() => setAutoSignOutSuppressed(false), 4000);
    },
  });
};
