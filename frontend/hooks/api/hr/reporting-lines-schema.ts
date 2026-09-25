import { z } from "zod";

/**
 * HRM-15 reporting-line contracts. Mirrors the backend DTOs in
 * `src/modules/hr/directory/dto/reporting-lines-{shared,line,response}.schemas.ts`
 * field for field (FE-28). Where the published CONTRACT addenda and the DTO
 * disagree, the field accepts both shapes so neither side's reading throws.
 */

const managerStateContract = z.enum(["active", "on-notice", "inactive", "exited"]);

export const managerRefContract = z.object({
  userId: z.string(),
  name: z.string(),
  email: z.string().nullable(),
  designation: z.string().nullable(),
  state: managerStateContract,
});

export const reportingLineSourceContract = z.enum([
  "MANUAL",
  "MIGRATED",
  "ONBOARDING_SELECTED",
  "ONBOARDING_FALLBACK",
  "BULK_ONBOARDING",
  "STAGED_IMPORT",
  "EMPLOYEE_REQUEST",
  "BULK_REASSIGNMENT",
  "EMERGENCY_OVERRIDE",
  "EFFECTIVE_CHANGE",
]);

export const relationshipEntryContract = z.object({
  lineId: z.number().int(),
  relationshipType: z.enum(["PRIMARY", "SECONDARY"]),
  label: z.string().nullable(),
  manager: managerRefContract,
  effectiveFrom: z.string(),
  effectiveTo: z.string().nullable(),
  source: reportingLineSourceContract,
  isFallback: z.boolean(),
  fallbackConfirmedAt: z.string().nullable(),
  recordedAt: z.string(),
  changeReason: z.string().nullable(),
});

export const managerResolutionContract = z.enum(["SELECTED", "IN_FILE", "FALLBACK_CONFIGURED", "FALLBACK_UPLOADER"]);

const reportingLineEntryContract = z.object({
  lineId: z.number().int(),
  managerUserId: z.string().nullable(),
  managerName: z.string().nullable(),
  managerEmail: z.string().nullable(),
  managerDesignation: z.string().nullable(),
  effectiveFrom: z.string(),
  effectiveTo: z.string().nullable(),
  recordedAt: z.string(),
  recordedBy: z.string().nullable(),
  managerState: managerStateContract,
});

/**
 * The PRIMARY entry. `fallbackConfirmedAt` and `changeReason` are emitted by the
 * read model but absent from the DTO's primary entry, hence optional.
 */
const primaryEntryContract = reportingLineEntryContract.extend({
  source: reportingLineSourceContract,
  isFallback: z.boolean(),
  relationshipType: z.literal("PRIMARY"),
  fallbackConfirmedAt: z.string().nullable().optional(),
  changeReason: z.string().nullable().optional(),
});

export const permittedActionsContract = z.object({
  manage: z.boolean(),
  review: z.boolean(),
  override: z.boolean(),
});

export const reportingLineViewContract = z.object({
  userId: z.string(),
  current: primaryEntryContract.nullable(),
  upcoming: z.array(primaryEntryContract),
  history: z.array(primaryEntryContract),
  secondary: z.array(relationshipEntryContract),
  /** Addendum 2: `reason` is null without manage/review (the DTO says string). */
  topLevel: z.object({ reason: z.string().nullable(), effectiveFrom: z.string() }).nullable(),
  primaryChangesLast24h: z.number().int(),
  changeThreshold: z.number().int(),
  maxSecondaryManagers: z.number().int(),
  pendingRequest: z.object({ requestId: z.string(), status: z.string(), createdAt: z.string() }).nullable(),
  permittedActions: permittedActionsContract,
});

export const setReportingLineResponseContract = z.object({
  line: reportingLineViewContract,
  warnings: z.array(z.string()),
});

export const managerCandidatesContract = z.object({ items: z.array(managerRefContract) });

export const fallbackOrderContract = z.enum(["CONFIGURED_MANAGER_THEN_UPLOADER", "UPLOADER_THEN_CONFIGURED_MANAGER"]);

