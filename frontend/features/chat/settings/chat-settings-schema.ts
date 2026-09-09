import { z } from "zod";

export const CHAT_NOTIFICATION_PREFERENCES = [
  { value: "ALL", label: "Every message" },
  { value: "MENTIONS", label: "Mentions only" },
  { value: "NOTHING", label: "Nothing" },
] as const;

export const chatOrgSettingsFormSchema = z.object({
  defaultNotificationPreference: z.enum(["ALL", "MENTIONS", "NOTHING"]),
  maxAttachmentSizeMb: z
    .number({ message: "Enter a size in megabytes" })
    .int("Use a whole number of megabytes")
    .min(1, "Must allow at least 1 MB")
    .max(1000, "Cannot exceed 1000 MB"),
  maxHuddleParticipants: z
    .number({ message: "Enter a number of participants" })
    .int("Use a whole number of participants")
    .min(2, "A huddle needs at least 2 people")
    .max(500, "Cannot exceed 500 participants"),
});

export type ChatOrgSettingsFormInput = z.infer<typeof chatOrgSettingsFormSchema>;
