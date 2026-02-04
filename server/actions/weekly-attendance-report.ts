"use server";

import { db } from "@/lib/db";
import { attendance, organizationMembers } from "@/lib/db/schema";
import { eq, and, gte, lte } from "drizzle-orm";
import { sendWeeklyAttendanceReportEmail } from "@/lib/email";
import { format, subDays, startOfWeek } from "date-fns";
import { formatDateOnly } from "@/lib/date-utils";

export async function generateAndSendWeeklyReport() {
  // Calculate last week's date range (Mon–Sun)
  const today = new Date();
  const lastMonday = startOfWeek(subDays(today, 7), { weekStartsOn: 1 });
  const lastSunday = new Date(lastMonday);
  lastSunday.setDate(lastMonday.getDate() + 6);

  const startDate = formatDateOnly(lastMonday);
  const endDate = formatDateOnly(lastSunday);
  const weekRange = `${format(lastMonday, "MMM dd")} - ${format(lastSunday, "MMM dd, yyyy")}`;

  // Get all organizations
  const allOrgs = await db.query.organizations.findMany();

  let totalReportsSent = 0;

  for (const org of allOrgs) {
    // Get all org members (for attendance rows)
    const members = await db.query.organizationMembers.findMany({
      where: eq(organizationMembers.orgId, org.id),
      with: {
        user: true,
      },
    });

    const activeMembers = members.filter((m) => m.user?.isActive !== false);
    if (activeMembers.length === 0) continue;

    // Recipients: org members with role OWNER or ADMIN (each gets the report)
    const ownerAndAdminMembers = members.filter(
      (m) => m.role === "OWNER" || m.role === "ADMIN"
    );
    const recipientEmails = [
      ...new Set(
        ownerAndAdminMembers
          .map((m) => m.user?.email)
          .filter((email): email is string => !!email)
      ),
    ];

    if (recipientEmails.length === 0) continue;

    const rows: {
      name: string;
      totalHours: string;
      autoCheckoutDays: number;
      overtimeDays: number;
      daysPresent: number;
    }[] = [];

    for (const member of activeMembers) {
      const user = member.user;
      if (!user) continue;

      // Get attendance records for the week
      const records = await db.query.attendance.findMany({
        where: and(
          eq(attendance.userId, user.id),
          eq(attendance.orgId, org.id),
          gte(attendance.date, startDate),
          lte(attendance.date, endDate)
        ),
      });

      let totalHours = 0;
      let autoCheckoutDays = 0;
      let overtimeDays = 0;
      const uniqueDates = new Set<string>();

      for (const record of records) {
        totalHours += Number(record.workHours || 0);
        if (record.autoCheckedOut) autoCheckoutDays++;
        if (record.isOvertime) overtimeDays++;
        uniqueDates.add(record.date);
      }

      const employeeName =
        user.firstName && user.lastName
          ? `${user.firstName} ${user.lastName}`
          : user.name || user.email;

      rows.push({
        name: employeeName,
        totalHours: totalHours.toFixed(1),
        autoCheckoutDays,
        overtimeDays,
        daysPresent: uniqueDates.size,
      });
    }

    if (rows.length === 0) continue;

    try {
      await sendWeeklyAttendanceReportEmail(
        weekRange,
        org.name,
        rows,
        recipientEmails
      );
      totalReportsSent++;
    } catch (error) {
      console.error(`Failed to send weekly report for org ${org.id}:`, error);
    }
  }

  return {
    success: true,
    message: `Sent ${totalReportsSent} weekly attendance reports`,
    count: totalReportsSent,
  };
}
