import { DEFAULT_DATA, DRAFT_KEY } from "./constants";
import { parseWizardDraft, type WizardData } from "./wizard-data-schema";

const STEP_KEY = "org-setup-step";

export function loadDraft(): WizardData {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    if (!raw) return { ...DEFAULT_DATA };
    return parseWizardDraft(JSON.parse(raw));
  } catch {
    return { ...DEFAULT_DATA };
  }
}

export function saveDraft(data: WizardData): void {
  try {
    localStorage.setItem(DRAFT_KEY, JSON.stringify(data));
  } catch {}
}

export function hasDraftProgress(data: WizardData): boolean {
  return (
    data.goals.length > 0 ||
    data.companyName.trim() !== "" ||
    data.industry.trim() !== "" ||
    data.teamSize.trim() !== "" ||
    data.phone.trim() !== "" ||
    data.invitees.length > 0 ||
    (typeof data.country === "string" && data.country.trim() !== "") ||
    (typeof data.businessAddress === "string" &&
      data.businessAddress.trim() !== "")
  );
}

export function clampStep(step: number, totalSteps: number): number {
  if (!Number.isFinite(step) || totalSteps < 1) return 1;
  return Math.min(Math.max(Math.trunc(step), 1), totalSteps);
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
