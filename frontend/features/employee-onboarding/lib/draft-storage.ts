"use client";

import { orgScopedStorageKey } from "@/lib/org-scoped-storage";
import { parseWizardDraft, type WizardDraft } from "./wizard-draft-schema";

const DRAFT_KEY_NAME = "employee-onboarding-draft";

function storageKey(userId: string, orgId: string): string {
  return orgScopedStorageKey(DRAFT_KEY_NAME, `${userId}--${orgId}`);
}

export function loadOnboardingDraft(
  userId: string | undefined,
  orgId: string | undefined,
): WizardDraft | null {
  if (!userId || !orgId) return null;
  try {
    const raw = localStorage.getItem(storageKey(userId, orgId));
    if (!raw) return null;
    return parseWizardDraft(JSON.parse(raw));
  } catch {
    return null;
  }
}

export function saveOnboardingDraft(
  draft: WizardDraft,
  userId: string | undefined,
  orgId: string | undefined,
): void {
  if (!userId || !orgId) return;
  try {
    localStorage.setItem(storageKey(userId, orgId), JSON.stringify(draft));
  } catch {}
}

export function clearOnboardingDraft(
  userId: string | undefined,
  orgId: string | undefined,
): void {
  if (!userId || !orgId) return;
  try {
    localStorage.removeItem(storageKey(userId, orgId));
  } catch {}
}
