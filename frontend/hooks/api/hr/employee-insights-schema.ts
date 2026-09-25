import { z } from "zod";

export const employeeStatsContract = z.object({
  leaves: z.object({
    total: z.number().int(),
    approved: z.number().int(),
    pending: z.number().int(),
    rejected: z.number().int(),
    byType: z.record(z.string(), z.number().int()),
  }),
  attendance: z
    .object({
      daysPresent: z.number().int(),
      daysAbsent: z.number().int(),
      daysLate: z.number().int(),
      totalHours: z.string(),
      avgHoursPerDay: z.string(),
    })
    .nullable(),
});

export const employeeProjectsContract = z.array(
  z.object({
    // projects.id and tickets.{id,project_id,ticket_number} are integer columns.
    id: z.number(),
    name: z.string(),
    key: z.string(),
    status: z.string(),
    role: z.string(),
  }),
);

export const employeeTicketsContract = z.object({
  data: z.array(
    z.object({
      id: z.number(),
      title: z.string(),
      status: z.string(),
      priority: z.string(),
      projectId: z.number(),
      ticketNumber: z.number(),
    }),
  ),
});

export const availabilityListContract = z.array(
  z.object({
    userId: z.string(),
    status: z.enum(["ON_LEAVE", "HALF_DAY", "AVAILABLE"]),
    leaveType: z.string().optional(),
    startDate: z.string().optional(),
    endDate: z.string().optional(),
  }),
);

export const findExpertContract = z.array(
  z.object({
    userId: z.string(),
    name: z.string().nullable(),
    image: z.string().nullable(),
    designation: z.string().nullable(),
    department: z.string().nullable(),
    role: z.string(),
    skills: z.array(z.object({ name: z.string(), level: z.number().int() })),
    matchedSkill: z.string(),
    matchedLevel: z.number().int(),
  }),
);

export const skillsMatrixContract = z.object({
  employees: z.array(
    z.object({
      userId: z.string(),
      name: z.string().nullable(),
      image: z.string().nullable(),
      skills: z.record(z.string(), z.number().int()),
    }),
  ),
  skills: z.array(z.string()),
  pageInfo: z.object({
    limit: z.number().int(),
    hasMore: z.boolean(),
    nextCursor: z.string().nullable(),
  }),
});

export const reportsToMeContract = z.array(
  z.object({
    id: z.string(),
    name: z.string().nullable(),
    image: z.string().nullable(),
    email: z.string().nullable(),
    designation: z.string().nullable(),
  }),
);

export const managerScorecardContract = z.object({
  managerId: z.string(),
  teamSize: z.number().int(),
  avgPerformanceRating: z.number().nullable(),
  teamAttendanceRate: z.number().int().nullable(),
  pendingLeaveRequests: z.number().int(),
  directReports: z.array(
    z.object({
      id: z.string(),
      name: z.string().nullable(),
      image: z.string().nullable(),
      designation: z.string().nullable(),
      avgRating: z.number().nullable(),
    }),
  ),
});
