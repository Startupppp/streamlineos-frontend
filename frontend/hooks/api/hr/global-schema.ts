import { z } from "zod";

const cursorPagination = z.object({
  limit: z.number().int(),
  hasMore: z.boolean(),
  nextCursor: z.string().nullable(),
});

const withCursorPage = <T extends z.ZodType>(item: T) =>
  z.object({ data: z.array(item), pagination: cursorPagination });

const workAuthContract = z.object({
  id: z.number().int(),
  orgId: z.string(),
  employmentId: z.number().int(),
  authType: z.enum(["work_permit", "visa", "right_to_work", "citizenship_proof", "other"]),
  countryCode: z.string(),
  documentNumberMasked: z.string().nullable(),
  validFrom: z.string().nullable(),
  validUntil: z.string().nullable(),
  status: z.enum(["active", "expiring", "expired", "pending_renewal"]),
  verifiedBy: z.string().nullable(),
  note: z.string().nullable(),
  createdBy: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
  deletedAt: z.string().nullable(),
});

export const listWorkAuthsContract = withCursorPage(workAuthContract);
export const createWorkAuthContract = workAuthContract;
export const updateWorkAuthContract = workAuthContract;

const complianceRequirementContract = z.object({
  id: z.number().int(),
  orgId: z.string(),
  name: z.string(),
  countryCode: z.string().nullable(),
  stateCode: z.string().nullable(),
  category: z.enum(["statutory_filing", "registration", "posting", "training", "audit", "other"]),
  frequency: z.enum(["once", "monthly", "quarterly", "yearly"]),
  dueRule: z.object({
    month: z.number().int().optional(),
    day: z.number().int().optional(),
    offsetDays: z.number().int().optional(),
  }),
  reminderDaysBefore: z.number().int(),
  active: z.boolean(),
  createdBy: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const listComplianceRequirementsContract = withCursorPage(complianceRequirementContract);
export const createComplianceRequirementContract = complianceRequirementContract;
export const updateComplianceRequirementContract = complianceRequirementContract;

const complianceEventContract = z.object({
  id: z.number().int(),
  orgId: z.string(),
  requirementId: z.number().int(),
  dueDate: z.string(),
  status: z.enum(["pending", "done", "overdue"]),
  completedBy: z.string().nullable(),
  completedAt: z.string().nullable(),
  notes: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
  requirementName: z.string().nullable(),
  category: z.string().nullable(),
  reminderDaysBefore: z.number().int().nullable(),
});

export const listComplianceEventsContract = z.object({
  data: z.array(complianceEventContract),
  pagination: cursorPagination,
});

export const generateEventsContract = z.object({
  generated: z.number().int(),
  total: z.number().int(),
});

export const seedCountryPackContract = z.object({
  country: z.string(),
  holidays: z.number().int(),
  requirements: z.number().int(),
  sensitiveFieldKeys: z.array(z.string()),
});

const contractSchemaItem = z.object({
  id: z.number().int(),
  orgId: z.string(),
  employmentId: z.number().int(),
  contractType: z.enum(["contractor", "consultant", "intern", "temporary", "agency", "freelancer"]),
  agencyVendor: z.string().nullable(),
  startDate: z.string(),
  endDate: z.string().nullable(),
  renewalReminderDays: z.number().int(),
  stipendCents: z.number().int().nullable(),
  timesheetBased: z.boolean(),
  status: z.enum(["active", "expiring", "ended", "renewed", "converted"]),
  documentUrl: z.string().nullable(),
  createdBy: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
  deletedAt: z.string().nullable(),
});

export const listContractsContract = withCursorPage(contractSchemaItem);
export const createContractContract = contractSchemaItem;
export const updateContractContract = contractSchemaItem;
export const endContractContract = contractSchemaItem;

export const convertToEmployeeContract = z.object({
  ok: z.literal(true),
  employmentId: z.number().int().nullable(),
});

export const internshipCertificateContract = z.object({
  html: z.string(),
  templateId: z.number().int().nullable(),
});

export const successContract = z.object({ success: z.boolean() });
export const voidContract = z.undefined();
export const markEventDoneContract = z.object({ success: z.boolean() });
