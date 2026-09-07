import { z } from "zod";

export const kbSpaceListItemContract = z.object({
  id: z.number().int(),
  name: z.string(),
  slug: z.string(),
  description: z.string().nullable(),
  audience: z.enum(["internal", "public", "mixed"]),
  icon: z.string().nullable(),
  isPublicHelpCenter: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string(),
  articleCount: z.number().int(),
});

export const kbSpaceListContract = z.array(kbSpaceListItemContract);

export const kbSpaceFullContract = z.object({
  id: z.number().int(),
  orgId: z.string(),
  name: z.string(),
  slug: z.string(),
  description: z.string().nullable(),
  audience: z.enum(["internal", "public", "mixed"]),
  icon: z.string().nullable(),
  branding: z.record(z.string(), z.unknown()).nullable(),
  isPublicHelpCenter: z.boolean(),
  createdByMembershipId: z.number().int().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
  deletedAt: z.string().nullable(),
  type: z.string(),
  color: z.string().nullable(),
  defaultVisibility: z.string(),
  owningTeamId: z.string().nullable(),
  archivedAt: z.string().nullable(),
});

export const kbSpaceSuccessContract = z.object({ success: z.boolean() });

export const kbSpaceMemberContract = z.object({
  id: z.number().int(),
  orgId: z.string(),
  spaceId: z.number().int(),
  membershipId: z.number().int().nullable(),
  role: z.string().nullable(),
  team: z.string().nullable(),
  spaceRole: z.string(),
  createdAt: z.string(),
  userId: z.string().nullable(),
  userName: z.string().nullable(),
  userEmail: z.string().nullable(),
  userImage: z.string().nullable(),
});

export const kbSpaceMemberListContract = z.array(kbSpaceMemberContract);

export const kbSettingsContract = z.object({
  id: z.number().int(),
  orgId: z.string(),
  defaultVisibility: z.string(),
  aiEnabled: z.boolean(),
  publicPortalEnabled: z.boolean(),
  customDomain: z.string().nullable(),
  branding: z.record(z.string(), z.unknown()).nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const kbTagContract = z.object({
  id: z.number().int(),
  orgId: z.string(),
  name: z.string(),
  slug: z.string(),
  createdAt: z.string(),
});

export const kbTagListContract = z.array(kbTagContract);
