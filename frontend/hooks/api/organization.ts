"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { UseQueryOptions } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { platformCoreQueryKeys } from "@/lib/query-keys/platform-core";
import { usersAndCommerceQueryKeys } from "@/lib/query-keys/users-and-commerce";
import type { OrgSettings } from "@/types/organization";
import { useCan } from "@/hooks/api/access";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";
import { invalidateCalendarMemberLookups } from "@/hooks/api/users/cache";
import { lazyContract } from "@/lib/api-envelope";
import type { OrgMembersPage as MembersResponse } from "@/hooks/api/organization-schema";

export {
  useArchivedOrganizations,
  useArchiveOrg,
  useRestoreOrg,
  useCreateOrganization,
  useLeaveOrg,
  useDeleteOrg,
} from "./organization-lifecycle";

/**
 * Deferred: `leave-organization-control.tsx` sits in the shell's org switcher,
 * so this module is eager on every authenticated route. The contract is
 * unchanged and still passed to the seam — `GET /organization/members` is
 * keyset paginated and the client once declared `{ page, total, totalPages }`,
 * a shape the server has never sent.
 */
const noContentContract = lazyContract(() =>
  import("@/hooks/api/cursor-page-schema").then((m) => m.noContentContract),
);
const membersPageContract = lazyContract(() =>
  import("@/hooks/api/organization-schema").then(
    (m) => m.orgMembersPageContract,
  ),
);
const orgSettingsContract = lazyContract(() =>
  import("@/hooks/api/org-settings-schema").then((m) => m.orgSettingsContract),
);
const orgSuccessContract = lazyContract(() =>
  import("@/hooks/api/org-settings-schema").then((m) => m.orgSuccessContract),
);

export type { OrgMember, OrgMembersPage } from "@/hooks/api/organization-schema";

export const useOrgSettings = (
  options?: Omit<UseQueryOptions<OrgSettings, Error>, "queryKey" | "queryFn">,
) => {
  const canViewSettings = useCan("settings:view");
  const { enabled: callerEnabled, ...restOptions } = options ?? {};
  return useQuery<OrgSettings, Error>({
    queryKey: platformCoreQueryKeys.organization.settings(),
    queryFn: ({ signal }) => apiClient.get<OrgSettings>("/organization/settings", undefined, signal, orgSettingsContract),
    staleTime: 30 * 60_000,
    ...restOptions,
    enabled: canViewSettings && (callerEnabled ?? true),
  });
};

/**
 * `page` is inert and kept only so the ~50 existing call sites compile.
 * `GET /organization/members` is keyset paginated and its query DTO is
 * `.strict()`, so sending `page` was a 400 rather than a no-op. Page 2 comes
 * from `pagination.nextCursor`, and the cursor is invalidated by a filter
 * change.
 */
export const useOrgMembers = (
  page = 1,
  limit = 20,
  search?: string,
  options?: Omit<
    UseQueryOptions<MembersResponse, Error>,
    "queryKey" | "queryFn"
  >,
) => {
  const safeLimit = Math.min(Math.max(limit, 1), 100);
  const canViewMembers = useCan("settings:view");
  const { enabled: callerEnabled, ...restOptions } = options ?? {};
  return useQuery<MembersResponse, Error>({
    queryKey: [
      ...platformCoreQueryKeys.organization.members(),
      { page, limit: safeLimit, search, includeInactive: false },
    ] as const,
    queryFn: ({ signal }) =>
      apiClient.get("/organization/members", {
        limit: String(safeLimit),
        ...(search ? { search } : {}),
      }, signal, membersPageContract),
    staleTime: 30_000,
    ...restOptions,
    enabled: canViewMembers && (callerEnabled ?? true),
  });
};

export const useOrgMembersByIds = (
  userIds: string[],
  options?: Omit<
    UseQueryOptions<MembersResponse, Error>,
    "queryKey" | "queryFn"
  >,
) => {
  const ids = [...userIds].sort();
  const canViewMembers = useCan("settings:view");
  const { enabled: callerEnabled, ...restOptions } = options ?? {};
  return useQuery<MembersResponse, Error>({
    queryKey: [
      ...platformCoreQueryKeys.organization.members(),
      { userIds: ids, includeInactive: true },
    ] as const,
    queryFn: ({ signal }) =>
      apiClient.get("/organization/members", {
        limit: String(Math.min(Math.max(ids.length, 1), 100)),
        userIds: ids.join(","),
        includeInactive: "true",
      }, signal, membersPageContract),
    staleTime: 5 * 60_000,
    ...restOptions,
    enabled: canViewMembers && ids.length > 0 && (callerEnabled ?? true),
  });
};

export const useRemoveOrgMember = () => {
  const queryClient = useQueryClient();
  return useAuthorizedMutation<void, Error, string>("settings:organization:manage", {
    mutationKey: ["organization", "remove-member"],
    mutationFn: (userId) =>
      apiClient.delete<void>(`/organization/members/${userId}`, undefined, undefined, noContentContract),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: platformCoreQueryKeys.organization.members(),
      });
      void queryClient.invalidateQueries({ queryKey: usersAndCommerceQueryKeys.users.all });
      void queryClient.invalidateQueries({ queryKey: usersAndCommerceQueryKeys.users.stats() });
      invalidateCalendarMemberLookups(queryClient);
    },
  });
};

export const useUpdateOrgSettings = () => {
  const queryClient = useQueryClient();
  return useAuthorizedMutation<
    { success: boolean },
    Error,
    {
      name?: string;
      slug?: string;
      logo?: string | null;
      timezone?: string;
      currency?: "USD" | "EUR" | "INR" | "GBP" | "AED" | "SGD" | "AUD" | "CAD" | "JPY";
      fiscalYearStart?: number;
      directoryPublic?: boolean;
      primaryColor?: string | null;
      loginBgUrl?: string | null;
      industry?: string | null;
      website?: string | null;
      legalName?: string | null;
      orgCode?: string | null;
      registrationNumber?: string | null;
      taxNumber?: string | null;
      supportEmail?: string | null;
      supportPhone?: string | null;
      favicon?: string | null;
      secondaryColor?: string | null;
      language?: string;
      dateFormat?: string;
      timeFormat?: "12h" | "24h";
      numberFormat?: string;
      weekStartDay?: "monday" | "sunday" | "saturday";
      businessHours?: Record<
        string,
        { open: string; close: string; enabled: boolean }
      >;
      companySize?: string | null;
      country?: string | null;
    }
  >("settings:manage", {
    mutationKey: ["organization", "settings", "update"],
    mutationFn: (data) =>
      apiClient.patch<{ success: boolean }>("/organization/settings", data, undefined, orgSuccessContract),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: platformCoreQueryKeys.organization.settings(),
      });
      queryClient.invalidateQueries({
        queryKey: platformCoreQueryKeys.organization.display(),
      });
    },
  });
};

export interface UpdateOrgSecurityInput {
  mfaEnforced?: boolean;
  allowedEmailDomains?: string[];
  maxConcurrentSessions?: number | null;
  ipAllowlist?: string[];
}

export const useUpdateOrgSecurity = () => {
  const queryClient = useQueryClient();
  return useAuthorizedMutation<{ success: boolean }, Error, UpdateOrgSecurityInput>("settings:manage", {
    mutationKey: ["organization", "security", "update"],
    mutationFn: (data) =>
      apiClient.patch<{ success: boolean }>("/organization/security", data, undefined, orgSuccessContract),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: platformCoreQueryKeys.organization.settings(),
      });
    },
  });
};
