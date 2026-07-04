import type { ToggleKey, PayFrequency } from "@/types/payroll/setup";

export type SetupDraft = {
  policyId?: number;
  profile?: {
    country: string;
    state?: string;
    legalEntityName?: string;
    currency: string;
    payFrequency: PayFrequency;
    payDay: number;
    startMonth: string;
    employeeCount?: number;
  };
  templateKey?: string;
  templateId?: number;
  toggleOverrides?: Partial<Record<ToggleKey, boolean>>;
};

const DRAFT_KEY = "payroll-setup-draft";
const STEP_KEY = "payroll-setup-step";

export function loadDraft(): SetupDraft {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as SetupDraft;
  } catch {
    return {};
  }
}

export function saveDraft(data: SetupDraft): void {
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
