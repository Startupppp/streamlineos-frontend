"use server";

import { db } from "@/lib/db";
import { notifications, organizationMembers, users } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";

interface CreateNotificationInput {
  orgId: string;
  userId: string;
  type?: "INFO" | "SUCCESS" | "WARNING" | "ERROR";
  title: string;
  message: string;
  link?: string;
  metadata?: Record<string, unknown>;
}

export async function createNotification(input: CreateNotificationInput) {
  const [notification] = await db
    .insert(notifications)
    .values({
      orgId: input.orgId,
      userId: input.userId,
      type: input.type ?? "INFO",
      title: input.title,
      message: input.message,
      link: input.link,
      metadata: input.metadata,
    })
    .returning();

  return notification;
}

export async function notifyAllMembers(
  orgId: string,
  opts: {
    type?: "INFO" | "SUCCESS" | "WARNING" | "ERROR";
    title: string;
    message: string;
    link?: string;
    metadata?: Record<string, unknown>;
    excludeUserId?: string;
  }
) {
  const members = await db
    .select({ userId: organizationMembers.userId })
    .from(organizationMembers)
    .where(eq(organizationMembers.orgId, orgId));

  const targetMembers = opts.excludeUserId
    ? members.filter((m) => m.userId !== opts.excludeUserId)
    : members;

  if (targetMembers.length === 0) return;

  await db.insert(notifications).values(
    targetMembers.map((m) => ({
      orgId,
      userId: m.userId,
      type: opts.type ?? "INFO",
      title: opts.title,
      message: opts.message,
      link: opts.link,
      metadata: opts.metadata,
    }))
  );
}

export async function notifyByRoles(
  orgId: string,
  roles: string[],
  opts: {
    type?: "INFO" | "SUCCESS" | "WARNING" | "ERROR";
    title: string;
    message: string;
    link?: string;
    metadata?: Record<string, unknown>;
    excludeUserId?: string;
  }
) {
  const members = await db
    .select({ userId: organizationMembers.userId, role: organizationMembers.role })
    .from(organizationMembers)
    .where(eq(organizationMembers.orgId, orgId));

  const targetMembers = members.filter(
    (m) =>
      roles.includes(m.role) &&
      (!opts.excludeUserId || m.userId !== opts.excludeUserId)
  );

  if (targetMembers.length === 0) return;

  await db.insert(notifications).values(
    targetMembers.map((m) => ({
      orgId,
      userId: m.userId,
      type: opts.type ?? "INFO",
      title: opts.title,
      message: opts.message,
      link: opts.link,
      metadata: opts.metadata,
    }))
  );
}
