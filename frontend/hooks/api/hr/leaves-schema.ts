import { z } from "zod";
import { approvalRouteContract } from "@/hooks/api/hr/approval-route-schema";

const successContract = z.object({ success: z.literal(true) });

const leaveTypeRowSchema = z.object({
  id: z.number().int(),
  orgId: z.string(),
  name: z.string(),
  daysPerYear: z.number().int(),
  carryForward: z.boolean(),
});

const leaveRequestRowSchema = z.object({
  id: z.number().int(),
  orgId: z.string(),
  userId: z.string(),
  workerId: z.string().nullable(),
  workerEngagementId: z.string().nullable(),
  leaveTypeId: z.number().int(),
  startDate: z.string(),
  endDate: z.string(),
  reason: z.string().nullable(),
  priority: z.string(),
  status: z.string(),
  approverId: z.string().nullable(),
  rejectionReason: z.string().nullable(),
  managerComment: z.string().nullable(),
  attachmentUrl: z.string().nullable(),
  isHalfDay: z.boolean(),
  halfDayPeriod: z.string().nullable(),
  coveringEmployeeId: z.string().nullable(),
  lopDays: z.string(),
  approverMembershipId: z.number().int().nullable(),
  userMembershipId: z.number().int().nullable(),
  coveringEmployeeMembershipId: z.number().int().nullable(),
  rowVersion: z.number().int(),
  createdByMembershipId: z.number().int().nullable(),
  updatedByMembershipId: z.number().int().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

const leaveRequestWithRelationsSchema = leaveRequestRowSchema.extend({
  leaveType: z
    .object({ id: z.number().int(), name: z.string(), daysPerYear: z.number().int() })
    .nullable(),
  approver: z
    .object({
      id: z.string(),
      name: z.string().nullable(),
      firstName: z.string().nullable(),
      lastName: z.string().nullable(),
    })
    .nullable(),
});

const leavesTeamItemSchema = leaveRequestRowSchema.extend({
  leaveType: z.object({ id: z.number().int(), name: z.string() }).nullable(),
  approver: z
    .object({
      id: z.string(),
      name: z.string().nullable(),
      firstName: z.string().nullable(),
      lastName: z.string().nullable(),
    })
    .nullable(),
  user: z
    .object({
      id: z.string(),
      name: z.string().nullable(),
      firstName: z.string().nullable(),
      lastName: z.string().nullable(),
      image: z.string().nullable(),
    })
    .nullable(),
});

export const requestLeaveContract = z.object({
  success: z.literal(true),
  conflictWarning: z.string().optional(),
});

export const leaveApproveContract = successContract;
export const leaveRejectContract = successContract;
export const leaveCancelContract = successContract;
export const leaveRevertContract = successContract;

export const leaveTypesListContract = z.array(leaveTypeRowSchema);

export const seedLeaveTypesContract = z.object({
  seeded: z.number().int(),
  skipped: z.number().int(),
});

export const updateLeaveTypeContract = leaveTypeRowSchema;

export const deleteLeaveTypeContract = successContract;

export const createLeaveTypeContract = z.object({
  id: z.number().int(),
  orgId: z.string(),
  name: z.string(),
  daysPerYear: z.number().int(),
  carryForward: z.boolean(),
});

export const leaveContextContract = z.object({
  balances: z.array(
    z.object({
      id: z.number().int(),
      leaveTypeId: z.number().int().nullable(),
      balance: z.string(),
      typeName: z.string().nullable(),
      daysPerYear: z.number().int().nullable(),
    }),
  ),
  types: z.array(leaveTypeRowSchema),
  joiningDate: z.string().nullable(),
  approvers: z.array(
    z.object({
      id: z.string(),
      name: z.string().nullable(),
      email: z.string(),
      firstName: z.string().nullable().optional(),
      lastName: z.string().nullable().optional(),
      image: z.string().nullable().optional(),
    }),
  ),
  approvalRoute: approvalRouteContract,
  /**
   * V-045. True when the org has configured no leave type at all. Optional
   * until the backend half lands; the page falls back to `types.length === 0`.
   */
  noPolicyConfigured: z.boolean().optional(),
});

const idCursorPageInfoSchema = z.object({
  limit: z.number().int(),
  hasMore: z.boolean(),
  nextCursor: z.number().int().nullable(),
});

export const leaveApprovalsContract = z.object({
  data: z.array(leavesTeamItemSchema),
  pageInfo: idCursorPageInfoSchema,
});

export type LeavesTeamPage = z.infer<typeof leaveApprovalsContract>;

export const leavesThisWeekContract = z.array(
  leaveRequestRowSchema.extend({
    leaveType: z.object({ id: z.number().int(), name: z.string() }).nullable(),
    user: z
      .object({
        id: z.string(),
        name: z.string().nullable(),
        firstName: z.string().nullable(),
        lastName: z.string().nullable(),
        image: z.string().nullable(),
        designation: z.string().nullable(),
      })
      .nullable(),
  }),
);

export const leaveRequestsPageContract = z.object({
  data: z.array(leaveRequestWithRelationsSchema),
  pageInfo: idCursorPageInfoSchema,
});

const orgHolidayRowSchema = z.object({
  id: z.string(),
  orgId: z.string(),
  name: z.string(),
  date: z.string(),
  recurring: z.boolean(),
  createdBy: z.string().nullable(),
  createdAt: z.string(),
});

export const holidaysListContract = z.array(orgHolidayRowSchema);

const hrHolidayRowSchema = z.object({
  id: z.number().int(),
  orgId: z.string(),
  name: z.string(),
  date: z.string(),
  message: z.string().nullable(),
  isPublic: z.boolean(),
  notificationSent: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const hrHolidaysListContract = z.array(hrHolidayRowSchema);

export type HrHolidayRow = z.infer<typeof hrHolidayRowSchema>;


export const leaveAnalyticsContract = z.object({
  year: z.number().int(),
  byDepartment: z.array(
    z.object({
      department: z.string(),
      total: z.number().int(),
      approved: z.number().int(),
      pending: z.number().int(),
      rejected: z.number().int(),
    }),
  ),
  monthlyTrend: z.array(z.object({ month: z.string(), count: z.number().int() })),
  byLeaveType: z.array(z.object({ typeName: z.string(), count: z.number().int() })),
  avgDaysByDepartment: z.array(z.object({ department: z.string(), avgDays: z.number() })),
});

export const leavePolicyContract = z.object({
  wfhMonthlyQuota: z.number().nullable(),
  leaveTypes: z.array(
    z.object({
      name: z.string(),
      daysPerYear: z.number().int(),
      carryForward: z.boolean(),
      expiresMonthly: z.boolean(),
    }),
  ),
});
