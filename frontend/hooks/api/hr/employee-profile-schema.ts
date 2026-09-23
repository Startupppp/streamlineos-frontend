import { z } from "zod";

export const inviteDeliveryContract = z.object({
  sent: z.boolean(),
  reason: z.string().nullable(),
});

export type InviteDelivery = z.infer<typeof inviteDeliveryContract>;

export const onboardEmployeeResponseContract = z.object({
  success: z.boolean(),
  userId: z.string(),
  invite: inviteDeliveryContract,
});

export const resendEmployeeInviteResponseContract = z.object({
  success: z.boolean(),
  invite: inviteDeliveryContract,
});

export const bulkOnboardResultContract = z.object({
  total: z.number().int(),
  created: z.number().int(),
  failed: z.number().int(),
  results: z.array(z.object({
    row: z.number().int(),
    email: z.string(),
    success: z.boolean(),
    userId: z.string().optional(),
    error: z.string().optional(),
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
