"server-only";

import { db } from "@/lib/db";
import { notifications } from "@/lib/db/schema";
import { eq, and, desc, sql } from "drizzle-orm";

export async function getNotifications(
  userId: string,
  orgId: string,
  unreadOnly = false,
  limit = 20
) {
  const filters = [
    eq(notifications.orgId, orgId),
    eq(notifications.userId, userId),
  ];
  if (unreadOnly) {
    filters.push(eq(notifications.isRead, false));
  }

  return db.query.notifications.findMany({
    where: and(...filters),
    orderBy: [desc(notifications.createdAt)],
    limit,
  });
}

export async function getUnreadCount(userId: string, orgId: string) {
  const [result] = await db
    .select({ count: sql<number>`count(*)` })
    .from(notifications)
    .where(
      and(
        eq(notifications.orgId, orgId),
        eq(notifications.userId, userId),
        eq(notifications.isRead, false)
      )
    );
  return { count: Number(result?.count || 0) };
}
