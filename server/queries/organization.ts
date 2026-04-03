"server-only";

import { db } from "@/lib/db";
import {
  organizations,
  organizationMembers,
  invitations,
  users,
} from "@/lib/db/schema";
import { eq, and, desc, gt, isNull, count, ilike, or } from "drizzle-orm";

export async function getOrgSettings(orgId: string) {
  return db.query.organizations.findFirst({
    where: eq(organizations.id, orgId),
  });
}

export async function getOrgMembers(
  orgId: string,
  page = 1,
  limit = 20,
  search?: string
) {
  const offset = (page - 1) * limit;

  const baseConditions = [eq(organizationMembers.orgId, orgId)];

  const searchConditions = search
    ? [
        ...baseConditions,
        or(ilike(users.name, `%${search}%`), ilike(users.email, `%${search}%`)),
      ]
    : baseConditions;

  const [dataResult, countResult] = await Promise.all([
    db
      .select({
        userId: organizationMembers.userId,
        role: organizationMembers.role,
        joinedAt: organizationMembers.joinedAt,
        name: users.name,
        email: users.email,
        image: users.image,
      })
      .from(organizationMembers)
      .innerJoin(users, eq(organizationMembers.userId, users.id))
      .where(and(...searchConditions))
      .orderBy(users.name)
      .limit(limit)
      .offset(offset),
    db
      .select({ total: count() })
      .from(organizationMembers)
      .innerJoin(users, eq(organizationMembers.userId, users.id))
      .where(and(...searchConditions)),
  ]);

  const total = countResult[0]?.total ?? 0;

  return {
    data: dataResult,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

export async function getInvitations(orgId: string) {
  const orgInvitations = await db.query.invitations.findMany({
    where: and(
      eq(invitations.orgId, orgId),
      isNull(invitations.acceptedAt),
      gt(invitations.expiresAt, new Date())
    ),
    orderBy: [desc(invitations.createdAt)],
  });

  return orgInvitations.map((inv) => ({
    id: inv.id,
    email: inv.email,
    role: inv.role,
    expiresAt: inv.expiresAt,
    createdAt: inv.createdAt,
  }));
}

export async function getUserProfile(userId: string) {
  return db.query.users.findFirst({
    where: eq(users.id, userId),
    columns: {
      id: true,
      name: true,
      firstName: true,
      lastName: true,
      email: true,
      image: true,
      role: true,
      isActive: true,
      emailVerified: true,
      createdAt: true,
    },
  });
}
