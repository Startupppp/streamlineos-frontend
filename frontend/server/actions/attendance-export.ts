"use server";

import { db } from "@/lib/db";
import { getAuthenticatedMember } from "@/lib/auth-helpers";
import { isAuthError } from "@/lib/auth-types";
import { logger } from "@/lib/logger";
import { attendance, organizationMembers, departments } from "@/lib/db/schema";
import { eq, and, gte, lte, inArray } from "drizzle-orm";
import { organizations } from "@/lib/db/schema/auth";
import { sendEmail } from "@/lib/email/sender";
import { getWeeklyAttendanceReportTemplate } from "@/lib/email-templates/reports";
import { format } from "date-fns";
import { formatDateOnly } from "@/lib/date-utils";
import { z } from "zod";

const emailReportSchema = z.object({
  to: z.array(z.string().email()).min(1, "At least one To recipient is required"),
  cc: z.array(z.string().email()).default([]),
  bcc: z.array(z.string().email()).default([]),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});

export type AttendanceEmailReportInput = z.infer<typeof emailReportSchema>;

export async function emailAttendanceReport(
  input: AttendanceEmailReportInput
): Promise<{ success: boolean; error?: string }> {
  const authResult = await getAuthenticatedMember();
  if (isAuthError(authResult)) return { success: false, error: authResult.error };

  const { isAdmin, orgId } = authResult;
  if (!isAdmin) return { success: false, error: "Only HR and CEO can send attendance reports" };

  const parsed = emailReportSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };

  const { to, cc, bcc, startDate, endDate } = parsed.data;

  const allRecipients = [...to, ...cc, ...bcc];
  const uniqueSet = new Set(allRecipients.map((e) => e.toLowerCase()));
  if (uniqueSet.size < allRecipients.length) {
    return { success: false, error: "Duplicate email addresses found across To, CC, and BCC fields" };
  }

  const today = new Date();
  const resolvedStart = startDate ?? formatDateOnly(new Date(today.getFullYear(), today.getMonth(), 1));
  const resolvedEnd = endDate ?? formatDateOnly(today);

  if (resolvedStart > resolvedEnd) {
    return { success: false, error: "Start date must be before or equal to end date" };
  }

  const resolvedEndDate = new Date(`${resolvedEnd}T23:59:59`);
  if (resolvedEndDate > today) {
    return { success: false, error: "End date cannot be in the future" };
  }

  try {
    const members = await db.query.organizationMembers.findMany({
      where: eq(organizationMembers.orgId, orgId),
      with: { user: true },
    });

    const org = await db.query.organizations.findFirst({ where: eq(organizations.id, orgId) });
    const orgName = org?.name ?? "Organization";

    const activeMembers = members.filter((m) => m.user?.isActive !== false);

    const deptIds = [...new Set(activeMembers.map((m) => m.user?.departmentId).filter(Boolean))] as number[];
    const deptMap = new Map<number, string>();
    if (deptIds.length > 0) {
      const deptRows = await db
        .select({ id: departments.id, name: departments.name })
        .from(departments)
        .where(inArray(departments.id, deptIds));
      for (const d of deptRows) deptMap.set(d.id, d.name);
    }

    const allRecords = await db.query.attendance.findMany({
      where: and(
        eq(attendance.orgId, orgId),
        gte(attendance.date, resolvedStart),
        lte(attendance.date, resolvedEnd)
      ),
    });

    const recordsByUser = new Map<string, typeof allRecords>();
    for (const record of allRecords) {
      const existing = recordsByUser.get(record.userId) ?? [];
      existing.push(record);
      recordsByUser.set(record.userId, existing);
    }

    const rows: {
      department: string;
      name: string;
      totalHours: string;
      daysPresent: number;
      overtimeDays: number;
      autoCheckoutDays: number;
    }[] = [];

    for (const member of activeMembers) {
      const user = member.user;
      if (!user) continue;
      const records = recordsByUser.get(user.id) ?? [];

      let totalHours = 0;
      let autoCheckoutDays = 0;
      let overtimeDays = 0;
      const uniqueDates = new Set<string>();

      for (const record of records) {
        totalHours += Number(record.workHours ?? 0);
        if (record.autoCheckedOut) autoCheckoutDays++;
        if (record.isOvertime) overtimeDays++;
        uniqueDates.add(record.date);
      }

      if (uniqueDates.size === 0) continue;

      const employeeName =
        user.firstName && user.lastName
          ? `${user.firstName} ${user.lastName}`
          : user.name ?? user.email ?? "Unknown";

      const department = user.departmentId ? (deptMap.get(user.departmentId) ?? "—") : "—";

      rows.push({
        department,
        name: employeeName,
        totalHours: totalHours.toFixed(1),
        daysPresent: uniqueDates.size,
        overtimeDays,
        autoCheckoutDays,
      });
    }

    if (rows.length === 0) {
      return { success: false, error: "No attendance data found for the selected period" };
    }

    rows.sort((a, b) => {
      if (a.department < b.department) return -1;
      if (a.department > b.department) return 1;
      return a.name.localeCompare(b.name);
    });

    const periodLabel = `${format(new Date(`${resolvedStart}T00:00:00`), "MMM dd")} - ${format(new Date(`${resolvedEnd}T00:00:00`), "MMM dd, yyyy")}`;
    const subject = `Attendance Report - ${periodLabel}`;
    const html = getWeeklyAttendanceReportTemplate(periodLabel, orgName, rows);

    await sendEmail({ to, cc: cc.length ? cc : undefined, bcc: bcc.length ? bcc : undefined, subject, html });

    logger.info("Attendance report emailed", { orgId, to, cc, bcc, period: periodLabel });
    return { success: true };
  } catch (error) {
    logger.error("Failed to send attendance report email", { error });
    return { success: false, error: "Failed to send attendance report email" };
  }
}
