"server-only";

import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { incentives, incentiveConfig } from "@/lib/db/schema/crm";
import { eq, and, desc, gte, sql } from "drizzle-orm";
import type { Incentive, IncentivesResult, IncentiveStats, IncentiveConfig } from "@/types/hr";

export async function getIncentives(
  orgId: string,
  params?: { status?: string; page?: number; limit?: number }
): Promise<IncentivesResult> {
  const page = params?.page ?? 1;
  const limit = params?.limit ?? 20;
  const offset = (page - 1) * limit;

  const conditions = [eq(incentives.orgId, orgId)];
  if (params?.status) {
    conditions.push(eq(incentives.status, params.status as "PENDING" | "APPROVED" | "REJECTED" | "ADDED_TO_PAYROLL"));
  }

  const [countResult] = await db
    .select({ count: sql<number>`count(*)` })
    .from(incentives)
    .where(and(...conditions));

  const total = Number(countResult?.count || 0);

  const rows = await db
    .select({
      id: incentives.id,
      orgId: incentives.orgId,
      salesRepId: incentives.salesRepId,
      clientAccountId: incentives.clientAccountId,
      investmentAmount: incentives.investmentAmount,
      incentiveRate: incentives.incentiveRate,
      calculatedAmount: incentives.calculatedAmount,
      approvedAmount: incentives.approvedAmount,
      status: incentives.status,
      notes: incentives.notes,
      createdAt: incentives.createdAt,
      salesRepName: users.name,
      salesRepImage: users.image,
    })
    .from(incentives)
    .innerJoin(users, eq(incentives.salesRepId, users.id))
    .where(and(...conditions))
    .orderBy(desc(incentives.createdAt))
    .limit(limit)
    .offset(offset);

  return {
    incentives: rows.map((r) => ({
      id: r.id,
      orgId: r.orgId,
      salesRepId: r.salesRepId,
      clientAccountId: r.clientAccountId,
      investmentAmount: r.investmentAmount,
      incentiveRate: r.incentiveRate,
      calculatedAmount: r.calculatedAmount,
      approvedAmount: r.approvedAmount,
      status: r.status,
      notes: r.notes,
      createdAt: r.createdAt,
      salesRep: { id: r.salesRepId, name: r.salesRepName, image: r.salesRepImage },
    })) as Incentive[],
    total,
    page,
    totalPages: Math.ceil(total / limit),
  };
}

export async function getIncentiveStats(orgId: string): Promise<IncentiveStats> {
  const now = new Date();
  const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;

  const [allRows, monthRows] = await Promise.all([
    db.query.incentives.findMany({
      where: eq(incentives.orgId, orgId),
    }),
    db.query.incentives.findMany({
      where: and(
        eq(incentives.orgId, orgId),
        gte(incentives.createdAt, new Date(monthStart))
      ),
    }),
  ]);

  let totalRevenue = 0;
  let approved = 0;
  let pending = 0;
  let thisMonth = 0;

  for (const inc of allRows) {
    const amount = Number(inc.calculatedAmount || 0);
    totalRevenue += amount;
    if (inc.status === "APPROVED" || inc.status === "ADDED_TO_PAYROLL") approved++;
    if (inc.status === "PENDING") pending++;
  }
  for (const inc of monthRows) {
    thisMonth += Number(inc.calculatedAmount || 0);
  }

  return {
    thisMonth: thisMonth.toFixed(2),
    totalRevenue: totalRevenue.toFixed(2),
    avgPerConversion: approved > 0 ? (totalRevenue / approved).toFixed(2) : "0.00",
    pending,
    approved,
  };
}

export async function getIncentiveConfigs(orgId: string): Promise<IncentiveConfig[]> {
  return db.query.incentiveConfig.findMany({
    where: and(eq(incentiveConfig.orgId, orgId), eq(incentiveConfig.isActive, true)),
    orderBy: [desc(incentiveConfig.effectiveFrom)],
  }) as unknown as Promise<IncentiveConfig[]>;
}
