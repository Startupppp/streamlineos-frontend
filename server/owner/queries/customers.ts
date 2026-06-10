import "server-only";
import { sql, desc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  organizations,
  organizationMembers,
  users,
  platformSubscriptions,
  platformPayments,
} from "@/lib/db/schema";

export type CustomerSummary = {
  id: string;
  slug: string;
  name: string;
  createdAt: Date | null;
  userCount: number;
  plan: string | null;
  status: string;
  lifetimeInr: number;
};

export async function listCustomers(): Promise<CustomerSummary[]> {
  const rows = await db
    .select({
      id: organizations.id,
      slug: organizations.slug,
      name: organizations.name,
      createdAt: organizations.createdAt,
      userCount: sql<number>`coalesce((
        select count(*)::int from ${organizationMembers}
        where ${organizationMembers.orgId} = ${organizations.id}
      ), 0)`,
      plan: platformSubscriptions.plan,
      status: sql<string>`coalesce(${platformSubscriptions.status}, 'free')`,
      lifetimeInr: sql<number>`coalesce((
        select sum(${platformPayments.amount})::int / 100
        from ${platformPayments}
        where ${platformPayments.orgId} = ${organizations.id}
          and ${platformPayments.status} = 'captured'
      ), 0)`,
    })
    .from(organizations)
    .leftJoin(platformSubscriptions, eq(platformSubscriptions.orgId, organizations.id))
    .orderBy(desc(organizations.createdAt));

  return rows;
}

export async function getCustomerBySlug(slug: string) {
  const org = await db.query.organizations.findFirst({
    where: eq(organizations.slug, slug),
  });
  if (!org) return null;

  const [members, payments, subscription] = await Promise.all([
    db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        role: organizationMembers.role,
        joinedAt: organizationMembers.joinedAt,
      })
      .from(organizationMembers)
      .innerJoin(users, eq(users.id, organizationMembers.userId))
      .where(eq(organizationMembers.orgId, org.id))
      .orderBy(desc(organizationMembers.joinedAt))
      .limit(50),
    db.query.platformPayments.findMany({
      where: eq(platformPayments.orgId, org.id),
      orderBy: desc(platformPayments.createdAt),
      limit: 50,
    }),
    db.query.platformSubscriptions.findFirst({
      where: eq(platformSubscriptions.orgId, org.id),
    }),
  ]);

  return { org, members, payments, subscription: subscription ?? null };
}
