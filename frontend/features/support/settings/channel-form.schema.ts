import { z } from "zod";

export const channelSchema = z.object({
  type: z.enum(["email", "chat", "whatsapp", "sms"]),
  name: z.string().min(1, "Name required").max(100),
  ownerUserId: z.string(),
  configJson: z.string(),
  isActive: z.boolean(),
});

export type ChannelForm = z.infer<typeof channelSchema>;
