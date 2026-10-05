import { apiClient } from "@/lib/api-client";
import { orgSetupDraftSaveContract, orgSetupDraftContract } from "@/hooks/api/org-setup-schema";
import { DEFAULT_DATA, DRAFT_KEY } from "./constants";
import { parseWizardDraft, type WizardData } from "./wizard-data-schema";

const STEP_KEY = "org-setup-step";
const COMPLETION_BASE = "org-setup-complete";

export type SyncStatus = "synced" | "saving" | "unsynced" | "error";

function draftKey(scopeId: string): string {
  return `${DRAFT_KEY}--${scopeId}`;
}

function stepKey(scopeId: string): string {
  return `${STEP_KEY}--${scopeId}`;
}

function completionKey(userId: string, orgId: string): string {
  return `${COMPLETION_BASE}--${userId}--${orgId}`;
}

export function setCompletionMarker(userId: string, orgId: string): void {
  try {
    sessionStorage.setItem(completionKey(userId, orgId), "1");
  } catch {}
}

export function hasCompletionMarker(userId: string, orgId: string): boolean {
  try {
    if (!userId || !orgId) return false;
    return sessionStorage.getItem(completionKey(userId, orgId)) === "1";
  } catch {
    return false;
  }
}

export function clearCompletionMarker(userId: string, orgId: string): void {
  try {
    sessionStorage.removeItem(completionKey(userId, orgId));
    sessionStorage.removeItem(COMPLETION_BASE);
  } catch {}
}

export function loadDraft(scopeId: string): WizardData {
  try {
    const raw = localStorage.getItem(draftKey(scopeId));
    if (!raw) return { ...DEFAULT_DATA };
    return parseWizardDraft(JSON.parse(raw));
  } catch {
    return { ...DEFAULT_DATA };
  }
}

export function saveDraft(data: WizardData, scopeId: string): void {
  try {
    localStorage.setItem(draftKey(scopeId), JSON.stringify(data));
  } catch {}
}

export function hasDraftProgress(data: WizardData): boolean {
  return (
    data.goals.length > 0 ||
    data.displayName.trim() !== "" ||
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

export function loadStep(scopeId: string): number {
  try {
    const raw = localStorage.getItem(stepKey(scopeId));
    const n = raw ? parseInt(raw, 10) : 1;
    return Number.isFinite(n) && n >= 1 ? n : 1;
  } catch {
    return 1;
  }
}

export function saveStep(step: number, scopeId: string): void {
  try {
    localStorage.setItem(stepKey(scopeId), String(step));
  } catch {}
}

export function clearAll(scopeId: string): void {
  try {
    localStorage.removeItem(draftKey(scopeId));
    localStorage.removeItem(stepKey(scopeId));
    localStorage.removeItem(DRAFT_KEY);
    localStorage.removeItem(STEP_KEY);
  } catch {}
}

export function mergeServerDraft(
  local: WizardData,
  localRevision: number,
  server: { revision: number; data: WizardData },
): WizardData {
  if (server.revision >= localRevision) return server.data;
  return local;
}

const DRAFT_EXPIRY_MS = 7 * 24 * 60 * 60 * 1000;

function draftExpiresAt(): string {
  return new Date(Date.now() + DRAFT_EXPIRY_MS).toISOString();
}

export async function syncDraftToServer(
  revision: number,
  data: WizardData,
  onStatusChange: (status: SyncStatus) => void,
): Promise<void> {
  onStatusChange("saving");
  try {
    await apiClient.put(
      "/org/setup/draft",
      { revision, stepData: data, expiresAt: draftExpiresAt() },
      undefined,
      orgSetupDraftSaveContract,
    );
    onStatusChange("synced");
  } catch {
    onStatusChange("error");
  }
}

export async function loadServerDraft(): Promise<{
  revision: number;
  data: WizardData;
} | null> {
  try {
    const result = await apiClient.get(
      "/org/setup/draft",
      undefined,
      undefined,
      orgSetupDraftContract,
    );
    if (!result) return null;
    return {
      revision: result.revision,
      data: parseWizardDraft(result.stepData),
    };
  } catch {
    return null;
  }
}
