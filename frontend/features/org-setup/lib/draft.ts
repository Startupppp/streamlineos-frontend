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

export function setCompletionMarker(
  userId: string,
  orgId: string,
  destination = "/dashboard",
): void {
  try {
    const value =
      typeof destination === "string" &&
      destination.startsWith("/") &&
      !destination.startsWith("//")
        ? destination
        : "/dashboard";
    sessionStorage.setItem(completionKey(userId, orgId), value);
  } catch {}
}

export function hasCompletionMarker(userId: string, orgId: string): boolean {
  try {
    if (!userId || !orgId) return false;
    const value = sessionStorage.getItem(completionKey(userId, orgId));
    return value !== null && value.length > 0;
  } catch {
    return false;
  }
}

/** Destination stored with the completion marker; legacy `"1"` maps to `/dashboard`. */
export function getCompletionDestination(userId: string, orgId: string): string {
  try {
    if (!userId || !orgId) return "/dashboard";
    const value = sessionStorage.getItem(completionKey(userId, orgId));
    if (!value || value === "1") return "/dashboard";
    if (value.startsWith("/") && !value.startsWith("//")) return value;
    return "/dashboard";
  } catch {
    return "/dashboard";
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

export function clearAll(scopeId: string): void {
  try {
    localStorage.removeItem(draftKey(scopeId));
    localStorage.removeItem(stepKey(scopeId));
    localStorage.removeItem(DRAFT_KEY);
    localStorage.removeItem(STEP_KEY);
  } catch {}
}
