import "server-only";
import { sql, desc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { platformPayments, organizations } from "@/lib/db/schema";

export async function listPayments(limit = 100) {
  return db
    .select({
      id: platformPayments.id,
      razorpayPaymentId: platformPayments.razorpayPaymentId,
      amount: platformPayments.amount,
      currency: platformPayments.currency,
      status: platformPayments.status,
      method: platformPayments.method,
      description: platformPayments.description,
      customerEmail: platformPayments.customerEmail,
      orgName: organizations.name,
      orgSlug: organizations.slug,
      createdAt: platformPayments.createdAt,
    })
    .from(platformPayments)
    .leftJoin(organizations, eq(organizations.id, platformPayments.orgId))
    .orderBy(desc(platformPayments.createdAt))
    .limit(limit);
}

export async function getRevenueSummary() {
  const [byStatus, byMonth, byMethod] = await Promise.all([
    db
      .select({
        status: platformPayments.status,
        count: sql<number>`count(*)::int`,
        total: sql<number>`coalesce(sum(${platformPayments.amount})::int / 100, 0)`,
      })
      .from(platformPayments)
      .groupBy(platformPayments.status),
    db
      .select({
        month: sql<string>`to_char(${platformPayments.createdAt}, 'YYYY-MM')`,
        amount: sql<number>`coalesce(sum(${platformPayments.amount})::int / 100, 0)`,
      })
      .from(platformPayments)
      .where(eq(platformPayments.status, "captured"))
      .groupBy(sql`to_char(${platformPayments.createdAt}, 'YYYY-MM')`)
      .orderBy(sql`to_char(${platformPayments.createdAt}, 'YYYY-MM')`),
    db
      .select({
        method: sql<string>`coalesce(${platformPayments.method}, 'unknown')`,
        count: sql<number>`count(*)::int`,
      })
      .from(platformPayments)
      .where(eq(platformPayments.status, "captured"))
      .groupBy(platformPayments.method),
  ]);
  return { byStatus, byMonth, byMethod };
}
