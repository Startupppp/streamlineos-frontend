import { z } from "zod";

/**
 * Response contracts for the dashboard module.
 * Derived from backend `dashboard-response-schema.ts` and
 * `dashboard-misc-response.schemas.ts`.
 * NOT `.strict()`.
 */

/** `dashboardStatsResponseSchema` */
export const dashboardStatsContract = z
  .object({
    orgName: z.string(),
    orgSlug: z.string(),
    totalEmployees: z.number().int().nonnegative().nullable(),
    activeProjects: z.number().int().nonnegative().nullable(),
    presentToday: z.number().int().nonnegative().nullable(),
  })
  .strict();

/** `dashboardPersonalResponseSchema` */
export const personalDashboardContract = z.object({
  myTasks: z.array(
    z.object({
      id: z.number().int(),
      title: z.string(),
      status: z.string(),
      priority: z.string(),
      dueDate: z.null(),
      projectName: z.string().nullable(),
    }),
  ),
  timesheetStatus: z.object({
    submitted: z.boolean(),
    weekLabel: z.string(),
    hoursLogged: z.number(),
  }),
  upcomingEvents: z.array(
    z.object({
      id: z.number().int(),
      title: z.string(),
      startTime: z.string(),
      endTime: z.string(),
      type: z.string(),
    }),
  ),
  degraded: z.array(z.string()),
});

/** `announcementsListSchema` — array of announcements. */
export const announcementsListContract = z.array(
  z.object({
    id: z.number().int(),
    content: z.string(),
    isPinned: z.boolean(),
    expiresAt: z.string().nullable(),
    createdAt: z.string(),
    authorId: z.string(),
    authorName: z.string().nullable(),
    authorFirstName: z.string().nullable(),
    authorLastName: z.string().nullable(),
  }),
);

/** `announcementCreateSchema` — full announcement row. */
export const announcementContract = z.object({
  id: z.number().int(),
  orgId: z.string(),
  title: z.string(),
  content: z.string(),
  isPinned: z.boolean(),
  expiresAt: z.string().nullable(),
  status: z.string(),
  authorId: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

/** `announcementDeleteSchema` */
export const dashboardSuccessContract = z.object({ success: z.literal(true) });

/** `executiveDashboardSchema` */
export const executiveDashboardContract = z.object({
  headcount: z.number().int(),
  openRoles: z.number().int(),
  activeProjects: z.number().int(),
  mrr: z.number().optional(),
  pipelineValue: z.number().optional(),
  newLeadsThisWeek: z.number().int().optional(),
  conversionRate: z.number().int().optional(),
});

/** `leavesTodaySchema` */
export const leavesTodayContract = z.object({
  data: z.array(
    z.object({
      id: z.number().int(),
      startDate: z.string(),
      endDate: z.string(),
      leaveTypeId: z.number().int(),
      employeeName: z.string().nullable(),
      employeeDesignation: z.string().nullable(),
      employeeImage: z.string().nullable(),
    }),
  ),
  total: z.number().int(),
  hasMore: z.boolean(),
});

/** `myLeaveBalanceSchema` */
export const leaveBalanceContract = z.array(
  z.object({
    id: z.number().int(),
    balance: z.number(),
    year: z.number().int(),
    leaveTypeName: z.string().nullable(),
    daysPerYear: z.number().nullable(),
  }),
);

/** `pendingApprovalsSchema` */
export const pendingApprovalsContract = z.object({
  pendingLeaves: z.number().int(),
  pendingResignations: z.number().int(),
  total: z.number().int(),
});

/** `upcomingHolidaysSchema` */
export const upcomingHolidaysContract = z.array(
  z.object({
    id: z.number().int(),
    name: z.string(),
    date: z.string(),
    message: z.string().nullable(),
  }),
);

/** `myIssuesSchema` */
export const myIssuesContract = z.array(
  z.object({
    id: z.number().int(),
    title: z.string(),
    status: z.string().nullable(),
    type: z.string().nullable(),
    priority: z.string().nullable(),
    ticketNumber: z.string(),
    updatedAt: z.string(),
    projectName: z.string(),
    projectId: z.number().int().optional(),
    projectKey: z.string(),
    assignee: z
      .object({
        id: z.number().int(),
        firstName: z.string().nullable(),
        lastName: z.string().nullable(),
        image: z.string().nullable(),
      })
      .nullable(),
  }),
);

/** `activeSprintSchema` — nullable sprint summary. */
export const activeSprintContract = z
  .object({
    id: z.number().int(),
    name: z.string(),
    projectName: z.string(),
    projectId: z.number().int().optional(),
    progress: z.number().int(),
    daysRemaining: z.number().int(),
    totalTickets: z.number().int(),
    doneTickets: z.number().int(),
    inProgressTickets: z.number().int(),
    todoTickets: z.number().int(),
    totalPoints: z.number().int(),
    completedPoints: z.number().int(),
  })
  .nullable();

/** `recentProjectsSchema` */
export const recentProjectsContract = z.array(
  z.object({
    id: z.number().int(),
    name: z.string(),
    key: z.string(),
    manager: z
      .object({
        id: z.number().int(),
        user: z
          .object({
            id: z.string(),
            name: z.string().nullable(),
            firstName: z.string().nullable(),
            lastName: z.string().nullable(),
            image: z.string().nullable(),
          })
          .nullable(),
      })
      .nullable()
      .optional(),
  }),
);

/** `recentActivitySchema` */
export const recentActivityContract = z.array(
  z.object({
    id: z.number().int(),
    title: z.string(),
    status: z.string().nullable(),
    type: z.string().nullable(),
    priority: z.string().nullable(),
    ticketNumber: z.number().int().nullable(),
    updatedAt: z.string(),
    projectName: z.string(),
    projectId: z.number().int().optional(),
    projectKey: z.string(),
    assignee: z
      .object({
        id: z.number().int(),
        firstName: z.string().nullable(),
        lastName: z.string().nullable(),
        image: z.string().nullable(),
      })
      .nullable(),
  }),
);

/** `teamAttendanceSchema` */
export const teamAttendanceContract = z.array(
  z.object({
    userId: z.string(),
    name: z.string(),
    image: z.string().nullable(),
    checkIn: z.string().nullable(),
    checkOut: z.string().nullable(),
    isOnline: z.boolean(),
  }),
);

/** `birthdayEntrySchema` */
export const birthdaysContract = z.array(
  z.object({
    id: z.string(),
    name: z.string().nullable(),
    designation: z.string().nullable(),
    image: z.string().nullable(),
    type: z.enum(["birthday", "anniversary"]),
    date: z.string(),
    yearsCompleted: z.number().int().optional(),
  }),
);

/** `todayActivitiesSchema` */
export const todayActivitiesContract = z.array(
  z.object({
    type: z.string().nullable(),
    subject: z.string().nullable(),
  }),
);
