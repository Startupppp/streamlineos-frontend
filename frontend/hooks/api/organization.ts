"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { UseQueryOptions } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import type { OrgSettings, OrgMember } from "@/types/organization";
import { useCan } from "@/hooks/api/access";

export {
  useArchivedOrganizations,
  useArchiveOrg,
  useRestoreOrg,
  useCreateOrganization,
  useLeaveOrg,
  useDeleteOrg,
} from "./organization-lifecycle";

interface MembersResponse {
  data: OrgMember[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export const useOrgSettings = (
  options?: Omit<UseQueryOptions<OrgSettings, Error>, "queryKey" | "queryFn">,
) => {
  const canViewSettings = useCan("settings:view");
  const { enabled: callerEnabled, ...restOptions } = options ?? {};
  return useQuery<OrgSettings, Error>({
    queryKey: queryKeys.organization.settings(),
    queryFn: () => apiClient.get<OrgSettings>("/organization/settings"),
    staleTime: 30 * 60_000,
    ...restOptions,
    enabled: canViewSettings && (callerEnabled ?? true),
  });
};

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
      ...queryKeys.organization.members(),
      { page, limit: safeLimit, search, includeInactive: false },
    ] as const,
    queryFn: () =>
      apiClient.get<MembersResponse>("/organization/members", {
        page: String(page),
        limit: String(safeLimit),
        ...(search ? { search } : {}),
      }),
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
      ...queryKeys.organization.members(),
      { userIds: ids, includeInactive: true },
    ] as const,
    queryFn: () =>
      apiClient.get<MembersResponse>("/organization/members", {
        page: "1",
        limit: String(Math.min(Math.max(ids.length, 1), 100)),
        userIds: ids.join(","),
        includeInactive: "true",
      }),
    staleTime: 5 * 60_000,
    ...restOptions,
    enabled: canViewMembers && ids.length > 0 && (callerEnabled ?? true),
  });
};

export const useRemoveOrgMember = () => {
  const queryClient = useQueryClient();
  return useMutation<void, Error, string>({
    mutationKey: ["organization", "remove-member"],
    mutationFn: (userId) => apiClient.delete<void>(`/organization/members/${userId}`),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.organization.members(),
      });
      void queryClient.invalidateQueries({ queryKey: queryKeys.users.all });
      void queryClient.invalidateQueries({ queryKey: queryKeys.users.stats() });
    },
  });
};

export const useUpdateOrgSettings = () => {
  const queryClient = useQueryClient();
  return useMutation<
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
      ipAllowlist?: string[];
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
  >({
    mutationKey: ["organization", "settings", "update"],
    mutationFn: (data) =>
      apiClient.patch<{ success: boolean }>("/organization/settings", data),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.organization.settings(),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.organization.display(),
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
  return useMutation<{ success: boolean }, Error, UpdateOrgSecurityInput>({
    mutationKey: ["organization", "security", "update"],
    mutationFn: (data) =>
      apiClient.patch<{ success: boolean }>("/organization/security", data),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.organization.settings(),
      });
    },
  });
};
