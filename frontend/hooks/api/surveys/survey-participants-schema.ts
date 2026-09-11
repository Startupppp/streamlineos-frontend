import { z } from "zod";

export const surveyParticipantRowContract = z.object({
  id: z.number(),
  orgId: z.string(),
  surveyId: z.number(),
  collectorId: z.number().nullable(),
  userId: z.string().nullable(),
  userMembershipId: z.number().nullable(),
  contactId: z.number().nullable(),
  leadId: z.number().nullable(),
  clientId: z.number().nullable(),
  name: z.string().nullable(),
  email: z.string().nullable(),
  phone: z.string().nullable(),
  status: z.enum(["invited", "delivered", "opened", "started", "partial", "completed", "disqualified", "bounced", "unsubscribed", "expired"]),
  accessTokenHash: z.string().nullable(),
  metadata: z.record(z.string(), z.unknown()),
  invitedAt: z.string().nullable(),
  openedAt: z.string().nullable(),
  startedAt: z.string().nullable(),
  completedAt: z.string().nullable(),
  createdAt: z.string(),
});

export const surveyParticipantListContract = z.object({
  items: z.array(surveyParticipantRowContract),
  total: z.number(),
  page: z.number(),
  pageSize: z.number(),
  totalPages: z.number(),
});

export const surveyImportResultContract = z.array(
  z.object({ id: z.number(), accessToken: z.string().nullable() }),
);

export const surveyInviteResultContract = z.object({
  success: z.literal(true),
  count: z.number(),
});

export const surveyRemindResultContract = z.object({
  success: z.literal(true),
  remindable: z.number(),
});
