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
  options?: Omit<UseQueryOptions<OrgSettings, Error>, "queryKey" | "queryFn">
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
  >
) => {
  return useQuery<MembersResponse, Error>({
    queryKey: [...queryKeys.organization.members(), { page, limit, search }] as const,
    queryFn: () =>
      apiClient.get<MembersResponse>("/organization/members", {
        page: String(page),
        limit: String(limit),
        ...(search ? { search } : {}),
      }),
    staleTime: 30_000,
    ...options,
  });
};

export const useInvitations = (
  options?: Omit<
    UseQueryOptions<Invitation[], Error>,
    "queryKey" | "queryFn"
  >
) => {
  return useQuery<Invitation[], Error>({
    queryKey: queryKeys.organization.invitations(),
    queryFn: () => apiClient.get<Invitation[]>("/organization/invitations"),
    ...options,
  });
};

export const useInviteUser = () => {
  const queryClient = useQueryClient();
  return useMutation<
    { success: boolean; invitationId: string },
    Error,
    { email: string; role: string }
  >({
    mutationFn: (data) =>
      apiClient.post<{ success: boolean; invitationId: string }>(
        "/organization/members",
        data
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
    mutationFn: ({ userId, role }) =>
      apiClient.patch<{ success: boolean }>(
        `/organization/members/${userId}`,
        { role }
      ),
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
      businessHours?: Record<string, { open: string; close: string; enabled: boolean }>;
      enabledModules?: string[];
      companySize?: string | null;
      country?: string | null;
    }
  >({
    mutationFn: (data) =>
      apiClient.patch<{ success: boolean }>("/organization/settings", data),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.organization.settings(),
      });
    },
  });
};

export const useUpdateOrgSecuritySettings = () => {
  const queryClient = useQueryClient();
  return useMutation<
    { success: boolean },
    Error,
    { mfaEnforced?: boolean; passwordExpiryDays?: number | null; allowedEmailDomains?: string[]; maxConcurrentSessions?: number | null }
  >({
    mutationKey: ["organization", "security", "update"],
    mutationFn: (data) =>
      apiClient.patch<{ success: boolean }>("/organization/security", data),
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

interface OrgCustomDomain {
  id: string;
  domain: string;
  verificationToken: string;
  verifiedAt: string | null;
  createdAt: string;
}

export const useOrgHolidays = (
  options?: Omit<UseQueryOptions<OrgHoliday[], Error>, "queryKey" | "queryFn">
) =>
  useQuery<OrgHoliday[], Error>({
    queryKey: [...queryKeys.organization.all, "holidays"],
    queryFn: () => apiClient.get<OrgHoliday[]>("/organization/holidays"),
    staleTime: 60_000,
    ...options,
  });

export const useCreateOrgHoliday = () => {
  const queryClient = useQueryClient();
  return useMutation<{ id: string }, Error, { name: string; date: string; recurring?: boolean }>({
    mutationFn: (data) => apiClient.post<{ id: string }>("/organization/holidays", data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: [...queryKeys.organization.all, "holidays"] });
    },
  });
};

export const useDeleteOrgHoliday = () => {
  const queryClient = useQueryClient();
  return useMutation<{ success: boolean }, Error, string>({
    mutationFn: (id) => apiClient.delete<{ success: boolean }>(`/organization/holidays/${id}`),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: [...queryKeys.organization.all, "holidays"] });
    },
  });
};

export const useOrgCustomDomains = (
  options?: Omit<UseQueryOptions<OrgCustomDomain[], Error>, "queryKey" | "queryFn">
) =>
  useQuery<OrgCustomDomain[], Error>({
    queryKey: [...queryKeys.organization.all, "custom-domains"],
    queryFn: () => apiClient.get<OrgCustomDomain[]>("/organization/custom-domains"),
    staleTime: 60_000,
    ...options,
  });

export const useAddCustomDomain = () => {
  const queryClient = useQueryClient();
  return useMutation<OrgCustomDomain, Error, { domain: string }>({
    mutationFn: (data) => apiClient.post<OrgCustomDomain>("/organization/custom-domains", data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: [...queryKeys.organization.all, "custom-domains"] });
    },
  });
};

export const useVerifyCustomDomain = () => {
  const queryClient = useQueryClient();
  return useMutation<{ verified: boolean }, Error, string>({
    mutationFn: (domainId) =>
      apiClient.post<{ verified: boolean }>(`/organization/custom-domains/${domainId}/verify`, {}),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: [...queryKeys.organization.all, "custom-domains"] });
    },
  });
};

export const useRemoveCustomDomain = () => {
  const queryClient = useQueryClient();
  return useMutation<{ success: boolean }, Error, string>({
    mutationFn: (domainId) => apiClient.delete<{ success: boolean }>(`/organization/custom-domains/${domainId}`),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: [...queryKeys.organization.all, "custom-domains"] });
    },
  });
};

export const useArchiveOrg = () => {
  const queryClient = useQueryClient();
  return useMutation<{ success: boolean }, Error, void>({
    mutationFn: () => apiClient.post<{ success: boolean }>("/organization/archive", {}),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.organization.settings() });
    },
  });
};

export const useRestoreOrg = () => {
  const queryClient = useQueryClient();
  return useMutation<{ success: boolean }, Error, void>({
    mutationFn: () => apiClient.post<{ success: boolean }>("/organization/restore", {}),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.organization.settings() });
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
    mutationFn: (data) => apiClient.post<CreateOrganizationResult>("/organization", data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.organization.all });
    },
  });
};

export const useTransferOwnership = () => {
  const queryClient = useQueryClient();
  return useMutation<{ success: boolean }, Error, { newOwnerUserId: string }>({
    mutationFn: (data) =>
      apiClient.post<{ success: boolean }>("/organization/transfer-ownership", data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.organization.all });
    },
  });
};
