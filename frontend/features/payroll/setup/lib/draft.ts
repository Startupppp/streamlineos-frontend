import { parseSetupDraft, type SetupDraft } from "./setup-draft-schema";

export type { SetupDraft };

const DRAFT_KEY = "payroll-setup-draft";
const STEP_KEY = "payroll-setup-step";

function draftKey(orgId: string): string {
  return `${DRAFT_KEY}:${orgId}`;
}

function stepKey(orgId: string): string {
  return `${STEP_KEY}:${orgId}`;
}

function purgeLegacyKeys(): void {
  try {
    localStorage.removeItem(DRAFT_KEY);
    localStorage.removeItem(STEP_KEY);
  } catch {}
}

export function loadDraft(orgId: string): SetupDraft {
  try {
    purgeLegacyKeys();
    const raw = localStorage.getItem(draftKey(orgId));
    if (!raw) return {};
    const parsed: unknown = JSON.parse(raw);
    return parseSetupDraft(parsed);
  } catch {
    return {};
  }
}

export function saveDraft(orgId: string, data: SetupDraft): void {
  try {
    localStorage.setItem(draftKey(orgId), JSON.stringify(data));
  } catch {}
}

export function loadStep(orgId: string): number {
  try {
    const raw = localStorage.getItem(stepKey(orgId));
    const n = raw ? parseInt(raw, 10) : 1;
    return Number.isFinite(n) && n >= 1 ? n : 1;
  } catch {
    return 1;
  }
}

export function saveStep(orgId: string, step: number): void {
  try {
    localStorage.setItem(stepKey(orgId), String(step));
  } catch {}
}

export function clearAll(orgId: string): void {
  try {
    localStorage.removeItem(draftKey(orgId));
    localStorage.removeItem(stepKey(orgId));
  } catch {}
}
