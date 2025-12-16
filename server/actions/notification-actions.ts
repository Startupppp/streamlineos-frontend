"use server";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { notifications, organizationMembers, organizations } from "@/lib/db/schema";
import { eq, and, sql } from "drizzle-orm";

async function getOrgId(userId: string) {
    const userMemberships = await db.query.organizationMembers.findMany({
        where: eq(organizationMembers.userId, userId),
        limit: 1,
    });
    let orgId = userMemberships[0]?.orgId || null;
    
    // Fallback logic matching tRPC
    if (!orgId) {
         const anyOrg = await db.query.organizations.findFirst();
         if (anyOrg) orgId = anyOrg.id;
    }
    return orgId;
}

export async function getUnreadOnboardingCount() {
  const session = await auth();
  if (!session?.user?.id) return 0;
  
  const orgId = await getOrgId(session.user.id);
  if (!orgId) return 0;

  const result = await db
    .select({ count: sql<number>`count(*)` })
    .from(notifications)
    .where(
      and(
        eq(notifications.userId, session.user.id),
        eq(notifications.orgId, orgId),
        eq(notifications.isRead, false),
        eq(notifications.title, "New Employee Onboarded")
      )
    );

  return Number(result[0]?.count || 0);
}

export async function markOnboardingNotificationsAsRead() {
    const session = await auth();
    if (!session?.user?.id) return;
    
    const orgId = await getOrgId(session.user.id);
    if (!orgId) return;

    await db.update(notifications)
        .set({ isRead: true })
        .where(
            and(
                eq(notifications.userId, session.user.id),
                eq(notifications.orgId, orgId),
                eq(notifications.isRead, false),
                eq(notifications.title, "New Employee Onboarded")
            )
        );
}
