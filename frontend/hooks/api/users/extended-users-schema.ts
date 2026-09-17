import { z } from "zod";
import { cursorPageContract } from "@/hooks/api/cursor-page-schema";
import type { ResponseContract } from "@/lib/api-envelope";
import type { InvitationsResponse } from "./types";

/**
 * Response contracts for `UsersController`, `UserProfileService` and
 * `UserOpsService` handlers.
 *
 * Derived from `users-response.schemas.ts` in the backend.
 *
 * DISAGREEMENTS FOUND:
 * - `inviteUserResponseSchema` returns `organizationName: z.string()` that the
 *   frontend type does not include. The contract accepts it (no .strict()).
 * - Backend `userPreferencesResponseSchema` has `updatedAt: wireDate().optional()`
 *   matching the DB-or-defaults path; contract reflects this.
 *
 * NOT `.strict()`. Timestamps are ISO strings.
 */

const emergencyContactContract = z.object({
  name: z.string(),
  relation: z.string(),
  phone: z.string(),
  email: z.string().optional(),
});

const orgRoleEnum = z.enum(["OWNER", "ORG_ADMIN", "MEMBER"]);

const userListItemContract = z.object({
  membershipId: z.number(),
  id: z.string(),
  email: z.string(),
  name: z.string().nullable(),
  firstName: z.string().nullable(),
  lastName: z.string().nullable(),
  image: z.string().nullable(),
  role: orgRoleEnum,
  isOwner: z.boolean(),
  emailVerified: z.boolean().nullable(),
  phone: z.string().nullable(),
  createdAt: z.string(),
  joinedAt: z.string(),
  lastSeenAt: z.string().nullable(),
  teams: z.array(z.string()),
  isActive: z.boolean(),
  userStatus: z.string(),
  archivedAt: z.string().nullable(),
});

export const usersResponseContract = cursorPageContract(userListItemContract);

const userDetailContract = z.object({
  id: z.string(),
  name: z.string().nullable(),
  email: z.string(),
  emailVerified: z.boolean().nullable(),
  firstName: z.string().nullable(),
  lastName: z.string().nullable(),
  image: z.string().nullable(),
  role: orgRoleEnum,
  isOwner: z.boolean(),
  phone: z.string().nullable(),
  whatsappNumber: z.string().nullable(),
  whatsappSameAsPhone: z.boolean(),
  team: z.string().nullable(),
  emergencyContact: emergencyContactContract.nullable(),
  bio: z.string().nullable(),
  linkedinUrl: z.string().nullable(),
  twitterUrl: z.string().nullable(),
  githubUrl: z.string().nullable(),
  websiteUrl: z.string().nullable(),
  totpEnabled: z.boolean(),
  dateOfBirth: z.string().nullable(),
  gender: z.string().nullable(),
  onboardingDocStatus: z.string().nullable(),
  onboardingCompletedAt: z.string().nullable(),
  invitedAt: z.string().nullable(),
  activatedAt: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
  isProfilePictureRequired: z.boolean(),
  memberRole: z.string(),
  joinedAt: z.string(),
  isActive: z.boolean(),
  userStatus: z.string(),
  archivedAt: z.string().nullable(),
});

export const userDetailResponseContract = userDetailContract;

const sessionItemContract = z.object({
  id: z.string(),
  userId: z.string(),
  userAgent: z.string().nullable(),
  ipAddress: z.string().nullable(),
  isRevoked: z.boolean(),
  lastActive: z.string(),
  deviceId: z.string().nullable(),
  expiresAt: z.string().nullable(),
  createdAt: z.string(),
  browser: z.string(),
  os: z.string().nullable(),
  platform: z.string().nullable(),
});

export const userSessionsContract = z.array(sessionItemContract);

