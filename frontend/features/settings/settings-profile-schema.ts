import { z } from "zod";

export const DISPLAY_NAME_MAX_LENGTH = 100;

export const settingsDisplayNameSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Display name is required")
    .max(
      DISPLAY_NAME_MAX_LENGTH,
      `Display name must be at most ${DISPLAY_NAME_MAX_LENGTH} characters`,
    ),
});

export type SettingsDisplayNameValues = z.infer<typeof settingsDisplayNameSchema>;
