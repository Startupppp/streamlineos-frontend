import { z } from "zod";

const wholeNumberIn = (min: number, max: number) =>
  z
    .string()
    .trim()
    .regex(/^\d+$/, "Enter a whole number")
    .refine((v) => Number(v) >= min && Number(v) <= max, `Enter a number from ${min} to ${max}`);

/** Mirrors the backend's `updateChatOrgSettingsSchema` bounds. */
export const chatOrgSettingsFormSchema = z.object({
  defaultNotificationPreference: z.enum(["ALL", "MENTIONS", "NOTHING"]),
  maxAttachmentSizeMb: wholeNumberIn(1, 1000),
  maxHuddleParticipants: wholeNumberIn(2, 500),
});

export type ChatOrgSettingsFormValues = z.infer<typeof chatOrgSettingsFormSchema>;
