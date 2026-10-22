import { z } from "zod";

export const sharingSettingsFormSchema = z.object({
  externalSharing: z.enum(["disabled", "guests", "guests_and_links"]),
  guestGrantMaxDays: z.number().int().min(1).max(365),
  shareLinkMaxDays: z.number().int().min(1).max(365),
  guestAllowDownloadDefault: z.boolean(),
  shareLinkAllowDownloadDefault: z.boolean(),
});

export type SharingSettingsFormValues = z.infer<typeof sharingSettingsFormSchema>;
