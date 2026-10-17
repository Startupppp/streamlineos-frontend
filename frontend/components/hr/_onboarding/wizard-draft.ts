import { isToday } from "date-fns";
import { z } from "zod";
import { orgScopedStorageKey } from "@/lib/org-scoped-storage";

const DRAFT_KEY = "admin-onboarding-wizard";

const adminWizardDraftSchema = z.object({
  step: z.number().int().min(1).max(4).optional(),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  email: z.string().optional(),
  phone: z.string().optional(),
  gender: z.string().optional(),
  dateOfBirth: z.string().optional(),
  designation: z.string().optional(),
  departmentId: z.string().optional(),
  employeeId: z.string().optional(),
  role: z.string().optional(),
  joiningDate: z.string().optional(),
  taxId: z.string().optional(),
  monthlySalary: z.number().optional(),
  locationId: z.string().optional(),
  workerType: z.string().optional(),
});

export type AdminWizardDraft = z.infer<typeof adminWizardDraftSchema>;

interface DraftSource {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  gender?: string;
  dateOfBirth?: Date | string;
  designation?: string;
  departmentId?: string;
  employeeId?: unknown;
  role?: string;
  joiningDate?: Date | string;
  taxId?: unknown;
  monthlySalary?: number;
  locationId?: string;
  workerType?: string;
}

function isoOrUndefined(value: Date | string | undefined): string | undefined {
  if (value instanceof Date) return value.toISOString();
  return typeof value === "string" ? value : undefined;
}

function joiningDateOrUndefined(value: Date | string | undefined): string | undefined {
  if (value instanceof Date && isToday(value)) return undefined;
  return isoOrUndefined(value);
}

function textOrUndefined(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}

export function toAdminWizardDraft(values: DraftSource, step: number): AdminWizardDraft {
  return {
    step,
    firstName: values.firstName,
    lastName: values.lastName,
    email: values.email,
    phone: values.phone,
    gender: values.gender,
    dateOfBirth: isoOrUndefined(values.dateOfBirth),
    designation: values.designation,
    departmentId: values.departmentId,
    employeeId: textOrUndefined(values.employeeId),
    role: values.role,
    joiningDate: joiningDateOrUndefined(values.joiningDate),
    taxId: textOrUndefined(values.taxId),
    monthlySalary: values.monthlySalary,
    locationId: values.locationId,
    workerType: values.workerType,
  };
}

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
    if (!raw) return null;
    const parsed = adminWizardDraftSchema.safeParse(JSON.parse(raw));
    return parsed.success ? parsed.data : null;
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
