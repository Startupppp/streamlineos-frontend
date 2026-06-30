import type { WizardData } from "./types";
import { DEFAULT_DATA, DRAFT_KEY } from "./constants";

function isInvitee(v: unknown): v is { email: string; role: string } {
  if (typeof v !== "object" || v === null) return false;
  const obj = v as Record<string, unknown>;
  return typeof obj.email === "string" && typeof obj.role === "string";
}

export function loadDraft(): WizardData {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    if (!raw) return { ...DEFAULT_DATA };
    const p = JSON.parse(raw) as Record<string, unknown>;
    return {
      goals: Array.isArray(p.goals)
        ? p.goals.filter((g): g is string => typeof g === "string")
        : DEFAULT_DATA.goals,
      industry: typeof p.industry === "string" ? p.industry : DEFAULT_DATA.industry,
      companyName: typeof p.companyName === "string" ? p.companyName : DEFAULT_DATA.companyName,
      teamSize: typeof p.teamSize === "string" ? p.teamSize : DEFAULT_DATA.teamSize,
      country: typeof p.country === "string" ? p.country : DEFAULT_DATA.country,
      timezone: typeof p.timezone === "string" ? p.timezone : DEFAULT_DATA.timezone,
      currency: typeof p.currency === "string" ? p.currency : DEFAULT_DATA.currency,
      installedApps: Array.isArray(p.installedApps)
        ? p.installedApps.filter((m): m is string => typeof m === "string")
        : DEFAULT_DATA.installedApps,
      invitees: Array.isArray(p.invitees)
        ? p.invitees.filter(isInvitee)
        : DEFAULT_DATA.invitees,
    };
  } catch {
    return { ...DEFAULT_DATA };
  }
}

export function saveDraft(data: WizardData): void {
  try {
    localStorage.setItem(DRAFT_KEY, JSON.stringify(data));
  } catch {}
}

export function clearDraft(): void {
  try {
    localStorage.removeItem(DRAFT_KEY);
  } catch {}
}
