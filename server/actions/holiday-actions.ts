"use server";

import { db } from "@/lib/db";
import { logger } from "@/lib/logger";
import { holidays, organizationMembers, users, organizations } from "@/lib/db/schema";
import { eq, and, gte, lte } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { sendBulkHolidayAnnouncement } from "@/lib/email";

export async function addHoliday(data: {
  name: string;
  date: Date;
  message?: string;
}) {
  const session = await auth();
  if (!session?.user?.id) return { error: "Unauthorized" };
  const member = await db.query.organizationMembers.findFirst({
    where: eq(organizationMembers.userId, session.user.id),
  });

  if (!member || (member.role !== "ADMIN" && member.role !== "OWNER")) {
    return { error: "Permission denied" };
  }

  try {
    await db.insert(holidays).values({
      orgId: member.orgId,
      name: data.name,
      date: data.date.toISOString().split('T')[0],
      message: data.message,
      notificationSent: false,
    });

    revalidatePath("/settings");
    return { success: true };
  } catch (e) {
    return { error: "Failed to add holiday" };
  }
}

export async function getHolidays() {
  const session = await auth();
  if (!session?.user?.id) return [];

  const member = await db.query.organizationMembers.findFirst({
    where: eq(organizationMembers.userId, session.user.id),
  });

  if (!member) return [];

  const currentYear = new Date().getFullYear();
  const startDate = `${currentYear}-01-01`;
  const endDate = `${currentYear}-12-31`;

  return await db.query.holidays.findMany({
    where: and(
      eq(holidays.orgId, member.orgId),
      gte(holidays.date, startDate),
      lte(holidays.date, endDate)
    ),
    orderBy: (holidays, { asc }) => [asc(holidays.date)],
  });
}

export async function deleteHoliday(holidayId: number) {
  const session = await auth();
  if (!session?.user?.id) return { error: "Unauthorized" };

  const member = await db.query.organizationMembers.findFirst({
    where: eq(organizationMembers.userId, session.user.id),
  });

  if (!member || (member.role !== "ADMIN" && member.role !== "OWNER")) {
    return { error: "Permission denied" };
  }

  try {
    await db.delete(holidays).where(eq(holidays.id, holidayId));
    revalidatePath("/settings");
    return { success: true };
  } catch (e) {
    return { error: "Failed to delete holiday" };
  }
}
export async function sendHolidayNotifications() {
  try {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowDate = tomorrow.toISOString().split('T')[0];
    const upcomingHolidays = await db.query.holidays.findMany({
      where: and(
        eq(holidays.date, tomorrowDate),
        eq(holidays.notificationSent, false)
      ),
    });
    for (const holiday of upcomingHolidays) {
      const members = await db
        .select({
          email: users.email,
          name: users.name,
        })
        .from(organizationMembers)
        .innerJoin(users, eq(organizationMembers.userId, users.id))
        .where(
          and(
            eq(organizationMembers.orgId, holiday.orgId),
            eq(users.isActive, true)
          )
        );

      const emails = members
        .map(m => m.email)
        .filter((email): email is string => !!email);

      if (emails.length > 0) {
        await sendBulkHolidayAnnouncement(
          emails,
          holiday.name,
          tomorrow.toLocaleDateString('en-US', { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
          }),
          holiday.message || undefined
        );
        await db
          .update(holidays)
          .set({ notificationSent: true })
          .where(eq(holidays.id, holiday.id));
      }
    }

    return { success: true, count: upcomingHolidays.length };
  } catch (error) {
    logger.error("Failed to send holiday notifications", error);
    return { error: "Failed to send notifications" };
  }
}

/**
 * Bulk import holidays for the year
 * Useful for importing all festival dates at once
 */
export async function bulkAddHolidays(holidayList: Array<{
  name: string;
  date: string;
  message?: string;
}>) {
  const session = await auth();
  if (!session?.user?.id) return { error: "Unauthorized" };

  const member = await db.query.organizationMembers.findFirst({
    where: eq(organizationMembers.userId, session.user.id),
  });

  if (!member || (member.role !== "ADMIN" && member.role !== "OWNER")) {
    return { error: "Permission denied" };
  }

  try {
    const holidayRecords = holidayList.map(h => ({
      orgId: member.orgId,
      name: h.name,
      date: h.date,
      message: h.message,
      notificationSent: false,
    }));

    await db.insert(holidays).values(holidayRecords);

    revalidatePath("/settings");
    return { success: true, count: holidayList.length };
  } catch {
    return { error: "Failed to import holidays" };
  }
}

