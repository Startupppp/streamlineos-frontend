"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { UseQueryOptions } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";

interface UserListParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: "active" | "suspended" | "archived";
  role?: string;
  departmentId?: number;
  branchId?: string;
  teamId?: string;
  managerUserId?: string;
  sortBy?: "name" | "joinedAt" | "status";
  sortOrder?: "asc" | "desc";
}

interface UserSession {
  id: string;
  userId: string;
  userAgent: string | null;
  browser: string;
  os: string | null;
  platform: string | null;
  ipAddress: string | null;
  isRevoked: boolean;
  lastActive: string;
  deviceId: string | null;
  expiresAt: string | null;
  createdAt: string;
}

interface UserDevice {
  id: string;
  userId: string;
  fingerprint: string;
  browser: string | null;
  os: string | null;
  platform: string | null;
  trusted: boolean;
  lastSeenAt: string;
  createdAt: string;
}

interface UserPreferences {
  userId: string;
  theme: string;
  language: string;
  timezone: string;
  dateFormat: string;
  timeFormat: string;
  numberFormat: string | null;
  weekStartDay: string | null;
  notificationPreferences: Record<string, boolean>;
  dashboardPreferences: Record<string, unknown>;
  updatedAt: string;
}

interface EmergencyContact {
  name: string;
  relation: string;
  phone: string;
  email?: string;
}

interface User {
  id: string;
  name: string | null;
  email: string;
  firstName: string | null;
  lastName: string | null;
  image: string | null;
  role: string;
  designation: string | null;
  phone: string | null;
  departmentId: number | null;
  branchId: string | null;
  isActive: boolean;
  hasDashboardAccess: boolean;
  reportingTo: string | null;
  team: string | null;
  bio: string | null;
  linkedinUrl: string | null;
  twitterUrl: string | null;
  githubUrl: string | null;
  websiteUrl: string | null;
  emergencyContact: EmergencyContact | null;
  joinedAt: string | null;
  createdAt: string;
  updatedAt: string;
  lastSeenAt?: string | null;
  teams?: string[];
}

interface UsersResponse {
  data: User[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

interface UserStats {
  total: number;
  active: number;
  suspended: number;
  pendingInvitations: number;
  newThisMonth: number;
}

export const useUsers = (
  params?: UserListParams,
  options?: Omit<UseQueryOptions<UsersResponse, Error>, "queryKey" | "queryFn">
) => {
  return useQuery<UsersResponse, Error>({
    queryKey: queryKeys.users.list(params as Record<string, unknown> | undefined),
    queryFn: () =>
      apiClient.get<UsersResponse>("/users", {
        ...(params?.page ? { page: String(params.page) } : {}),
        ...(params?.limit ? { limit: String(params.limit) } : {}),
        ...(params?.search ? { search: params.search } : {}),
        ...(params?.status ? { status: params.status } : {}),
        ...(params?.role ? { role: params.role } : {}),
        ...(params?.departmentId ? { departmentId: String(params.departmentId) } : {}),
        ...(params?.branchId ? { branchId: String(params.branchId) } : {}),
        ...(params?.sortBy ? { sortBy: params.sortBy } : {}),
        ...(params?.sortOrder ? { sortOrder: params.sortOrder } : {}),
      }),
    staleTime: 30_000,
    ...options,
  });
};

export const useUser = (
  userId: string,
  options?: Omit<UseQueryOptions<User, Error>, "queryKey" | "queryFn">
) => {
  return useQuery<User, Error>({
    queryKey: queryKeys.users.detail(userId),
    queryFn: () => apiClient.get<User>(`/users/${userId}`),
    enabled: !!userId,
    ...options,
    staleTime: 30_000,
  });
};

export const useUserSessions = (
  userId: string,
  options?: Omit<UseQueryOptions<UserSession[], Error>, "queryKey" | "queryFn">
) => {
  return useQuery<UserSession[], Error>({
    queryKey: queryKeys.users.sessions(userId),
    queryFn: () => apiClient.get<UserSession[]>(`/users/${userId}/sessions`),
    enabled: !!userId,
    ...options,
    staleTime: 30_000,
  });
};

export const useUserDevices = (
  userId: string,
  options?: Omit<UseQueryOptions<UserDevice[], Error>, "queryKey" | "queryFn">
) => {
  return useQuery<UserDevice[], Error>({
    queryKey: queryKeys.users.devices(userId),
    queryFn: () => apiClient.get<UserDevice[]>(`/users/${userId}/devices`),
    enabled: !!userId,
    ...options,
    staleTime: 30_000,
  });
};

export const useUserPreferences = (
  userId: string,
  options?: Omit<UseQueryOptions<UserPreferences, Error>, "queryKey" | "queryFn">
) => {
  return useQuery<UserPreferences, Error>({
    queryKey: queryKeys.users.preferences(userId),
    queryFn: () => apiClient.get<UserPreferences>(`/users/${userId}/preferences`),
    enabled: !!userId,
    ...options,
    staleTime: 30_000,
  });
};

export const useUserStats = (
  options?: Omit<UseQueryOptions<UserStats, Error>, "queryKey" | "queryFn">
) => {
  return useQuery<UserStats, Error>({
    queryKey: queryKeys.users.stats(),
    queryFn: () => apiClient.get<UserStats>("/users/stats"),
    staleTime: 60_000,
    ...options,
  });
};

export const useUpdateUser = () => {
  const queryClient = useQueryClient();
  return useMutation<User, Error, { userId: string; data: Partial<User> }>({
    mutationKey: ["update", "user"],
    mutationFn: ({ userId, data }) => apiClient.patch<User>(`/users/${userId}`, data),
    onSuccess: (_, { userId }) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.users.detail(userId) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.users.all });
    },
  });
};

