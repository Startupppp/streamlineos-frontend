import { z } from "zod";
import { isValidPhoneNumber } from "react-phone-number-input";
import { USER_INVITE_ROLE_VALUES } from "@/lib/constants/user-invite-roles";
import { normalizeNamePart } from "@/lib/person-display";

function hasLetterOrDigit(value: string): boolean {
  return /[\p{L}\p{N}]/u.test(value);
}

/** Display-only copy of a chosen manager, so a step can name them after remounting. Never sent. */
const managerRefDisplaySchema = z
  .object({
    userId: z.string(),
    name: z.string(),
    email: z.string().nullable(),
    designation: z.string().nullable(),
    state: z.enum(["active", "on-notice", "inactive", "exited"]),
  })
  .nullable()
  .optional();

export const secondaryManagerEntrySchema = z.object({
  managerUserId: z.string().min(1, "Choose a manager or remove this row"),
  label: z.string().trim().max(60, "Keep the label under 60 characters").optional(),
  managerRef: managerRefDisplaySchema,
});

/**
 * HRM-15 (PRD D2/D3). The primary manager is optional — the backend resolves a
 * blank one by policy. A top-level role is the only way to have none, needs a
 * reason, and cannot carry any manager. Secondaries may not repeat the primary or
 * each other; the org cap is enforced where rows are added and by the server.
 */
/**
 * The server refuses an additional manager who is also the policy's default
 * (SECONDARY_DUPLICATES_PRIMARY on ONBOARDING_FALLBACK) when a blank primary
 * would resolve to them. One wording for the wizard and the bulk upload.
 */
export function defaultPrimaryConflictMessage(name: string): string {
  return `${name} is your organisation's default reporting manager and will be assigned as primary. Pick the primary explicitly or choose a different additional manager.`;
}

function validateReportingChoice(
  value: {
    reportingManagerUserId?: string;
    topLevelRole?: boolean;
    topLevelRoleReason?: string;
    secondaryManagers?: Array<{ managerUserId: string }>;
    policyDefaultPrimary?: { userId: string; name: string } | null;
  },
  ctx: z.RefinementCtx,
): void {
  const secondaries = value.secondaryManagers ?? [];
  if (value.topLevelRole) {
    if (value.reportingManagerUserId || secondaries.length > 0)
      ctx.addIssue({ code: "custom", message: "A top-level role cannot also have a reporting manager.", path: ["topLevelRole"] });
    if (!value.topLevelRoleReason?.trim())
      ctx.addIssue({ code: "custom", message: "Explain why this role has no reporting manager.", path: ["topLevelRoleReason"] });
    return;
  }
  const seen = new Set<string>(value.reportingManagerUserId ? [value.reportingManagerUserId] : []);
  const assignedDefault = value.reportingManagerUserId ? null : (value.policyDefaultPrimary ?? null);
  secondaries.forEach((entry, index) => {
    if (!entry.managerUserId) return;
    if (entry.managerUserId === assignedDefault?.userId)
      ctx.addIssue({
        code: "custom",
        message: defaultPrimaryConflictMessage(assignedDefault.name),
        path: ["secondaryManagers", index, "managerUserId"],
      });
    else if (seen.has(entry.managerUserId))
      ctx.addIssue({
        code: "custom",
        message:
          entry.managerUserId === value.reportingManagerUserId
            ? "Already the primary reporting manager."
            : "Already added as an additional manager.",
        path: ["secondaryManagers", index, "managerUserId"],
      });
    seen.add(entry.managerUserId);
  });
}

/**
 * V-135. The Skills & Pay step labels the salary with a required asterisk, so
 * it is genuinely required. The backend onboarding DTO takes `monthlySalary`
 * as optional, so always sending it is accepted; the admin wizard is the only
 * consumer of this schema (the CSV bulk path builds its own row object and
 * keeps salary optional there).
 */
function requireMonthlySalary(
  value: { monthlySalary?: number },
  ctx: z.RefinementCtx,
): void {
  if (value.monthlySalary == null)
    ctx.addIssue({ code: "custom", message: "Monthly salary is required", path: ["monthlySalary"] });
}

