import "server-only";

import { db } from "@/lib/db";
import { clientAccounts, clientAccountActivities } from "@/lib/db/schema";
import { eq, and, desc, sql, count, or, inArray, isNull } from "drizzle-orm";
import type { ClientAccountFilters } from "@/types/crm";
import { ROLES } from "@/lib/constants/roles";

export async function getClientAccounts(
  orgId: string,
  filters?: ClientAccountFilters & { role?: string; userId?: string }
) {
  const f: ReturnType<typeof eq>[] = [eq(clientAccounts.orgId, orgId)];
  if (filters?.role === ROLES.SALES && filters.userId) {
    f.push(eq(clientAccounts.salesRepId, filters.userId));
  }
  if (filters?.role === ROLES.CUSTOMER_SUPPORT && filters.userId) {
    f.push(eq(clientAccounts.assignedCrmId, filters.userId));
  }
  if (filters?.status) f.push(eq(clientAccounts.status, filters.status));
  if (filters?.search) {
    f.push(
      or(
        sql`${clientAccounts.clientName} ILIKE ${"%" + filters.search + "%"}`,
        sql`${clientAccounts.clientEmail} ILIKE ${"%" + filters.search + "%"}`,
        sql`${clientAccounts.clientPhone} ILIKE ${"%" + filters.search + "%"}`
      )!
    );
  }

  const page = filters?.page ?? 1;
  const limit = filters?.limit ?? 25;
  const offset = (page - 1) * limit;

  const [items, [countResult]] = await Promise.all([
    db.query.clientAccounts.findMany({
      where: and(...f),
      orderBy: [desc(clientAccounts.createdAt)],
      limit,
      offset,
      with: {
        salesRep: { columns: { id: true, name: true, image: true } },
        assignedCrm: { columns: { id: true, name: true, image: true } },
      },
    }),
    db.select({ count: count() }).from(clientAccounts).where(and(...f)),
  ]);

  return {
    accounts: items,
    totalCount: countResult?.count ?? 0,
    page,
    totalPages: Math.ceil((countResult?.count ?? 0) / limit),
  };
}


export async function backfillConvertedLeadsToClientAccounts(
  orgId: string,
  fallbackSalesRepId: string
) {
  await db.execute(sql`
    INSERT INTO client_accounts (
      org_id, lead_id, sales_rep_id,
      client_name, client_email, client_phone, client_whatsapp,
      estimated_investment, status, converted_at, created_at, updated_at
    )
    SELECT
      l.org_id,
      l.id,
      COALESCE(l.assigned_to_id, ${fallbackSalesRepId}),
      l.name,
      l.email,
      l.phone,
      l.whatsapp_number,
      COALESCE(l.potential_value, l.investment_interest)::numeric(15,2),
      'ACCOUNT_OPENING'::text,
      COALESCE(l.converted_at, NOW()),
      NOW(),
      NOW()
    FROM leads l
    WHERE l.org_id = ${orgId}
      AND l.status = 'CONVERTED'
      AND l.deleted_at IS NULL
      AND NOT EXISTS (
        SELECT 1 FROM client_accounts ca
        WHERE ca.org_id = l.org_id AND ca.lead_id = l.id
      )
  `);
}


