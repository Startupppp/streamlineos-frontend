import { z } from "zod";

export const chatInviteLinkContract = z.object({
  token: z.string(),
  expiresAt: z.string().nullable(),
  maxUses: z.number().nullable(),
  useCount: z.number(),
});

export const chatJoinViaInviteContract = z.object({
  ok: z.literal(true),
  channelId: z.number().int(),
});

export const chatMuteResponseContract = z.object({
  ok: z.literal(true),
  mutedUntil: z.string(),
});

export const chatNotifPrefResponseContract = z.object({
  ok: z.literal(true),
  notificationPreference: z.enum(["DEFAULT", "ALL", "MENTIONS", "NOTHING"]),
});
