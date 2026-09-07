import { z } from "zod";

const cursorPagination = z.object({
  limit: z.number().int(),
  hasMore: z.boolean(),
  nextCursor: z.string().nullable(),
});

const withCursorPage = <T extends z.ZodType>(item: T) =>
  z.object({ data: z.array(item), pagination: cursorPagination });

const timeDeviceContract = z.object({
  id: z.number().int(),
  orgId: z.string(),
  name: z.string(),
  serialNumber: z.string(),
  type: z.enum(["biometric", "rfid", "mobile", "other"]),
  locationId: z.string().nullable(),
  status: z.enum(["active", "inactive", "faulty"]),
  lastSyncAt: z.string().nullable(),
  effectiveFrom: z.string().nullable(),
  effectiveTo: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

const syncLogContract = z.object({
  id: z.number().int(),
  orgId: z.string(),
  deviceId: z.number().int(),
  status: z.enum(["success", "failed", "partial"]),
  recordsCount: z.number().int(),
  error: z.string().nullable(),
  syncedAt: z.string(),
});

export const listDevicesContract = withCursorPage(timeDeviceContract);
export const createDeviceContract = timeDeviceContract;
export const updateDeviceContract = timeDeviceContract;

export const listSyncLogsContract = withCursorPage(syncLogContract);
export const listFailedSyncsContract = z.array(syncLogContract);

const compCycleContract = z.object({
  id: z.number().int(),
  orgId: z.string(),
  name: z.string(),
  type: z.string(),
  fiscalYear: z.number().int().nullable(),
  status: z.string(),
  budgetCents: z.number().int().nullable(),
  effectiveDate: z.string().nullable(),
  createdBy: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const listCompCyclesContract = withCursorPage(compCycleContract);
export const getCompCycleContract = compCycleContract;
export const createCompCycleContract = compCycleContract;

const recommendationProjectionContract = z.object({
  id: z.number().int(),
  orgId: z.string(),
  cycleId: z.number().int(),
  userId: z.string(),
  currentCents: z.number().int(),
  proposedCents: z.number().int().nullable(),
  hrCalibratedCents: z.number().int().nullable(),
  finalCents: z.number().int().nullable(),
  status: z.string(),
  reason: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const listRecommendationsContract = withCursorPage(recommendationProjectionContract);
export const calibrateRecommendationContract = recommendationProjectionContract.extend({
  approvedAt: z.string().nullable(),
  approvedBy: z.string().nullable(),
});

const budgetPoolContract = z.object({
  id: z.number().int(),
  orgId: z.string(),
  cycleId: z.number().int(),
  name: z.string(),
  budgetCents: z.number().int(),
  allocatedCents: z.number().int(),
  departmentId: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const listBudgetPoolsContract = z.array(budgetPoolContract);

const scheduleItemContract = z.object({
  vestDate: z.string(),
  unitsVested: z.number().int(),
  cumulativeVested: z.number().int(),
});

const equityGrantContract = z.object({
  id: z.number().int(),
  orgId: z.string(),
  userId: z.string(),
  grantType: z.string(),
  units: z.number().int(),
  strikePriceCents: z.number().int().nullable(),
  grantDate: z.string(),
  cliffMonths: z.number().int(),
  vestingMonths: z.number().int(),
  documentUrl: z.string().nullable(),
  notes: z.string().nullable(),
  status: z.string(),
  createdBy: z.string().nullable(),
  boardApprovedAt: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const listGrantsContract = withCursorPage(equityGrantContract);

export const createGrantContract = equityGrantContract.extend({
  vestingSchedule: z.array(scheduleItemContract),
});

const vestingEventContract = z.object({
  id: z.number().int(),
  orgId: z.string(),
  grantId: z.number().int(),
  vestDate: z.string(),
  unitsVested: z.number().int(),
  cumulativeVested: z.number().int(),
});

export const getVestingScheduleContract = z.array(vestingEventContract);

export const recordExerciseContract = z.object({
  id: z.number().int(),
  orgId: z.string(),
  grantId: z.number().int(),
  units: z.number().int(),
  exerciseDate: z.string(),
  createdBy: z.string().nullable(),
  createdAt: z.string(),
});

export const costSummaryContract = z.object({
  total_headcount: z.unknown().nullable(),
  total_annual_ctc_cents: z.unknown().nullable(),
  total_monthly_cost_cents: z.unknown().nullable(),
}).nullable();

export const costByDepartmentContract = z.array(z.object({
  department_id: z.unknown().nullable(),
  department_name: z.unknown().nullable(),
  headcount: z.unknown().nullable(),
  monthly_cost_cents: z.unknown().nullable(),
}));

export const costByLocationContract = z.array(z.object({
  location_id: z.unknown().nullable(),
  headcount: z.unknown().nullable(),
  monthly_cost_cents: z.unknown().nullable(),
}));

export const voidContract = z.undefined();
