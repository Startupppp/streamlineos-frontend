"use server";

import { db } from "@/lib/db";
import { users, organizationMembers, organizations } from "@/lib/db/schema";
import { eq, sql, and } from "drizzle-orm";
import { logger } from "@/lib/logger";
import { sendCompanyAnnouncementEmail } from "@/lib/email";
import { notifyAllMembers } from "./create-notification";

export async function sendDailyNotifications() {
  const today = new Date();
  const month = today.getMonth() + 1;
  const day = today.getDate();

  let birthdayCount = 0;
  let leaveCount = 0;
  const anniversaryCount = 0;

  try {
    // Find all active users whose dateOfBirth matches today's month and day
    const birthdayUsers = await db
      .select({
        id: users.id,
        name: users.name,
        firstName: users.firstName,
        lastName: users.lastName,
        email: users.email,
        dateOfBirth: users.dateOfBirth,
      })
      .from(users)
      .where(
        and(
          eq(users.isActive, true),
          sql`EXTRACT(MONTH FROM ${users.dateOfBirth}::date) = ${month}`,
          sql`EXTRACT(DAY FROM ${users.dateOfBirth}::date) = ${day}`
        )
      );

    if (birthdayUsers.length === 0) {
      logger.info("No birthdays today");
      return { birthdayCount: 0, leaveCount: 0, anniversaryCount: 0 };
    }

    // Cache org members to avoid duplicate fetches when multiple birthdays in same org
    const orgMembersCache = new Map<string, { email: string; name: string | null }[]>();

    async function getOrgMembers(orgId: string) {
      if (orgMembersCache.has(orgId)) return orgMembersCache.get(orgId)!;
      const members = await db
        .select({ email: users.email, name: users.name })
        .from(organizationMembers)
        .innerJoin(users, eq(organizationMembers.userId, users.id))
        .where(and(eq(organizationMembers.orgId, orgId), eq(users.isActive, true)));
      orgMembersCache.set(orgId, members);
      return members;
    }

    for (const birthdayUser of birthdayUsers) {
      const displayName =
        birthdayUser.firstName && birthdayUser.lastName
          ? `${birthdayUser.firstName} ${birthdayUser.lastName}`
          : birthdayUser.name || birthdayUser.email;

      // Find which org(s) this user belongs to
      const memberships = await db
        .select({
          orgId: organizationMembers.orgId,
          orgName: organizations.name,
        })
        .from(organizationMembers)
        .innerJoin(
          organizations,
          eq(organizationMembers.orgId, organizations.id)
        )
        .where(eq(organizationMembers.userId, birthdayUser.id));

      for (const membership of memberships) {
        const subject = `Happy Birthday, ${displayName}!`;
        const message = `Today is ${displayName}'s birthday! Wish them a wonderful day!`;

        // Create in-app notifications for all org members
        try {
          await notifyAllMembers(membership.orgId, {
            type: "INFO",
            title: subject,
            message,
            metadata: {
              category: "birthday",
              birthdayUserId: birthdayUser.id,
            },
          });
        } catch (err) {
          logger.error("Failed to create birthday in-app notifications", {
            userId: birthdayUser.id,
            orgId: membership.orgId,
            error: err,
          });
        }

        // Send birthday announcement emails to all active org members
        try {
          const orgMembers = await getOrgMembers(membership.orgId);

          const emails = orgMembers
            .map((m) => m.email)
            .filter(Boolean) as string[];

          if (emails.length > 0) {
            const emailPromises = emails.map((email) =>
              sendCompanyAnnouncementEmail(
                email,
                subject,
                message,
                membership.orgName || "Vaivamm Capital"
              )
            );
            await Promise.allSettled(emailPromises);
          }
        } catch (err) {
          logger.error("Failed to send birthday emails", {
            userId: birthdayUser.id,
            orgId: membership.orgId,
            error: err,
          });
        }

        birthdayCount++;
      }
    }

    logger.info("Daily notifications processed", {
      birthdayCount,
      leaveCount,
      anniversaryCount,
    });
  } catch (error) {
    logger.error("Failed to process daily notifications", error);
    throw error;
  }

  return { birthdayCount, leaveCount, anniversaryCount };
}
