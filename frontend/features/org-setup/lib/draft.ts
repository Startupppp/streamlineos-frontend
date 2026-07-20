import type { Invitee, WizardData } from "./types";
import { DEFAULT_DATA, DRAFT_KEY } from "./constants";

const STEP_KEY = "org-setup-step";

function isInvitee(v: unknown): v is Invitee {
  return (
    typeof v === "object" &&
    v !== null &&
    typeof (v as Invitee).email === "string" &&
    typeof (v as Invitee).role === "string"
  );
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
      country: typeof p.country === "string" ? p.country : undefined,
      timezone: typeof p.timezone === "string" ? p.timezone : undefined,
      phone: typeof p.phone === "string" ? p.phone : DEFAULT_DATA.phone,
      currency: typeof p.currency === "string" ? p.currency : undefined,
      fiscalYearStart: typeof p.fiscalYearStart === "string" ? p.fiscalYearStart : undefined,
      businessAddress: typeof p.businessAddress === "string" ? p.businessAddress : undefined,
      taxId: typeof p.taxId === "string" ? p.taxId : undefined,
      installedApps: Array.isArray(p.installedApps)
        ? p.installedApps.filter((m): m is string => typeof m === "string")
        : DEFAULT_DATA.installedApps,
      modules: Array.isArray(p.modules)
        ? p.modules.filter((m): m is string => typeof m === "string")
        : DEFAULT_DATA.modules,
      startingData:
        p.startingData === "clean" || p.startingData === "sample" || p.startingData === "import"
          ? p.startingData
          : DEFAULT_DATA.startingData,
      paymentsChoice:
        p.paymentsChoice === "razorpay" ||
        p.paymentsChoice === "stripe" ||
        p.paymentsChoice === "manual" ||
        p.paymentsChoice === "skip"
          ? p.paymentsChoice
          : undefined,
      invitees: Array.isArray(p.invitees) ? p.invitees.filter(isInvitee) : DEFAULT_DATA.invitees,
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
