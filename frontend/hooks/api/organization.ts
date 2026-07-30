"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { UseQueryOptions } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import type { OrgSettings, OrgMember, Invitation } from "@/types/organization";

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
  return useQuery<OrgSettings, Error>({
    queryKey: queryKeys.organization.settings(),
    queryFn: () => apiClient.get<OrgSettings>("/organization/settings"),
    staleTime: 30 * 60_000,
    ...options,
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
  const safeLimit = Math.min(Math.max(limit, 1), 200);
  return useQuery<MembersResponse, Error>({
    queryKey: [
      ...queryKeys.organization.members(),
      { page, limit: safeLimit, search },
    ] as const,
    queryFn: () =>
      apiClient.get<MembersResponse>("/organization/members", {
        page: String(page),
        limit: String(safeLimit),
        ...(search ? { search } : {}),
      }),
    staleTime: 30_000,
    ...options,
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
  const { enabled: callerEnabled, ...restOptions } = options ?? {};
  return useQuery<MembersResponse, Error>({
    queryKey: [...queryKeys.organization.members(), { userIds: ids }] as const,
    queryFn: () =>
      apiClient.get<MembersResponse>("/organization/members", {
        page: "1",
        limit: String(Math.min(Math.max(ids.length, 1), 100)),
        userIds: ids.join(","),
      }),
    staleTime: 5 * 60_000,
    enabled: ids.length > 0 && (callerEnabled ?? true),
    ...restOptions,
  });
};

export const useInvitations = (
  options?: Omit<UseQueryOptions<Invitation[], Error>, "queryKey" | "queryFn">,
) => {
  return useQuery<Invitation[], Error>({
    queryKey: queryKeys.organization.invitations(),
    queryFn: () => apiClient.get<Invitation[]>("/organization/invitations"),
    ...options,
    staleTime: 30_000,
  });
};

export const useInviteUser = () => {
  const queryClient = useQueryClient();
  return useMutation<
    { success: boolean; invitationId: string },
    Error,
    { email: string; role: string }
  >({
    mutationKey: ["organization", "invite-user"],
    mutationFn: (data) =>
      apiClient.post<{ success: boolean; invitationId: string }>(
        "/organization/members",
        data,
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.organization.invitations(),
      });
    },
  });
};

export const useCancelInvitation = () => {
  const queryClient = useQueryClient();
  return useMutation<{ success: boolean }, Error, { invitationId: string }>({
    mutationKey: ["cancel", "invitation"],
    mutationFn: (data) =>
      apiClient.delete<{ success: boolean }>("/organization/invitations", {
        data,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.organization.invitations(),
      });
    },
  });
};

export const useUpdateMemberRole = () => {
  const queryClient = useQueryClient();
  return useMutation<
    { success: boolean },
    Error,
    { userId: string; role: string }
  >({
    mutationKey: ["organization", "update-member-role"],
    mutationFn: ({ userId, role }) =>
      apiClient.patch<{ success: boolean }>(`/organization/members/${userId}`, {
        role,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.organization.members(),
      });
    },
  });
};

export const useRemoveOrgMember = () => {
  const queryClient = useQueryClient();
  return useMutation<void, Error, string>({
    mutationKey: ["organization", "remove-member"],
    mutationFn: (userId) => apiClient.delete<void>(`/organization/members/${userId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.organization.members(),
      });
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
      currency?: string;
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
      enabledModules?: string[];
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
    },
  });
};

interface OrgHoliday {
  id: string;
  name: string;
  date: string;
  recurring: boolean;
  createdAt: string;
}

export const useOrgHolidays = (
  options?: Omit<UseQueryOptions<OrgHoliday[], Error>, "queryKey" | "queryFn">,
) =>
  useQuery<OrgHoliday[], Error>({
    queryKey: [...queryKeys.organization.all, "holidays"],
    queryFn: () => apiClient.get<OrgHoliday[]>("/organization/holidays"),
    staleTime: 60_000,
    ...options,
  });

export const useCreateOrgHoliday = () => {
  const queryClient = useQueryClient();
  return useMutation<
    { id: string },
    Error,
    { name: string; date: string; recurring?: boolean }
  >({
    mutationKey: ["organization", "holidays", "create"],
    mutationFn: (data) =>
      apiClient.post<{ id: string }>("/organization/holidays", data),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: [...queryKeys.organization.all, "holidays"],
      });
    },
  });
};

export const useDeleteOrgHoliday = () => {
  const queryClient = useQueryClient();
  return useMutation<{ success: boolean }, Error, string>({
    mutationKey: ["delete", "org", "holiday"],
    mutationFn: (id) =>
      apiClient.delete<{ success: boolean }>(`/organization/holidays/${id}`),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: [...queryKeys.organization.all, "holidays"],
      });
    },
  });
};

export const useArchiveOrg = () => {
  const queryClient = useQueryClient();
  return useMutation<{ success: boolean }, Error, void>({
    mutationKey: ["archive", "org"],
    mutationFn: () =>
      apiClient.post<{ success: boolean }>("/organization/archive", {}),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.organization.settings(),
      });
    },
  });
};

export const useRestoreOrg = () => {
  const queryClient = useQueryClient();
  return useMutation<{ success: boolean }, Error, void>({
    mutationKey: ["restore", "org"],
    mutationFn: () =>
      apiClient.post<{ success: boolean }>("/organization/restore", {}),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.organization.settings(),
      });
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
  const queryClient = useQueryClient();
  return useMutation<{ success: boolean; nextOrgId?: string }, Error, void>({
    mutationKey: ["organization", "leave"],
    mutationFn: () =>
      apiClient.post<{ success: boolean; nextOrgId?: string }>(
        "/organization/leave",
        {},
      ),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.organization.all,
      });
    },
  });
};

export const useDeleteOrg = () => {
  const queryClient = useQueryClient();
  return useMutation<{ success: boolean }, Error, { confirmation: string }>({
    mutationKey: ["organization", "delete"],
    mutationFn: (data) =>
      apiClient.delete<{ success: boolean }>("/organization", { data }),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.organization.all,
      });
    },
  });
};
