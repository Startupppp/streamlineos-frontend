import { orgScopedStorageKey } from "@/lib/org-scoped-storage";

const DRAFT_KEY = "admin-onboarding-wizard";

export type AdminWizardDraft = {
  step?: number;
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  gender?: string;
  dateOfBirth?: string;
  designation?: string;
  departmentId?: string;
  employeeId?: string;
  role?: string;
  joiningDate?: string;
  taxId?: string;
  monthlySalary?: number;
  locationId?: string;
  workerType?: string;
};

function draftKey(userId: string, orgId: string): string {
  return orgScopedStorageKey(DRAFT_KEY, `${userId}--${orgId}`);
}

export function loadAdminWizardDraft(
  userId: string | undefined,
  orgId: string | undefined,
): AdminWizardDraft | null {
  if (!userId || !orgId) return null;
  try {
    const raw = localStorage.getItem(draftKey(userId, orgId));
    return raw ? (JSON.parse(raw) as AdminWizardDraft) : null;
  } catch {
    return null;
  }
}

export function saveAdminWizardDraft(
  draft: AdminWizardDraft,
  userId: string | undefined,
  orgId: string | undefined,
): void {
  if (!userId || !orgId) return;
  try {
    localStorage.setItem(draftKey(userId, orgId), JSON.stringify(draft));
  } catch {
  }
}

export function clearAdminWizardDraft(
  userId: string | undefined,
  orgId: string | undefined,
): void {
  if (!userId || !orgId) return;
  try {
    localStorage.removeItem(draftKey(userId, orgId));
  } catch {
  }
}
