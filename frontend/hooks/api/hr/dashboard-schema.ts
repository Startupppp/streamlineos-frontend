import { z } from "zod";

export const hrDashboardMetricsContract = z.object({
  totalEmployees: z.number().int(),
  activeEmployees: z.number().int(),
  onLeaveToday: z.number().int(),
  pendingLeaveRequests: z.number().int(),
  openPositions: z.number().int(),
  monthlyHires: z.number().int(),
  upcomingBirthdays: z.array(
    z.object({
      id: z.string(),
      name: z.string().nullable(),
      firstName: z.string().nullable(),
      lastName: z.string().nullable(),
      image: z.string().nullable(),
      dateOfBirth: z.string().nullable(),
      daysUntil: z.number().int(),
    }),
  ),
});

export const hrLeaveCalendarItemContract = z.object({
  id: z.number().int(),
  userId: z.string(),
  userName: z.string(),
  userImage: z.string().nullable(),
  startDate: z.string(),
  endDate: z.string(),
  leaveType: z.string(),
  status: z.string(),
});

export const hrLeaveCalendarContract = z.array(hrLeaveCalendarItemContract);

export const hrDashboardOnboardingStatusContract = z.object({
  inProgress: z.number().int(),
  completed: z.number().int(),
  total: z.number().int(),
  completionPct: z.number().int(),
  newHires: z.array(
    z.object({
      userId: z.string(),
      name: z.string(),
      completedTasks: z.number().int(),
      totalTasks: z.number().int(),
      pct: z.number().int(),
    }),
  ),
});