export const onboardEmployeeInputSchema = z.object({
  // Ticket 07: whitespace is normalised on the way in, so the review step and
  // the payload show what will be stored. Letters, case and punctuation are
  // never touched — "QA", "van der Berg" and "O'Brien" are legal names.
  firstName: z
    .string()
    .trim()
    .min(1, "First name is required")
    .max(80, "First name must be at most 80 characters")
    .refine(hasLetterOrDigit, "First name must contain a letter or number")
    .transform(normalizeNamePart),
  lastName: z
    .string()
    .trim()
    .min(1, "Last name is required")
    .max(80, "Last name must be at most 80 characters")
    .refine(hasLetterOrDigit, "Last name must contain a letter or number")
    .transform(normalizeNamePart),
  email: z
    .string()
    .trim()
    .email("Invalid email address")
    .max(254, "Email must be at most 254 characters"),
  gender: z.enum(["MALE", "FEMALE", "OTHER"]),
  phone: z
    .string()
    .min(1, "Phone number is required")
    .refine((val) => isValidPhoneNumber(val), "Please enter a valid phone number"),
  whatsappSameAsPhone: z.boolean(),
  whatsappNumber: z
    .string()
    .refine((val) => !val || isValidPhoneNumber(val), "Please enter a valid WhatsApp number")
    .optional(),
  designation: z
    .string()
    .trim()
    .min(1, "Designation is required")
    .max(120, "Designation must be at most 120 characters")
    .refine(hasLetterOrDigit, "Designation must contain a letter or number"),
  departmentId: z.string().min(1, "Department is required"),
  reportingManagerUserId: z.string().optional(),
  reportingManagerRef: managerRefDisplaySchema,
  secondaryManagers: z.array(secondaryManagerEntrySchema).max(3, "At most three additional managers").optional(),
  topLevelRole: z.boolean().optional(),
  topLevelRoleReason: z.string().trim().max(500, "Keep the reason under 500 characters").optional(),
  /** Who a blank primary resolves to under the loaded policy; set by the step, never sent. */
  policyDefaultPrimary: z.object({ userId: z.string(), name: z.string() }).nullable().optional(),
  role: z.enum(USER_INVITE_ROLE_VALUES),
  employeeId: z
    .string()
    .trim()
    .max(40, "Employee ID must be at most 40 characters")
    .refine(
      (v) => v === "" || /^[A-Za-z0-9][A-Za-z0-9._/\- ]*$/.test(v),
      "Employee ID can use letters, numbers, spaces, dots, underscores, hyphens, and slashes",
    )
    .optional()
    .or(z.literal("")),
  attachToExistingMember: z.boolean().optional(),
  joiningDate: z.date(),
  dateOfBirth: z
    .date()
    .refine((d) => d < new Date(), "Date of birth cannot be in the future")
    .refine((d) => {
      const ageMs = Date.now() - d.getTime();
      return ageMs >= 16 * 365.25 * 24 * 3600 * 1000;
    }, "Employee must be at least 16 years old"),
  taxId: z
    .string()
    .trim()
    .refine(
      (v) => v === "" || /^[A-Za-z]{5}[0-9]{4}[A-Za-z]$/i.test(v),
      "Invalid PAN format (e.g. ABCDE1234F)",
    )
    .optional()
    .or(z.literal("")),
  // V-135: required, but enforced in `requireMonthlySalary` below rather than
  // as `z.number()` here — a missing field on the object aborts the parse
  // before any object-level refinement runs, which would silently switch off
  // the reports-to rule.
  monthlySalary: z
    .number()
    .min(0, "Salary cannot be negative")
    .max(9_999_999, "Salary exceeds maximum allowed value")
    .optional(),
  salaryStructureTemplateId: z.number().int().positive().optional(),
  bankDetails: z
    .object({
      accountNumber: z
        .string()
        .trim()
        .refine((v) => v === "" || /^\d{6,20}$/.test(v), "Account number must be 6–20 digits")
        .optional()
        .or(z.literal("")),
      bankName: z
        .string()
        .trim()
        .max(100)
        .optional()
        .or(z.literal("")),
      branch: z
        .string()
        .trim()
        .max(100)
        .optional()
        .or(z.literal("")),
      ifsc: z
        .string()
        .trim()
        .refine(
          (v) => v === "" || /^[A-Za-z]{4}0[A-Za-z0-9]{6}$/i.test(v),
          "Invalid IFSC code format (e.g. SBIN0001234)",
        )
        .optional()
        .or(z.literal("")),
      accountHolder: z
        .string()
        .trim()
        .max(120)
        .refine(
          (v) => v === "" || hasLetterOrDigit(v),
          "Account holder name looks invalid",
        )
        .optional()
        .or(z.literal("")),
      pfUanNumber: z
        .string()
        .trim()
        .refine((v) => v === "" || /^\d{12}$/.test(v), "UAN must be exactly 12 digits")
        .optional()
        .or(z.literal("")),
      esiIpNumber: z
        .string()
        .trim()
        .max(20)
        .optional()
        .or(z.literal("")),
    })
    .optional(),
})
  .superRefine((value, ctx) => {
    validateReportingChoice(value, ctx);
    requireMonthlySalary(value, ctx);
  });
