import { z } from "zod";

/** `chatInviteLinkTokenSchema` */
export const chatInviteLinkContract = z.object({ token: z.string() });

/** `chatInviteLinkJoinSchema` */
export const chatJoinViaInviteContract = z.object({
  ok: z.literal(true),
  channelId: z.number().int(),
});

/** `channelMuteResponseSchema` */
export const chatMuteResponseContract = z.object({
  ok: z.literal(true),
  mutedUntil: z.string(),
});

/** `channelNotifPrefResponseSchema` */
export const chatNotifPrefResponseContract = z.object({
  ok: z.literal(true),
  notificationPreference: z.enum(["DEFAULT", "ALL", "MENTIONS", "NOTHING"]),
});

/** `chatOrgSettingsResponseSchema` — strict there, so strict here. */
export const chatOrgSettingsContract = z
  .object({
    orgId: z.string().min(1),
    defaultNotificationPreference: z.enum(["ALL", "MENTIONS", "NOTHING"]),
    maxAttachmentSizeMb: z.number().int().min(1).max(1_000),
    maxHuddleParticipants: z.number().int().min(2).max(500),
  })
  .strict();

export type ChatOrgSettingsWire = z.infer<typeof chatOrgSettingsContract>;
