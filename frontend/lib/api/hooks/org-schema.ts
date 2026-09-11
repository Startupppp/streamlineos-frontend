import { z } from "zod";

export const orgSetupSessionContract = z.object({
  id: z.number().int(),
  type: z.string(),
  status: z.enum(["not_started", "in_progress", "completed", "skipped", "abandoned"]),
  currentStep: z.string().nullable(),
  completedSteps: z.array(z.string()),
  skippedSteps: z.array(z.string()),
  data: z.record(z.string(), z.unknown()),
  orgId: z.string().optional(),
  userId: z.string().optional(),
  membershipId: z.number().int().nullable().optional(),
  source: z.string().nullable().optional(),
  startedAt: z.string().nullable().optional(),
  completedAt: z.string().nullable().optional(),
  lastSeenAt: z.string().optional(),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
});

const ORG_SETUP_INVITEE_ROLES = ["OWNER", "ORG_ADMIN", "MEMBER"] as const;

export const MAX_ORG_SETUP_INVITEES = 50;

export const orgSetupInviteeRoleSchema = z.enum(ORG_SETUP_INVITEE_ROLES);

const orgSetupInviteeSchema = z
  .object({
    email: z.string(),
    role: orgSetupInviteeRoleSchema,
  })
  .strict();

export type OrgSetupInvitee = z.infer<typeof orgSetupInviteeSchema>;

export const orgSetupStatusContract = z.object({
  orgId: z.string().nullable(),
  onboardingCompletedAt: z.string().nullable(),
  provisioning: z.enum([
    "not-started",
    "pending",
    "in-progress",
    "completed",
    "failed",
  ]),
  lastError: z.string().nullable(),
});

export type OrgSetupStatus = z.infer<typeof orgSetupStatusContract>;

export const orgSetupCompleteContract = z.union([
  z.object({ success: z.literal(true), orgId: z.string(), autoLoginToken: z.string() }),
  z.object({ success: z.literal(true), orgId: z.string() }),
]);

export const orgSetupSkipContract = z.union([
  z.object({ success: z.literal(true), orgId: z.string(), autoLoginToken: z.string() }),
  z.object({ success: z.literal(true), orgId: z.string() }),
]);
