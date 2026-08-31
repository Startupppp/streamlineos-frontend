export interface UserListParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: "active" | "suspended" | "archived";
  role?: string;
  departmentId?: string;
  branchId?: string;
  teamId?: string;
  managerUserId?: string;
  sortBy?: "name" | "joinedAt" | "status";
  sortOrder?: "asc" | "desc";
}

export interface UserSession {
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

export interface UserPreferences {
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

export interface EmergencyContact {
  name: string;
  relation: string;
  phone: string;
  email?: string;
}

export interface User {
  id: string;
  name: string | null;
  email: string;
  firstName: string | null;
  lastName: string | null;
  image: string | null;
  role: string;
  isOwner: boolean;
  phone: string | null;
  isActive: boolean;
  userStatus?: string | null;
  archivedAt?: string | null;
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

export interface UpdateUserInput {
  firstName?: string;
  lastName?: string;
  designation?: string;
  phone?: string;
  departmentId?: string;
  role?: "OWNER" | "ORG_ADMIN" | "MEMBER";
  bio?: string;
  linkedinUrl?: string;
  twitterUrl?: string;
  githubUrl?: string;
  websiteUrl?: string;
  reportingTo?: string;
  teamId?: string | null;
  emergencyContact?: EmergencyContact | null;
}

export interface UsersResponse {
  data: User[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface UserStats {
  total: number;
  active: number;
  suspended: number;
  archived: number;
  pendingInvitations: number;
  newThisMonth: number;
}

export interface InviteUserPayload {
  email: string;
  role: "OWNER" | "ORG_ADMIN" | "MEMBER";
}

export interface Invitation {
  id: string;
  email: string;
  role: string;
  invitedBy: string;
  expiresAt: string;
  acceptedAt: string | null;
  createdAt: string;
  status: "PENDING" | "ACCEPTED" | "DECLINED" | "EXPIRED" | "REVOKED";
  revokedAt: string | null;
  deliveryFailed: boolean;
}

export interface InvitationsResponse {
  data: Invitation[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
}

export interface LoginHistoryItem {
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

export interface LoginHistoryResponse {
  data: LoginHistoryItem[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
}

export interface UserMembership {
  userId: string;
  orgId: string;
  businessUnitId: string | null;
  branchId: string | null;
  departmentId: string | null;
  teamId: string | null;
  managerUserId: string | null;
  isPrimary: boolean;
}

export interface UpdateUserMembershipPayload {
  businessUnitId?: string | null;
  branchId?: string | null;
  departmentId?: string | null;
  teamId?: string | null;
  managerUserId?: string | null;
}

export interface BulkActionResult {
  results: Array<{ userId: string; success: boolean; error?: string }>;
  succeeded: number;
  failed: number;
}

export interface BulkUpdatePayload {
  userIds: string[];
  role?: "OWNER" | "ORG_ADMIN" | "MEMBER";
  departmentId?: string | null;
  branchId?: string | null;
  teamId?: string | null;
  managerUserId?: string | null;
}

export interface AuditEntry {
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

export interface AuditResponse {
  data: AuditEntry[];
  pagination: { limit: number; nextCursor: string | null; hasMore: boolean };
}
