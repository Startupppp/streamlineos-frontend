"use server";

import { db } from "@/lib/db";
import { logger } from "@/lib/logger";
import { holidays, organizationMembers, users } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { sendBulkHolidayAnnouncement } from "@/lib/email";

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

    const orgMembersCache = new Map<string, { userId: string; email: string | null; name: string | null }[]>();

    for (const holiday of upcomingHolidays) {
      let members = orgMembersCache.get(holiday.orgId);
      if (!members) {
        members = await db
          .select({
            userId: organizationMembers.userId,
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
        orgMembersCache.set(holiday.orgId, members);
      }

      const emails = members
        .map((m) => m.email)
        .filter((email): email is string => !!email);

      if (emails.length > 0) {
        await sendBulkHolidayAnnouncement(
          emails,
          holiday.name,
          tomorrow.toLocaleDateString("en-US", {
            weekday: "long",
            year: "numeric",
            month: "long",
            day: "numeric",
          }),
          holiday.message || undefined
        );
      }

      await db
        .update(holidays)
        .set({ notificationSent: true })
        .where(eq(holidays.id, holiday.id));
    }

    return { success: true, count: upcomingHolidays.length };
  } catch (error) {
    logger.error("Failed to send holiday notifications", error);
    return { error: "Failed to send notifications" };
  }
}
