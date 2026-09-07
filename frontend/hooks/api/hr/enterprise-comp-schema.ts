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
  fiscalYear: z.number().int(),
  status: z.enum(["draft", "active", "calibrating", "approved", "closed"]),
  budgetPoolCents: z.number(),
  meritMatrix: z.record(z.string(), z.unknown()).nullable(),
  createdBy: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const listCompCyclesContract = withCursorPage(compCycleContract);
export const getCompCycleContract = compCycleContract;
export const createCompCycleContract = compCycleContract;

const recommendationProjectionContract = z.object({
  id: z.number().int(),
  cycleId: z.number().int(),
  userId: z.string(),
  currentSalaryCents: z.number(),
  recommendedIncreaseCents: z.number(),
  recommendedPct: z.string(),
  rating: z.string().nullable(),
  managerNote: z.string().nullable(),
  hrCalibratedCents: z.number().nullable(),
  status: z.enum(["draft", "submitted", "calibrated", "approved"]),
  createdAt: z.string(),
});

export const listRecommendationsContract = withCursorPage(recommendationProjectionContract);
export const calibrateRecommendationContract = z.object({
  id: z.number().int(),
  orgId: z.string(),
  cycleId: z.number().int(),
  userId: z.string(),
  userMembershipId: z.number().int().nullable(),
  currentSalaryCents: z.number(),
  recommendedIncreaseCents: z.number(),
  recommendedPct: z.string(),
  rating: z.string().nullable(),
  managerNote: z.string().nullable(),
  hrCalibratedCents: z.number().nullable(),
  status: z.enum(["draft", "submitted", "calibrated", "approved"]),
  submittedBy: z.string().nullable(),
  calibratedBy: z.string().nullable(),
  approvedBy: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

const budgetPoolContract = z.object({
  id: z.number().int(),
  orgId: z.string(),
  cycleId: z.number().int(),
  departmentId: z.string().nullable(),
  allocatedCents: z.number(),
  usedCents: z.number(),
  createdAt: z.string(),
});

export const listBudgetPoolsContract = z.array(budgetPoolContract);

const scheduleItemContract = z.object({
  vestDate: z.string(),
  unitsVested: z.number().int(),
  cumulativeVested: z.number().int(),
});

export const equityGrantContract = z.object({
  id: z.number().int(),
  orgId: z.string(),
  userId: z.string(),
  grantType: z.enum(["ISO", "NSO", "RSU", "other"]),
  units: z.number().int(),
  strikePriceCents: z.number().int().nullable(),
  grantDate: z.string(),
  cliffMonths: z.number().int(),
  vestingMonths: z.number().int(),
  documentUrl: z.string().nullable(),
  notes: z.string().nullable(),
  status: z.enum(["active", "exercised", "cancelled", "expired"]),
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
  totalHeadcount: z.number().int(),
  totalAnnualCtcCents: z.number(),
  totalMonthlyCostCents: z.number(),
});

export const costByDepartmentContract = z.array(z.object({
  departmentId: z.string().nullable(),
  departmentName: z.string().nullable(),
  headcount: z.number().int(),
  monthlyCostCents: z.number(),
}));

export const costByLocationContract = z.array(z.object({
  locationId: z.string(),
  headcount: z.number().int(),
  monthlyCostCents: z.number(),
}));

export const voidContract = z.undefined();
