import { z } from "zod";

export const COMPANION_VOICES = ["marin", "cedar", "alloy", "ash", "ballad", "coral", "echo", "sage", "shimmer", "verse"] as const;
export const companionVoiceSettingsSchema = z.object({
  voice: z.enum(COMPANION_VOICES),
});

export type CompanionVoiceSettings = z.infer<typeof companionVoiceSettingsSchema>;
export const DEFAULT_COMPANION_VOICE_SETTINGS: CompanionVoiceSettings = { voice: "marin" };