export const useUpdateUserStatus = () => {
  const queryClient = useQueryClient();
  return useMutation<
    { success: boolean },
    Error,
    { userId: string; status: "active" | "suspended" | "archived"; reason?: string }
  >({
    mutationKey: ["users", "update-status"],
    mutationFn: ({ userId, status, reason }) =>
      apiClient.patch<{ success: boolean }>(`/users/${userId}/status`, { status, reason }),
    onSuccess: (_, { userId }) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.users.detail(userId) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.users.all });
      void queryClient.invalidateQueries({ queryKey: queryKeys.users.stats() });
    },
  });
};

export const useDeleteUser = () => {
  const queryClient = useQueryClient();
  return useMutation<{ success: boolean }, Error, string>({
    mutationKey: ["delete", "user"],
    mutationFn: (userId) => apiClient.delete<{ success: boolean }>(`/users/${userId}`),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.users.all });
      void queryClient.invalidateQueries({ queryKey: queryKeys.users.stats() });
    },
  });
};

export const useRevokeSession = () => {
  const queryClient = useQueryClient();
  return useMutation<
    { success: boolean },
    Error,
    { userId: string; sessionId: string }
  >({
    mutationKey: ["users", "revoke-session"],
    mutationFn: ({ userId, sessionId }) =>
      apiClient.delete<{ success: boolean }>(`/users/${userId}/sessions/${sessionId}`),
    onSuccess: (_, { userId }) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.users.sessions(userId) });
    },
  });
};

export const useRevokeAllSessions = () => {
  const queryClient = useQueryClient();
  return useMutation<{ success: boolean }, Error, string>({
    mutationKey: ["revoke", "all", "sessions"],
    mutationFn: (userId) =>
      apiClient.delete<{ success: boolean }>(`/users/${userId}/sessions`),
    onSuccess: (_, userId) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.users.sessions(userId) });
    },
  });
};

export const useRemoveDevice = () => {
  const queryClient = useQueryClient();
  return useMutation<
    { success: boolean },
    Error,
    { userId: string; deviceId: string }
  >({
    mutationKey: ["users", "remove-device"],
    mutationFn: ({ userId, deviceId }) =>
      apiClient.delete<{ success: boolean }>(`/users/${userId}/devices/${deviceId}`),
    onSuccess: (_, { userId }) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.users.devices(userId) });
    },
  });
};

