import { z } from "zod";

export const inviteDeliveryContract = z.object({
  sent: z.boolean(),
  reason: z.string().nullable(),
});

export type InviteDelivery = z.infer<typeof inviteDeliveryContract>;

/**
 * A join link an administrator can pass on when email cannot be relied on.
 * The token lives in `inviteUrl` and nowhere else.
 */
export const inviteLinkContract = z.object({
  inviteUrl: z.string().url(),
  expiresAt: z.string(),
  email: z.string().email(),
});

export type InviteLink = z.infer<typeof inviteLinkContract>;

const managerResolutionContract = z.enum(["SELECTED", "IN_FILE", "FALLBACK_CONFIGURED", "FALLBACK_UPLOADER"]);

/** Addendum 2: kept unwrapped (it carries `success`). `resolution` only with hr:employees:view. */
export const onboardEmployeeResponseContract = z.object({
  success: z.boolean(),
  userId: z.string(),
  invite: inviteDeliveryContract,
  primaryManager: z
    .object({ userId: z.string(), name: z.string(), resolution: managerResolutionContract.optional() })
    .nullable()
    .optional(),
});

const onboardingPrimaryManagerContract = z.object({
  userId: z.string().nullable(),
  name: z.string(),
  email: z.string(),
  resolution: managerResolutionContract,
});

const bulkOnboardRowStatusContract = z.enum(["READY", "WARNING", "ERROR", "SKIPPED"]);

export const bulkOnboardPreviewContract = z.object({
  rows: z.array(
    z.object({
      row: z.number().int(),
      email: z.string(),
      status: bulkOnboardRowStatusContract,
      codes: z.array(z.string()),
      messages: z.array(z.string()),
      primaryManager: onboardingPrimaryManagerContract.nullable(),
      secondaryManagers: z.array(z.object({ name: z.string(), email: z.string() })),
      dependsOnRow: z.number().int().nullable(),
    }),
  ),
  counts: z.object({
    ready: z.number().int(),
    warning: z.number().int(),
    error: z.number().int(),
    skipped: z.number().int(),
  }),
});

export const resendEmployeeInviteResponseContract = z.object({
  success: z.boolean(),
  invite: inviteDeliveryContract,
});

/**
 * Addendum 2 names the commit statuses CREATED | FAILED | SKIPPED; the DTO reuses
 * the preview's READY | WARNING | ERROR | SKIPPED. Both are accepted.
 */
export const bulkOnboardResultContract = z.object({
  total: z.number().int(),
  created: z.number().int(),
  failed: z.number().int(),
  skipped: z.number().int(),
  results: z.array(z.object({
    row: z.number().int(),
    email: z.string(),
    success: z.boolean(),
    userId: z.string().optional(),
    error: z.string().optional(),
    status: z.enum(["READY", "WARNING", "ERROR", "SKIPPED", "CREATED", "FAILED"]),
    codes: z.array(z.string()),
    primaryManager: onboardingPrimaryManagerContract.nullable(),
  })),
});

export const employmentByUserIdContract = z.object({
  id: z.number().int(),
  personId: z.number().int(),
  employeeNumber: z.string(),
  lifecycleStatus: z.string(),
  workerType: z.string(),
  departmentId: z.string().nullable(),
  designation: z.string().nullable(),
  joiningDate: z.string().nullable(),
  probationEndDate: z.string().nullable(),
  confirmationDate: z.string().nullable(),
  isPrimary: z.boolean(),
  personFirstName: z.string().nullable(),
  personLastName: z.string().nullable(),
  personWorkEmail: z.string().nullable(),
});

export const timelinePageContract = z.object({
  data: z.array(z.object({
    id: z.string(),
    type: z.enum(["status_transition", "effective_change", "audit"]),
    action: z.string(),
    entityType: z.string(),
    createdAt: z.string(),
    data: z.record(z.string(), z.unknown()),
  })),
  pageInfo: z.object({
    limit: z.number().int(),
    hasMore: z.boolean(),
    nextCursor: z.string().nullable(),
  }),
});

export const sensitiveRowContract = z.object({
  id: z.number().int(),
  orgId: z.string(),
  employmentId: z.number().int(),
  salaryAmountCents: z.number().nullable(),
  salaryCurrency: z.string().nullable(),
  salaryFrequency: z.string().nullable(),
  bankDetails: z.record(z.string(), z.unknown()).nullable(),
  taxId: z.string().nullable(),
  panNumber: z.string().nullable(),
  nationalId: z.string().nullable(),
  passportNumber: z.string().nullable(),
  passportExpiry: z.string().nullable(),
  visaType: z.string().nullable(),
  visaExpiry: z.string().nullable(),
  medicalNotes: z.string().nullable(),
  bloodGroup: z.string().nullable(),
  disciplinaryRecords: z.array(z.record(z.string(), z.unknown())).nullable(),
  grievanceRecords: z.array(z.record(z.string(), z.unknown())).nullable(),
  bgvStatus: z.string().nullable(),
  bgvCompletedAt: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
}).nullable();

export const successContract = z.object({ success: z.boolean() });
