import { redis, isRedisEnabled } from "./redis";

export const FEATURE_FLAGS = {
  AI_CHAT: "ff:ai_chat",
  PUSH_NOTIFICATIONS: "ff:push",
  CALENDAR_MODULE: "ff:calendar",
  COMPLIANCE_MODULE: "ff:compliance",
  PORTFOLIO_MODULE: "ff:portfolio",
  FUND_ADMIN: "ff:fund_admin",
  WHATSAPP_INTEGRATION: "ff:whatsapp",
  SMS_NOTIFICATIONS: "ff:sms",
} as const;

export type FeatureFlag = keyof typeof FEATURE_FLAGS;

const DEFAULT_FLAGS: Record<FeatureFlag, boolean> = {
  AI_CHAT: true,
  PUSH_NOTIFICATIONS: false,
  CALENDAR_MODULE: false,
  COMPLIANCE_MODULE: false,
  PORTFOLIO_MODULE: false,
  FUND_ADMIN: false,
  WHATSAPP_INTEGRATION: false,
  SMS_NOTIFICATIONS: false,
};

export async function isFeatureEnabled(flag: FeatureFlag): Promise<boolean> {
  if (!isRedisEnabled() || !redis) {
    return DEFAULT_FLAGS[flag];
  }

  try {
    const value = await redis.get(FEATURE_FLAGS[flag]);
    if (value === null) {
      return DEFAULT_FLAGS[flag];
    }
    return value === "true" || value === true;
  } catch {
    return DEFAULT_FLAGS[flag];
  }
}

export async function setFeatureFlag(flag: FeatureFlag, enabled: boolean): Promise<void> {
  if (!isRedisEnabled() || !redis) {
    console.warn("[FeatureFlags] Redis not available, cannot set flag");
    return;
  }

  try {
    await redis.set(FEATURE_FLAGS[flag], enabled ? "true" : "false");
  } catch (error) {
    console.error("[FeatureFlags] Failed to set flag:", error);
  }
}

export async function getAllFeatureFlags(): Promise<Record<FeatureFlag, boolean>> {
  const flags = { ...DEFAULT_FLAGS };

  if (!isRedisEnabled() || !redis) {
    return flags;
  }

  try {
    const keys = Object.keys(FEATURE_FLAGS) as FeatureFlag[];
    for (const key of keys) {
      const value = await redis.get(FEATURE_FLAGS[key]);
      if (value !== null) {
        flags[key] = value === "true" || value === true;
      }
    }
  } catch {
    // Return defaults on error
  }

  return flags;
}