export const userPreferencesContract = z.object({
  userId: z.string(),
  theme: z.string(),
  language: z.string(),
  timezone: z.string(),
  dateFormat: z.string(),
  timeFormat: z.string(),
  numberFormat: z.string().nullable(),
  weekStartDay: z.string().nullable(),
  notificationPreferences: z.record(z.string(), z.boolean()),
  dashboardPreferences: z.record(z.string(), z.unknown()),
  updatedAt: z.string().optional(),
});

/** Mirrors backend `userMembershipResponseSchema` / `UserProfileService.getMembership`. */
export const userMembershipContract = z.object({
  userId: z.string(),
  orgId: z.string(),
  businessUnitId: z.string().nullable(),
  branchId: z.string().nullable(),
  departmentId: z.string().nullable(),
  teamId: z.string().nullable(),
  managerUserId: z.string().nullable(),
});

const loginHistoryItemContract = z.object({
  id: z.string(),
  userId: z.string(),
  orgId: z.string().nullable(),
  event: z.string(),
  ipAddress: z.string().nullable(),
  userAgent: z.string().nullable(),
  country: z.string().nullable(),
  city: z.string().nullable(),
  success: z.boolean(),
  failureReason: z.string().nullable(),
  deviceId: z.string().nullable(),
  createdAt: z.string(),
  browser: z.string(),
  os: z.string().nullable(),
  platform: z.string().nullable(),
});

export const loginHistoryContract = cursorPageContract(loginHistoryItemContract);

const invitationItemContract = z.object({
  id: z.string(),
  email: z.string(),
  role: z.string(),
  expiresAt: z.string(),
  acceptedAt: z.string().nullable(),
  createdAt: z.string(),
  status: z.enum(["PENDING", "ACCEPTED", "DECLINED", "EXPIRED", "REVOKED"]),
  revokedAt: z.string().nullable(),
  declinedAt: z.string().nullable(),
  deliveryFailed: z.boolean(),
});

export const invitationsResponseContract: ResponseContract<InvitationsResponse> =
  cursorPageContract(invitationItemContract);

export const inviteUserContract = z.object({
  success: z.literal(true),
  invitationId: z.string(),
  resent: z.boolean(),
});

export const bulkInviteContract = z.object({
  deliveryMode: z.enum(["background", "enqueue"]),
  results: z.array(z.object({
    email: z.string(),
    originalEmail: z.string(),
    success: z.boolean(),
    invitationId: z.string().optional(),
    isDuplicate: z.boolean().optional(),
    error: z.string().optional(),
  })),
});

export const userSuccessContract = z.object({ success: z.literal(true) });

export const bulkActionResultContract = z.object({
  results: z.array(z.object({
    userId: z.string(),
    success: z.boolean(),
    error: z.string().optional(),
  })),
  succeeded: z.number(),
  failed: z.number(),
});

export const bulkUpdateContract = z.object({
  success: z.literal(true),
  updated: z.number(),
});

export const sendSigninLinkContract = z.object({
  success: z.literal(true),
  email: z.string(),
});

export const updateUserRoleContract = z.object({
  success: z.literal(true),
  userId: z.string(),
  role: z.string(),
});

const auditEntryContract = z.object({
  id: z.string(),
  orgId: z.string(),
  userId: z.string(),
  actorUserId: z.string().nullable(),
  action: z.string(),
  resourceType: z.string().nullable(),
  resourceId: z.string().nullable(),
  metadata: z.record(z.string(), z.unknown()),
  ipAddress: z.string().nullable(),
  createdAt: z.string(),
});

export const userAuditContract = z.object({
  data: z.array(auditEntryContract),
  pagination: z.object({
    limit: z.number(),
    nextCursor: z.string().nullable(),
    hasMore: z.boolean(),
  }),
});

export const importUsersContract = z.object({
  results: z.array(z.object({
    email: z.string(),
    success: z.boolean(),
    invitationId: z.string().optional(),
    error: z.string().optional(),
  })),
  succeeded: z.number(),
  failed: z.number(),
  total: z.number(),
});

/** `GET /users/export` answers a CSV body, so the parsed payload is a bare string. */
export const usersCsvExportContract = z.string();
