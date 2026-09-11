import { z } from "zod";
import { cursorPaginationContract } from "@/hooks/api/cursor-page-schema";

const attendanceRowContract = z.object({
  id: z.number(),
  orgId: z.string(),
  userId: z.string(),
  date: z.string(),
  checkIn: z.string().nullable(),
  checkOut: z.string().nullable(),
  status: z.string(),
  workHours: z.string().nullable(),
  breakHours: z.string(),
  breaks: z.array(z.object({ start: z.string(), end: z.string().optional() })),
  locationData: z.object({
    lat: z.number().optional(),
    lng: z.number().optional(),
    address: z.string().optional(),
  }).nullable(),
  isOvertime: z.boolean(),
  autoCheckedOut: z.boolean(),
  createdAt: z.string(),
});

export const attendanceStatusContract = z.object({
  status: z.string(),
  logs: z.array(attendanceRowContract),
  todayLog: attendanceRowContract.nullable(),
  dailyStats: z.object({
    workHours: z.string(),
    breakHours: z.string(),
    isOvertime: z.boolean(),
  }),
  cooldownRemaining: z.number(),
});

export const attendanceHistoryContract = z.object({
  data: z.array(attendanceRowContract),
  pagination: cursorPaginationContract,
});

export const attendanceRowListContract = z.array(attendanceRowContract);

export const checkInOutContract = z.object({ success: z.boolean() });

const timesheetRowContract = z.object({
  id: z.number(),
  orgId: z.string(),
  userMembershipId: z.number().nullable(),
  ticketId: z.number().nullable(),
  date: z.string(),
  hours: z.string(),
  description: z.string().nullable(),
  imageUrl: z.string().nullable(),
  workLink: z.string().nullable(),
  status: z.string(),
  approvedByMembershipId: z.number().nullable(),
  approvedAt: z.string().nullable(),
  rejectionReason: z.string().nullable(),
  isBillable: z.boolean(),
  payrollStatus: z.string(),
  payrollExportId: z.number().nullable(),
  projectId: z.number().nullable(),
  timesheetPeriodId: z.number().nullable(),
  timerSessionId: z.number().nullable(),
  billingType: z.string(),
  billRate: z.string().nullable(),
  costRate: z.string().nullable(),
  currency: z.string().nullable(),
  rateSource: z.string().nullable(),
  invoicingStatus: z.string(),
  submittedAt: z.string().nullable(),
  lockedAt: z.string().nullable(),
  lockedByMembershipId: z.number().nullable(),
  voidedAt: z.string().nullable(),
  voidReason: z.string().nullable(),
  source: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const timesheetRowListContract = z.array(timesheetRowContract);
export const timesheetRowSingleContract = timesheetRowContract;

const teamStatusItemContract = z.object({
  userId: z.string(),
  name: z.string(),
  email: z.string(),
  image: z.string().nullable(),
  department: z.string().nullable(),
  status: z.string(),
  checkIn: z.string().nullable(),
  checkOut: z.string().nullable(),
  workHours: z.string().nullable(),
});

export const teamAttendanceStatusContract = z.object({
  data: z.array(teamStatusItemContract),
  counts: z.object({
    PRESENT: z.number(),
    ON_BREAK: z.number(),
    CHECKED_OUT: z.number(),
    OFFLINE: z.number(),
  }),
  pagination: z.object({
    limit: z.number(),
    hasMore: z.boolean(),
    nextCursor: z.string().nullable(),
    total: z.number(),
  }),
});

export const regularizationRowContract = z.object({
  id: z.number(),
  orgId: z.string(),
  userId: z.string(),
  attendanceDate: z.string(),
  requestedCheckIn: z.string().nullable(),
  requestedCheckOut: z.string().nullable(),
  reason: z.string(),
  status: z.string(),
  workflowInstanceId: z.string().nullable(),
  approvedBy: z.string().nullable(),
  approvedAt: z.string().nullable(),
  rejectedBy: z.string().nullable(),
  rejectedAt: z.string().nullable(),
  rejectionReason: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