export async function backfillCrmAssignments(orgId: string) {
  const { organizationMembers } = await import("@/lib/db/schema");

  const csMembers = await db
    .select({ userId: organizationMembers.userId })
    .from(organizationMembers)
    .where(and(eq(organizationMembers.orgId, orgId), eq(organizationMembers.role, "CUSTOMER_SUPPORT")));

  if (csMembers.length === 0) return;

  const memberIds = csMembers.map((m) => m.userId);

  const [countRows, unassigned] = await Promise.all([
    db
      .select({ userId: clientAccounts.assignedCrmId, activeCount: count() })
      .from(clientAccounts)
      .where(and(
        eq(clientAccounts.orgId, orgId),
        inArray(clientAccounts.assignedCrmId, memberIds),
        sql`${clientAccounts.status} != 'INVESTED'`,
      ))
      .groupBy(clientAccounts.assignedCrmId),
    db
      .select({ id: clientAccounts.id })
      .from(clientAccounts)
      .where(and(eq(clientAccounts.orgId, orgId), isNull(clientAccounts.assignedCrmId)))
      .orderBy(desc(clientAccounts.createdAt)),
  ]);

  if (unassigned.length === 0) return;

  const counts: Record<string, number> = Object.fromEntries(memberIds.map((id) => [id, 0]));
  for (const row of countRows) {
    if (row.userId) counts[row.userId] = row.activeCount;
  }

  const assignments: Record<string, number[]> = {};
  for (const account of unassigned) {
    let minCount = Infinity;
    let assignee: string | null = null;
    for (const id of memberIds) {
      if ((counts[id] ?? 0) < minCount) {
        minCount = counts[id] ?? 0;
        assignee = id;
      }
    }
    if (assignee) {
      (assignments[assignee] ??= []).push(account.id);
      counts[assignee] = (counts[assignee] ?? 0) + 1;
    }
  }

  const now = new Date();
  await Promise.all(
    Object.entries(assignments).map(([assigneeId, ids]) =>
      db
        .update(clientAccounts)
        .set({ assignedCrmId: assigneeId, updatedAt: now })
        .where(and(eq(clientAccounts.orgId, orgId), inArray(clientAccounts.id, ids))),
    ),
  );
}


export async function getCrmAssignmentStats(orgId: string) {
  const { organizationMembers, users } = await import("@/lib/db/schema");

  const csMembers = await db
    .select({
      userId: organizationMembers.userId,
      name: users.name,
      image: users.image,
    })
    .from(organizationMembers)
    .innerJoin(users, eq(users.id, organizationMembers.userId))
    .where(and(
      eq(organizationMembers.orgId, orgId),
      eq(organizationMembers.role, "CUSTOMER_SUPPORT"),
    ));

  if (csMembers.length === 0) {
    return { members: [], unassignedCount: 0 };
  }

  const memberIds = csMembers.map((m) => m.userId);

  const [countRows, [unassignedResult]] = await Promise.all([
    db
      .select({
        userId: clientAccounts.assignedCrmId,
        totalCount: count(),
        activeCount: sql<number>`count(*) FILTER (WHERE ${clientAccounts.status} != 'INVESTED')`,
      })
      .from(clientAccounts)
      .where(and(eq(clientAccounts.orgId, orgId), inArray(clientAccounts.assignedCrmId, memberIds)))
      .groupBy(clientAccounts.assignedCrmId),
    db
      .select({ count: count() })
      .from(clientAccounts)
      .where(and(eq(clientAccounts.orgId, orgId), isNull(clientAccounts.assignedCrmId))),
  ]);

  const countMap = new Map(countRows.map((r) => [r.userId, r]));

  return {
    members: csMembers.map((m) => ({
      userId: m.userId,
      name: m.name,
      image: m.image,
      activeCount: Number(countMap.get(m.userId)?.activeCount ?? 0),
      totalCount: countMap.get(m.userId)?.totalCount ?? 0,
    })),
    unassignedCount: unassignedResult?.count ?? 0,
  };
}

export async function getClientAccount(orgId: string, id: number) {
  const account = await db.query.clientAccounts.findFirst({
    where: and(eq(clientAccounts.id, id), eq(clientAccounts.orgId, orgId)),
    with: {
      salesRep: { columns: { id: true, name: true, image: true, email: true } },
      assignedCrm: {
        columns: { id: true, name: true, image: true, email: true },
      },
      lead: { columns: { id: true, name: true, source: true, priority: true } },
    },
  });

  if (!account) return null;

  const activities = await db.query.clientAccountActivities.findMany({
    where: eq(clientAccountActivities.clientAccountId, id),
    orderBy: [desc(clientAccountActivities.createdAt)],
    with: { user: { columns: { id: true, name: true, image: true } } },
  });

  return { ...account, activities };
}

export async function getClientActivities(orgId: string, clientAccountId: number) {
  return db.query.clientAccountActivities.findMany({
    where: eq(clientAccountActivities.clientAccountId, clientAccountId),
    orderBy: [desc(clientAccountActivities.createdAt)],
    with: { user: { columns: { id: true, name: true, image: true } } },
  });
}