export const useUpdateUserPreferences = () => {
  const queryClient = useQueryClient();
  return useMutation<
    UserPreferences,
    Error,
    { userId: string; data: Partial<UserPreferences> }
  >({
    mutationKey: ["users", "update-preferences"],
    mutationFn: ({ userId, data }) =>
      apiClient.patch<UserPreferences>(`/users/${userId}/preferences`, data),
    onSuccess: (_, { userId }) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.users.preferences(userId) });
    },
  });
};

interface InviteUserPayload {
  email: string;
  role: string;
}

export const useInviteUser = () => {
  const queryClient = useQueryClient();
  return useMutation<
    { success: boolean; invitationId: string; resent: boolean },
    Error,
    InviteUserPayload
  >({
    mutationKey: ["users", "invite"],
    mutationFn: (data) =>
      apiClient.post<{ success: boolean; invitationId: string; resent: boolean }>("/users/invite", data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.users.all });
    },
  });
};

export const useBulkInviteUsers = () => {
  const queryClient = useQueryClient();
  return useMutation<
    { results: Array<{ email: string; success: boolean; invitationId?: string; error?: string }> },
    Error,
    { emails: string[]; role: string; orgId?: string }
  >({
    mutationKey: ["users", "bulk-invite"],
    mutationFn: (data) =>
      apiClient.post<{ results: Array<{ email: string; success: boolean; invitationId?: string; error?: string }> }>(
        "/users/bulk-invite",
        data
      ),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.users.all });
    },
  });
};

interface Invitation {
  id: string;
  email: string;
  role: string;
  invitedBy: string;
  expiresAt: string;
  acceptedAt: string | null;
  createdAt: string;
}

interface InvitationsResponse {
  data: Invitation[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
}

interface LoginHistoryItem {
  id: string;
  userId: string;
  orgId: string | null;
  event: string;
  ipAddress: string | null;
  userAgent: string | null;
  browser: string;
  os: string | null;
  platform: string | null;
  country: string | null;
  city: string | null;
  success: boolean;
  failureReason: string | null;
  deviceId: string | null;
  createdAt: string;
}

interface LoginHistoryResponse {
  data: LoginHistoryItem[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
}

interface UserMembership {
  userId: string;
  orgId: string;
  businessUnitId: string | null;
  branchId: string | null;
  departmentId: number | null;
  teamId: string | null;
  managerUserId: string | null;
  isPrimary: boolean;
}

/**
 * Payload for PATCH /users/:id/membership.
 *
 * Every field is an org-unit id (`org_units.id`, a string) — it is NOT the
 * `UserMembership` response shape, whose `branchId`/`departmentId` are numeric
 * legacy columns. Mixing the two is what produced `Number(uuid)` -> NaN.
 */
export interface UpdateUserMembershipPayload {
  businessUnitId?: string | null;
  branchId?: string | null;
  departmentId?: string | null;
  teamId?: string | null;
  managerUserId?: string | null;
}

interface BulkActionResult {
  results: Array<{ userId: string; success: boolean; error?: string }>;
  succeeded: number;
  failed: number;
}

export const useInvitations = (
  params?: { page?: number; limit?: number; includeAccepted?: boolean },
  options?: Omit<UseQueryOptions<InvitationsResponse, Error>, "queryKey" | "queryFn">
) => {
  return useQuery<InvitationsResponse, Error>({
    queryKey: queryKeys.users.invitations(params as Record<string, unknown> | undefined),
    queryFn: () =>
      apiClient.get<InvitationsResponse>("/users/invitations", {
        ...(params?.page ? { page: String(params.page) } : {}),
        ...(params?.limit ? { limit: String(params.limit) } : {}),
        ...(params?.includeAccepted ? { includeAccepted: "true" } : {}),
      }),
    staleTime: 30_000,
    ...options,
  });
};

export const useResendInvite = () => {
  const queryClient = useQueryClient();
  return useMutation<{ success: boolean }, Error, string>({
    mutationKey: ["resend", "invite"],
    mutationFn: (invitationId) =>
      apiClient.post<{ success: boolean }>(`/users/invitations/${invitationId}/resend`, {}),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.users.invitations() });
    },
  });
};

