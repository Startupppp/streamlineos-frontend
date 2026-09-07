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
