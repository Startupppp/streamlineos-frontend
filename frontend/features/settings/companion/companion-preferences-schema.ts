import { z } from "zod";
import { COMPANION_PRESETS, type CompanionPolicy, type CompanionPreference } from "@/hooks/api/companion-schema";

export const companionPreferencesFormSchema = z.object({
  visible: z.boolean(),
  name: z.string().trim().max(40, "Use 40 characters or fewer"),
  preset: z.enum(COMPANION_PRESETS),
  tone: z.enum(["neutral", "warm", "brief"]),
  animation: z.enum(["subtle", "off"]),
  anchor: z.enum(["bottom-right", "bottom-left"]),
  meeting: z.boolean(),
  clockIn: z.boolean(),
  break: z.boolean(),
  friendly: z.boolean(),
  activityConsent: z.boolean(),
  pause: z.enum(["none", "keep", "1h", "today", "resume"]),
});

export const PAUSED_UNTIL_RESUME = "2999-12-31T23:59:59.000Z";

export function isPausedUntilResume(pausedUntil: string | null): boolean {
  return pausedUntil !== null && new Date(pausedUntil).getTime() >= new Date(PAUSED_UNTIL_RESUME).getTime();
}

export type CompanionPreferencesFormValues = z.infer<typeof companionPreferencesFormSchema>;

function isPreset(value: string): value is CompanionPreferencesFormValues["preset"] {
  return COMPANION_PRESETS.some((preset) => preset === value);
}

export function toCompanionFormValues(
  preferences: CompanionPreference,
  now: number,
): CompanionPreferencesFormValues {
  const paused = preferences.pausedUntil !== null && new Date(preferences.pausedUntil).getTime() > now;
  return {
    visible: preferences.visible,
    name: preferences.name ?? "",
    preset: isPreset(preferences.preset) ? preferences.preset : "default",
    tone: preferences.tone,
    animation: preferences.animation,
    anchor: preferences.anchor,
    ...preferences.prompts,
    activityConsent: preferences.activityConsent,
    pause: paused ? "keep" : "none",
  };
}

function pausedUntil(
  pause: CompanionPreferencesFormValues["pause"],
  current: string | null,
  now: Date,
): string | null {
  if (pause === "keep") return current;
  if (pause === "resume") return PAUSED_UNTIL_RESUME;
  if (pause === "1h") return new Date(now.getTime() + 60 * 60_000).toISOString();
  if (pause === "today") {
    const end = new Date(now);
    end.setHours(23, 59, 59, 0);
    return end.toISOString();
  }
  return null;
}

export function toCompanionPatch(
  values: CompanionPreferencesFormValues,
  preferences: CompanionPreference,
  now: Date,
) {
  return {
    version: preferences.version,
    visible: values.visible,
    name: values.name.trim() === "" ? null : values.name.trim(),
    preset: values.preset,
    tone: values.tone,
    animation: values.animation,
    anchor: values.anchor,
    prompts: {
      meeting: values.meeting,
      clockIn: values.clockIn,
      break: values.break,
      friendly: values.friendly,
    },
    activityConsent: values.activityConsent,
    pausedUntil: pausedUntil(values.pause, preferences.pausedUntil, now),
  };
}

export const companionPolicyFormSchema = z.object({
  petEnabled: z.boolean(),
  allowedPresets: z.array(z.enum(COMPANION_PRESETS)).min(1, "Allow at least one appearance"),
  meeting: z.boolean(),
  clockIn: z.boolean(),
  break: z.boolean(),
  friendly: z.boolean(),
});

export type CompanionPolicyFormValues = z.infer<typeof companionPolicyFormSchema>;

export function toCompanionPolicyFormValues(policy: CompanionPolicy): CompanionPolicyFormValues {
  return {
    petEnabled: policy.petEnabled,
    allowedPresets: policy.allowedPresets.filter(isPreset),
    ...policy.prompts,
  };
}