export const useChangeInvitationRole = () => {
  const queryClient = useQueryClient();
  return useMutation<{ success: boolean }, Error, { invitationId: string; role: string }>({
    mutationKey: ["change", "invitation-role"],
    mutationFn: ({ invitationId, role }) =>
      apiClient.patch<{ success: boolean }>(
        `/users/invitations/${invitationId}/role`,
        { role },
      ),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.users.invitations() });
    },
  });
};

export const useCancelInvitation = () => {
  const queryClient = useQueryClient();
  return useMutation<{ success: boolean }, Error, string>({
    mutationKey: ["cancel", "invitation"],
    mutationFn: (invitationId) =>
      apiClient.delete<{ success: boolean }>(`/users/invitations/${invitationId}`),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.users.invitations() });
      void queryClient.invalidateQueries({ queryKey: queryKeys.users.stats() });
    },
  });
};

export const useUserLoginHistory = (
  userId: string,
  params?: { page?: number; limit?: number; success?: boolean },
  options?: Omit<UseQueryOptions<LoginHistoryResponse, Error>, "queryKey" | "queryFn">
) => {
  return useQuery<LoginHistoryResponse, Error>({
    queryKey: queryKeys.users.loginHistory(userId, params as Record<string, unknown> | undefined),
    queryFn: () =>
      apiClient.get<LoginHistoryResponse>(`/users/${userId}/login-history`, {
        ...(params?.page ? { page: String(params.page) } : {}),
        ...(params?.limit ? { limit: String(params.limit) } : {}),
        ...(params?.success !== undefined ? { success: String(params.success) } : {}),
      }),
    enabled: !!userId,
    ...options,
    staleTime: 30_000,
  });
};

export const useUserMembership = (
  userId: string,
  options?: Omit<UseQueryOptions<UserMembership, Error>, "queryKey" | "queryFn">
) => {
  return useQuery<UserMembership, Error>({
    queryKey: queryKeys.users.membership(userId),
    queryFn: () => apiClient.get<UserMembership>(`/users/${userId}/membership`),
    enabled: !!userId,
    ...options,
    staleTime: 30_000,
  });
};

export const useUpdateUserMembership = () => {
  const queryClient = useQueryClient();
  return useMutation<
    { success: boolean },
    Error,
    { userId: string; data: UpdateUserMembershipPayload }
  >({
    mutationKey: ["users", "update-membership"],
    mutationFn: ({ userId, data }) =>
      apiClient.patch<{ success: boolean }>(`/users/${userId}/membership`, data),
    onSuccess: (_, { userId }) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.users.membership(userId) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.users.detail(userId) });
    },
  });
};

export const useBulkSuspend = () => {
  const queryClient = useQueryClient();
  return useMutation<BulkActionResult, Error, { userIds: string[]; reason?: string }>({
    mutationKey: ["bulk", "suspend"],
    mutationFn: (data) => apiClient.post<BulkActionResult>("/users/bulk-suspend", data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.users.all });
      void queryClient.invalidateQueries({ queryKey: queryKeys.users.stats() });
    },
  });
};

export const useBulkArchive = () => {
  const queryClient = useQueryClient();
  return useMutation<BulkActionResult, Error, { userIds: string[]; reason?: string }>({
    mutationKey: ["bulk", "archive"],
    mutationFn: (data) => apiClient.post<BulkActionResult>("/users/bulk-archive", data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.users.all });
      void queryClient.invalidateQueries({ queryKey: queryKeys.users.stats() });
    },
  });
};