export const reportingManagerPolicyContract = z.object({
  maxSecondaryManagersPerEmployee: z.number().int().min(0).max(3),
  defaultPrimaryManager: managerRefContract.nullable(),
  defaultPrimaryManagerEligible: z.boolean(),
  fallbackOrder: fallbackOrderContract,
  requireReasonAfterChanges: z.number().int().min(1).max(10),
  allowTopLevelWithoutManager: z.boolean(),
  version: z.number().int(),
  updatedAt: z.string().nullable(),
  isConfigured: z.boolean(),
  actorQualifiesAsFallback: z.boolean(),
});

export const myReportingLineContract = z.object({
  /** Addendum 1 Q8: always present; the DTO omits it, so absent reads as "employed". */
  hasEmployment: z.boolean().optional(),
  primary: relationshipEntryContract.nullable(),
  secondary: z.array(relationshipEntryContract),
  topLevel: z.object({ effectiveFrom: z.string() }).nullable(),
});

export const managerCoverageReportContract = z.object({
  generatedAt: z.string(),
  spanOfControlLimit: z.number().int(),
  summary: z.object({
    employees: z.number().int(),
    withManager: z.number().int(),
    withoutManager: z.number().int(),
    inactiveManager: z.number().int(),
    circular: z.number().int(),
    overSpan: z.number().int(),
    topLevel: z.number().int().optional(),
    fallback: z.number().int().optional(),
    pendingReview: z.number().int().optional(),
  }),
  withoutManager: z.array(
    z.object({
      userId: z.string().nullable(),
      employmentId: z.number().int(),
      employeeNumber: z.string(),
      name: z.string().nullable(),
      email: z.string().nullable(),
      designation: z.string().nullable(),
      departmentId: z.string().nullable(),
      lifecycleStatus: z.string(),
    }),
  ),
  inactiveManager: z.array(
    z.object({
      userId: z.string().nullable(),
      name: z.string().nullable(),
      managerUserId: z.string().nullable(),
      managerName: z.string().nullable(),
      managerState: managerStateContract,
      effectiveFrom: z.string(),
    }),
  ),
  /** Addendum 1 Q3 adds `members`; the DTO still carries only `userIds`. */
  circular: z.array(
    z.object({
      userIds: z.array(z.string()),
      members: z.array(z.object({ userId: z.string(), name: z.string().nullable() })).optional(),
    }),
  ),
  overSpan: z.array(
    z.object({
      managerUserId: z.string().nullable(),
      managerName: z.string().nullable(),
      directReports: z.number().int(),
    }),
  ),
  policyMissing: z.boolean().optional(),
  fallback: z
    .array(
      z.object({
        userId: z.string().nullable(),
        name: z.string().nullable(),
        managerUserId: z.string().nullable(),
        managerName: z.string().nullable(),
        effectiveFrom: z.string(),
      }),
    )
    .optional(),
  pendingReview: z
    .array(
      z.object({
        requestId: z.string(),
        userId: z.string().nullable(),
        name: z.string().nullable(),
        createdAt: z.string(),
      }),
    )
    .optional(),
});

export type ManagerState = z.infer<typeof managerStateContract>;
export type ManagerRef = z.infer<typeof managerRefContract>;
export type RelationshipEntry = z.infer<typeof relationshipEntryContract>;
export type ReportingLineSource = z.infer<typeof reportingLineSourceContract>;
export type ManagerResolution = z.infer<typeof managerResolutionContract>;
export type PrimaryReportingLineEntry = z.infer<typeof primaryEntryContract>;
export type ReportingLineEntry = PrimaryReportingLineEntry;
export type ReportingLineView = z.infer<typeof reportingLineViewContract>;
export type SetReportingLineResponse = z.infer<typeof setReportingLineResponseContract>;
export type ManagerCandidates = z.infer<typeof managerCandidatesContract>;
export type FallbackOrder = z.infer<typeof fallbackOrderContract>;
export type ReportingManagerPolicy = z.infer<typeof reportingManagerPolicyContract>;
export type MyReportingLine = z.infer<typeof myReportingLineContract>;
export type ManagerCoverageReport = z.infer<typeof managerCoverageReportContract>;
