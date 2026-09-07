import { z } from "zod";

const hrCaseSchema = z.object({
  id: z.number().int(),
  orgId: z.string(),
  caseNumber: z.string(),
  category: z.enum(["grievance", "disciplinary", "harassment", "ethics", "performance", "workplace_conflict", "policy_violation", "other"]),
  subjectEmployeeId: z.string().nullable(),
  reportedBy: z.string().nullable(),
  anonymous: z.boolean(),
  confidential: z.boolean(),
  severity: z.enum(["low", "medium", "high", "critical"]),
  status: z.enum(["open", "under_investigation", "resolved", "closed", "dismissed"]),
  summary: z.string(),
  details: z.string(),
  outcome: z.string().nullable(),
  resolvedAt: z.string().nullable(),
  assignedTo: z.string().nullable(),
  assignedToMembershipId: z.number().int().nullable(),
  reportedByMembershipId: z.number().int().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
  deletedAt: z.string().nullable(),
});

const cursorPaginationSchema = z.object({
  limit: z.number().int(),
  hasMore: z.boolean(),
  nextCursor: z.string().nullable(),
});

export const hrCaseListContract = z.object({
  data: z.array(hrCaseSchema),
  pagination: cursorPaginationSchema,
});

export const hrCaseContract = hrCaseSchema;

export const anonymousCaseContract = z.object({
  caseNumber: z.string(),
});

export const hrCaseNoteContract = z.object({
  id: z.number().int(),
  caseId: z.number().int(),
  orgId: z.string(),
  authorId: z.string().nullable(),
  authorMembershipId: z.number().int().nullable(),
  note: z.string(),
  isConfidential: z.boolean(),
  createdAt: z.string(),
});

export const hrCaseNotesContract = z.array(hrCaseNoteContract);

export const hrCaseDocumentContract = z.object({
  id: z.number().int(),
  caseId: z.number().int(),
  orgId: z.string(),
  name: z.string(),
  url: z.string(),
  restricted: z.boolean(),
  uploadedBy: z.string().nullable(),
  createdAt: z.string(),
});

export const hrCaseDocumentsContract = z.array(hrCaseDocumentContract);

const hrDisciplinaryActionSchema = z.object({
  id: z.number().int(),
  orgId: z.string(),
  caseId: z.number().int().nullable(),
  employeeId: z.string(),
  employeeMembershipId: z.number().int().nullable(),
  actionType: z.enum(["verbal_warning", "written_warning", "final_warning", "suspension", "termination_recommended"]),
  letterRenderId: z.number().int().nullable(),
  effectiveDate: z.string(),
  issuedBy: z.string(),
  note: z.string().nullable(),
  acknowledgedAt: z.string().nullable(),
  acknowledgedBy: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const hrDisciplinaryListContract = z.object({
  data: z.array(hrDisciplinaryActionSchema),
  pagination: cursorPaginationSchema,
});

export const hrDisciplinaryCreateContract = hrDisciplinaryActionSchema.extend({
  progressive: z.object({
    warning: z.string().nullable(),
    honestyNote: z.string().nullable(),
  }),
});

export const hrDisciplinaryActionContract = hrDisciplinaryActionSchema;
