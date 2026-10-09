import { z } from "zod";

export const COMPANION_PRESETS = ["default", "dusk", "meadow", "ember", "mono"] as const;
export const COMPANION_PROMPT_CATEGORIES = ["meeting", "clockIn", "break", "friendly"] as const;
export const COMPANION_SNOOZE_MINUTES = [5, 10, 15, 30, 60] as const;

const promptSwitchesContract = z.object({
  meeting: z.boolean(),
  clockIn: z.boolean(),
  break: z.boolean(),
  friendly: z.boolean(),
});

const companionPreferenceContract = z.object({
  visible: z.boolean(),
  name: z.string().nullable(),
  preset: z.string(),
  tone: z.enum(["neutral", "warm", "brief"]),
  animation: z.enum(["subtle", "off"]),
  anchor: z.enum(["bottom-right", "bottom-left"]),
  prompts: promptSwitchesContract,
  activityConsent: z.boolean(),
  pausedUntil: z.string().nullable(),
  version: z.number(),
  updatedAt: z.string(),
});

export const companionPolicyContract = z.object({
  petEnabled: z.boolean(),
  allowedPresets: z.array(z.string()),
  prompts: promptSwitchesContract,
  version: z.number(),
});

export const companionPreferencesContract = z.object({
  preferences: companionPreferenceContract,
  locks: z.record(z.string(), z.string()),
  policy: companionPolicyContract,
});

const companionPromptContract = z.object({
  id: z.string(),
  category: z.enum(COMPANION_PROMPT_CATEGORIES),
  title: z.string(),
  body: z.string(),
  reasonCode: z.string(),
  reason: z.string(),
  sourceRef: z.object({ type: z.string(), id: z.string() }).nullable(),
  href: z.string().nullable(),
  status: z.enum(["eligible", "claimed", "dismissed", "snoozed", "expired", "suppressed"]),
  eligibleAt: z.string(),
  expiresAt: z.string(),
  snoozedUntil: z.string().nullable(),
});

export const companionNextPromptContract = z.object({ prompt: companionPromptContract.nullable() });

export const companionPromptResultContract = z.object({ prompt: companionPromptContract });

export const companionPromptHistoryContract = z.object({
  items: z.array(companionPromptContract),
  nextCursor: z.string().nullable(),
});

export type CompanionPreferences = z.infer<typeof companionPreferencesContract>;
export type CompanionPreference = z.infer<typeof companionPreferenceContract>;
export type CompanionPolicy = z.infer<typeof companionPolicyContract>;
export type CompanionPrompt = z.infer<typeof companionPromptContract>;
export type CompanionPromptCategory = (typeof COMPANION_PROMPT_CATEGORIES)[number];
export type CompanionSnoozeMinutes = (typeof COMPANION_SNOOZE_MINUTES)[number];
