import { z } from "zod";
import { cursorPageInfoContract } from "@/hooks/api/cursor-page-schema";

/**
 * Worker records — names, work email and avatar, so PII on every row.
 *
 * The page is hand-rolled rather than the shared `buildCursorPage`, so the
 * envelope key is `pageInfo`, not `pagination`, and `nextCursor` is the raw
 * `workerId` UUID rather than an encoded cursor. `deletedAt` is always null on
 * this route (the query filters it out) but the column is nullable, so it is
 * contracted as nullable rather than as a literal.
 */

export const workerStatusContract = z.enum(["ACTIVE", "INACTIVE", "EXITED"]);

export const workerContract = z.object({
  workerId: z.string(),
  organizationId: z.string(),
  organizationPersonId: z.string(),
  workerNumber: z.string().nullable(),
  status: workerStatusContract,
  isPayee: z.boolean(),
  deletedAt: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
  firstName: z.string(),
  lastName: z.string(),
  displayName: z.string().nullable(),
  workEmail: z.string().nullable(),
  avatarUrl: z.string().nullable(),
  userId: z.string().nullable(),
});

export const workersPageContract = cursorPageInfoContract(workerContract);

export const workerTypeContract = z.enum([
  "FULL_TIME",
  "PART_TIME",
  "CONTRACTOR",
  "CONSULTANT",
  "INTERN",
  "TEMPORARY",
  "AGENCY",
  "FREELANCER",
]);

export const engagementStatusContract = z.enum([
  "PLANNED",
  "ACTIVE",
  "COMPLETED",
  "TERMINATED",
  "CANCELLED",
]);

export const workerEngagementContract = z.object({
  workerEngagementId: z.string(),
  organizationId: z.string(),
  workerId: z.string(),
  startsOn: z.string(),
  endsOn: z.string().nullable(),
  workerType: workerTypeContract,
  status: engagementStatusContract,
  isPrimary: z.boolean(),
  departmentId: z.string().nullable(),
  businessUnitId: z.string().nullable(),
  branchId: z.string().nullable(),
  locationId: z.string().nullable(),
  teamId: z.string().nullable(),
  managerEngagementId: z.string().nullable(),
  designation: z.string().nullable(),
  jobRoleId: z.number().int().nullable(),
  jobLevelId: z.number().int().nullable(),
  employmentTypeId: z.number().int().nullable(),
  probationEndsOn: z.string().nullable(),
  noticePeriodDays: z.number().int().nullable(),
  terminationReason: z.string().nullable(),
  terminationNotes: z.string().nullable(),
  stateReason: z.string().nullable(),
  lastStateEventId: z.number().nullable(),
  rowVersion: z.number().int(),
  createdByMembershipId: z.number().int().nullable(),
  updatedByMembershipId: z.number().int().nullable(),
  archivedAt: z.string().nullable(),
  archivedByMembershipId: z.number().int().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const workerEngagementListContract = z.array(workerEngagementContract);

export type WorkerRecord = z.infer<typeof workerContract>;
export type WorkersPageResponse = z.infer<typeof workersPageContract>;
