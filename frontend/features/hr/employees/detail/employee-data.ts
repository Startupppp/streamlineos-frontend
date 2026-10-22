import * as z from "zod";

const employeeSkillSchema = z
  .object({
    name: z.string(),
    level: z.number(),
  })
  .strict();

const employeeEmploymentSchema = z
  .object({
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
    rowVersion: z.number().int().optional(),
  })
  .strict();

const inviteDeliverySchema = z
  .object({
    status: z.enum(["none", "queued", "sent", "failed", "suppressed"]),
    queuedAt: z.string().nullable(),
    sentAt: z.string().nullable(),
    attempts: z.number().int(),
    lastError: z.string().nullable(),
    deliveryConfirmed: z.literal(false),
  })
  .strict();

export const employeeDataSchema = z
  .object({
    id: z.string(),
    name: z.string().nullable(),
    firstName: z.string().nullable(),
    lastName: z.string().nullable(),
    email: z.string(),
    role: z.string().nullable(),
    designation: z.string().nullable(),
    employeeId: z.string().nullable(),
    orgDepartmentId: z.string().nullable(),
    image: z.string().nullable(),
    isActive: z.boolean().nullable(),
    hasAccepted: z.boolean(),
    joiningDate: z.string().nullable(),
    reportingTo: z.string().nullable(),
    bio: z.string().nullable(),
    linkedinUrl: z.string().nullable(),
    twitterUrl: z.string().nullable(),
    githubUrl: z.string().nullable(),
    websiteUrl: z.string().nullable(),
    skills: z.array(employeeSkillSchema).nullable(),
    phone: z.string().nullable(),
    employmentStatus: z.string().nullable(),
    employment: employeeEmploymentSchema.nullable(),
    inviteDelivery: inviteDeliverySchema,
    allowedActions: z.array(z.string()).optional(),
    departmentName: z.string().nullable().optional(),
    gender: z.enum(["MALE", "FEMALE", "OTHER"]).nullable().optional(),
  })
  .strict();

export type EmployeeData = z.infer<typeof employeeDataSchema>;
