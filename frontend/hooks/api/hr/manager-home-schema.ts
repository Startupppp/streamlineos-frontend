import { z } from "zod";

export const managerHomeReportContract = z.object({
  userId: z.string(),
  membershipId: z.number().nullable(),
  name: z.string().nullable(),
  email: z.string().nullable(),
  designation: z.string().nullable(),
  joiningDate: z.string().nullable(),
  lifecycleStatus: z.string(),
  onLeaveToday: z.boolean(),
  probationEndsOn: z.string().nullable(),
  unsettledTimesheets: z.number(),
});

export const managerHomeApprovalContract = z.object({
  kind: z.enum(["leave", "wfh", "timesheet", "workflow"]),
  id: z.number(),
  subjectUserId: z.string().nullable(),
  subjectName: z.string().nullable(),
  summary: z.string(),
  requestedAt: z.string(),
  dueAt: z.string().nullable(),
  href: z.string(),
});

export const managerHomeContract = z.object({
  isManager: z.boolean(),
  generatedAt: z.string(),
  reports: z.array(managerHomeReportContract),
  approvals: z.object({
    leave: z.number(),
    wfh: z.number(),
    timesheets: z.number(),
    workflows: z.number(),
    items: z.array(managerHomeApprovalContract),
  }),
  missingTimesheets: z.array(
    z.object({
      periodId: z.number(),
      userId: z.string().nullable(),
      name: z.string().nullable(),
      periodStart: z.string(),
      periodEnd: z.string(),
      status: z.string(),
    }),
  ),
  upcomingLeave: z.array(z.object({ userId: z.string(), name: z.string(), startDate: z.string(), endDate: z.string(), leaveTypeId: z.number().nullable() })),
  probationDue: z.array(z.object({ userId: z.string(), name: z.string().nullable(), probationEndDate: z.string(), daysLeft: z.number() })),
});

export type ManagerHome = z.infer<typeof managerHomeContract>;
export type ManagerHomeReport = z.infer<typeof managerHomeReportContract>;
export type ManagerHomeApproval = z.infer<typeof managerHomeApprovalContract>;
