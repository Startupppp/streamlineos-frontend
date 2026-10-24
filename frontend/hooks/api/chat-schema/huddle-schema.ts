import { z } from "zod";

import { chatPreviewUserContract } from "./user-schema";

const chatHuddleParticipantContract = z
  .object({
    id: z.number(),
    huddleId: z.number(),
    joinedAt: z.string(),
    leftAt: z.string().nullable(),
    userId: z.string().nullable(),
    user: chatPreviewUserContract.nullable(),
  })
  .strict();

export const chatHuddleContract = z
  .object({
    id: z.number(),
    channelId: z.number(),
    status: z.enum(["active", "ended"]),
    calendarEventId: z.number().nullable(),
    meetingProvider: z.enum(["google_meet", "microsoft_teams"]).nullable(),
    meetingUrl: z.string().url().nullable(),
    startedAt: z.string(),
    endedAt: z.string().nullable(),
    startedBy: z.string().nullable(),
    startedByUser: z
      .object({ id: z.string(), name: z.string().nullable() })
      .strict()
      .nullable(),
    participants: z.array(chatHuddleParticipantContract),
  })
  .strict();

export const chatActiveHuddleContract = chatHuddleContract.nullable();

export const leaveHuddleResponseContract = z
  .object({
    ok: z.literal(true),
    providerSyncStatus: z.enum(["pending", "skipped"]).optional(),
  })
  .strict();

export const huddleAccountContract = z
  .object({
    connectionId: z.number().int(),
    provider: z.enum(["google_meet", "microsoft_teams"]),
    label: z.string(),
    status: z.enum(["active", "needs_reauth"]),
    scope: z.enum(["user", "org"]),
    isDefault: z.boolean(),
  })
  .strict();

export type HuddleAccount = z.infer<typeof huddleAccountContract>;

export const huddleAccountsListContract = z
  .object({
    accounts: z.array(huddleAccountContract),
    defaultConnectionId: z.number().int().nullable(),
  })
  .strict();

export type HuddleAccountsList = z.infer<typeof huddleAccountsListContract>;

export const huddleAlternativeContract = z
  .object({
    connectionId: z.number().int(),
    provider: z.enum(["google_meet", "microsoft_teams"]),
    label: z.string(),
  })
  .strict();

export type HuddleAlternative = z.infer<typeof huddleAlternativeContract>;