export const useBulkRestore = () => {
  const queryClient = useQueryClient();
  return useMutation<BulkActionResult, Error, { userIds: string[]; reason?: string }>({
    mutationKey: ["bulk", "restore"],
    mutationFn: (data) => apiClient.post<BulkActionResult>("/users/bulk-restore", data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.users.all });
      void queryClient.invalidateQueries({ queryKey: queryKeys.users.stats() });
    },
  });
};

interface BulkUpdatePayload {
  userIds: string[];
  role?: string;
  departmentId?: number | null;
  branchId?: number | null;
  teamId?: string | null;
  managerUserId?: string | null;
}

export const useBulkUpdateUsers = () => {
  const queryClient = useQueryClient();
  return useMutation<{ success: boolean; updated: number }, Error, BulkUpdatePayload>({
    mutationKey: ["bulk", "update", "users"],
    mutationFn: (data) => apiClient.post<{ success: boolean; updated: number }>("/users/bulk-update", data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.users.all });
    },
  });
};

export const useSendSigninLink = () => {
  return useMutation<{ success: boolean; email: string }, Error, string>({
    mutationKey: ["send", "signin", "link"],
    mutationFn: (userId) => apiClient.post<{ success: boolean; email: string }>(`/users/${userId}/send-signin-link`, {}),
  });
};

interface AuditEntry {
  id: string;
  orgId: string;
  userId: string;
  actorUserId: string | null;
  action: string;
  resourceType: string | null;
  resourceId: string | null;
  metadata: Record<string, unknown>;
  ipAddress: string | null;
  createdAt: string;
}

interface AuditResponse {
  data: AuditEntry[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
}

export const useUserAuditLog = (
  userId: string,
  params?: { page?: number; limit?: number; from?: string; to?: string },
  options?: Omit<UseQueryOptions<AuditResponse, Error>, "queryKey" | "queryFn">
) => {
  return useQuery<AuditResponse, Error>({
    queryKey: [...queryKeys.users.detail(userId), "audit", params] as readonly unknown[],
    queryFn: () =>
      apiClient.get<AuditResponse>(`/users/${userId}/audit`, {
        ...(params?.page ? { page: String(params.page) } : {}),
        ...(params?.limit ? { limit: String(params.limit) } : {}),
        ...(params?.from ? { from: params.from } : {}),
        ...(params?.to ? { to: params.to } : {}),
      }),
    enabled: !!userId,
    ...options,
    staleTime: 30_000,
  });
};

export const useOrgAuditLog = (
  params?: { page?: number; limit?: number; actorUserId?: string; action?: string; from?: string; to?: string },
  options?: Omit<UseQueryOptions<AuditResponse, Error>, "queryKey" | "queryFn">
) => {
  return useQuery<AuditResponse, Error>({
    queryKey: queryKeys.users.orgAuditLog(params as Record<string, unknown> | undefined),
    queryFn: () =>
      apiClient.get<AuditResponse>("/users/audit", {
        ...(params?.page ? { page: String(params.page) } : {}),
        ...(params?.limit ? { limit: String(params.limit) } : {}),
        ...(params?.actorUserId ? { actorUserId: params.actorUserId } : {}),
        ...(params?.action ? { action: params.action } : {}),
        ...(params?.from ? { from: params.from } : {}),
        ...(params?.to ? { to: params.to } : {}),
      }),
    staleTime: 30_000,
    ...options,
  });
};

export const useExportUsers = () => {
  return useMutation<void, Error, void>({
    mutationKey: ["export", "users"],
    mutationFn: async () => {
      const csv = await apiClient.get<string>("/users/export");
      const blob = new Blob([csv], { type: "text/csv" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "users.csv";
      a.click();
      URL.revokeObjectURL(url);
    },
  });
};

export type {
  User,
  UsersResponse,
  EmergencyContact,
  UserSession,
  UserDevice,
  UserPreferences,
  UserStats,
  Invitation,
  InvitationsResponse,
  LoginHistoryItem,
  LoginHistoryResponse,
  UserMembership,
  BulkActionResult,
  BulkUpdatePayload,
  AuditEntry,
  AuditResponse,
  InviteUserPayload,
};
