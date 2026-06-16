"server-only";

import { db } from "@/lib/db";
import { deals, dealActivities } from "@/lib/db/schema";
import { eq, and, desc, ne, sum, count } from "drizzle-orm";
import type { DealFilters } from "@/types/crm";

export async function getDeals(
  orgId: string,
  filters?: DealFilters & { role?: string; userId?: string }
) {
  const f = [eq(deals.orgId, orgId)];
  if (filters?.role === "SALES" && filters.userId) {
    f.push(eq(deals.assignedToId, filters.userId));
  }
  if (filters?.stage) f.push(eq(deals.stage, filters.stage));
  if (filters?.assignedToId) f.push(eq(deals.assignedToId, filters.assignedToId));

  return db.query.deals.findMany({
    where: and(...f),
    with: {
      assignedTo: { columns: { id: true, name: true, image: true } },
      lead: { columns: { id: true, name: true } },
      client: { columns: { id: true, name: true } },
    },
    orderBy: [desc(deals.updatedAt)],
    limit: filters?.limit ?? 50,
    offset: filters?.offset ?? 0,
  });
}

export async function getDealStats(orgId: string) {
  const [activeRow, wonRow] = await Promise.all([
    db
      .select({ cnt: count(), total: sum(deals.value) })
      .from(deals)
      .where(and(eq(deals.orgId, orgId), ne(deals.stage, "WON"), ne(deals.stage, "LOST"))),
    db
      .select({ total: sum(deals.value) })
      .from(deals)
      .where(and(eq(deals.orgId, orgId), eq(deals.stage, "WON"))),
  ]);
  return {
    active: activeRow[0]?.cnt ?? 0,
    pipelineValue: Number(activeRow[0]?.total ?? 0),
    wonValue: Number(wonRow[0]?.total ?? 0),
  };
}

export async function getDeal(orgId: string, id: number) {
  return db.query.deals.findFirst({
    where: and(eq(deals.id, id), eq(deals.orgId, orgId)),
    with: {
      assignedTo: { columns: { id: true, name: true, image: true } },
      lead: { columns: { id: true, name: true, email: true, phone: true } },
      client: { columns: { id: true, name: true } },
    },
  });
}

export async function getDealActivities(orgId: string, dealId: number, limit = 50) {
  return db.query.dealActivities.findMany({
    where: and(eq(dealActivities.dealId, dealId), eq(dealActivities.orgId, orgId)),
    with: { user: { columns: { id: true, name: true, image: true } } },
    orderBy: [desc(dealActivities.createdAt)],
    limit,
  });
}
