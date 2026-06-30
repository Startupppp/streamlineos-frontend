import type { WizardData } from "./types";
import { DEFAULT_DATA, DRAFT_KEY } from "./constants";

const STEP_KEY = "org-setup-step";

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
      country: typeof p.country === "string" ? p.country : undefined,
      timezone: typeof p.timezone === "string" ? p.timezone : undefined,
      installedApps: Array.isArray(p.installedApps)
        ? p.installedApps.filter((m): m is string => typeof m === "string")
        : DEFAULT_DATA.installedApps,
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

export function loadStep(): number {
  try {
    const raw = localStorage.getItem(STEP_KEY);
    const n = raw ? parseInt(raw, 10) : 1;
    return Number.isFinite(n) && n >= 1 ? n : 1;
  } catch {
    return 1;
  }
}

export function saveStep(step: number): void {
  try {
    localStorage.setItem(STEP_KEY, String(step));
  } catch {}
}

export function clearAll(): void {
  try {
    localStorage.removeItem(DRAFT_KEY);
    localStorage.removeItem(STEP_KEY);
  } catch {}
}
