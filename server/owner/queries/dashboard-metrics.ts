import "server-only";
import { unstable_cache } from "next/cache";
import { sql, gte, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  organizations,
  organizationMembers,
  users,
  leads,
  platformMessages,
  platformVisits,
  platformPayments,
} from "@/lib/db/schema";

/* ─────────────────────────────────────────────────────────────────────────────
   Aggregated platform metrics — cached for 60 s.
   Single round-trip set so the dashboard renders in one paint.
   ───────────────────────────────────────────────────────────────────────── */

export type PlatformDashboardMetrics = {
  customers: { total: number; activeLast30d: number };
  users: { total: number };
  messages: { total: number; unread: number };
  leads: { total: number; newLast7d: number };
  visits: { last30d: number; uniqueLast30d: number };
  revenue: { last30dInr: number; lifetimeInr: number; transactions: number };
  series: {
    visitsByDay: Array<{ date: string; count: number }>;
    revenueByMonth: Array<{ month: string; amount: number }>;
  };
};

const DAY_MS = 24 * 60 * 60 * 1000;
const inr = (paise: number) => Math.round(paise / 100);

async function load(): Promise<PlatformDashboardMetrics> {
  const now = new Date();
  const since30d = new Date(now.getTime() - 30 * DAY_MS);
  const since7d = new Date(now.getTime() - 7 * DAY_MS);

  const [
    totalCustomers,
    activeCustomers,
    totalUsers,
    totalMessages,
    unreadMessages,
    totalLeads,
    newLeads7d,
    visits30dRows,
    uniqueVisits30dRows,
    revenue30d,
    revenueLifetime,
    txCount,
    visitsByDayRows,
    revenueByMonthRows,
  ] = await Promise.all([
    db.select({ n: sql<number>`count(*)::int` }).from(organizations).then((r) => r[0]?.n ?? 0),
    db
      .select({ n: sql<number>`count(distinct ${organizationMembers.orgId})::int` })
      .from(organizationMembers)
      .innerJoin(users, eq(users.id, organizationMembers.userId))
      .where(gte(users.updatedAt, since30d))
      .then((r) => r[0]?.n ?? 0)
      .catch(() => 0),
    db.select({ n: sql<number>`count(*)::int` }).from(users).then((r) => r[0]?.n ?? 0),
    db.select({ n: sql<number>`count(*)::int` }).from(platformMessages).then((r) => r[0]?.n ?? 0),
    db
      .select({ n: sql<number>`count(*)::int` })
      .from(platformMessages)
      .where(eq(platformMessages.status, "NEW"))
      .then((r) => r[0]?.n ?? 0),
    db.select({ n: sql<number>`count(*)::int` }).from(leads).then((r) => r[0]?.n ?? 0),
    db
      .select({ n: sql<number>`count(*)::int` })
      .from(leads)
      .where(gte(leads.createdAt, since7d))
      .then((r) => r[0]?.n ?? 0),
    db
      .select({ n: sql<number>`count(*)::int` })
      .from(platformVisits)
      .where(gte(platformVisits.createdAt, since30d))
      .then((r) => r[0]?.n ?? 0),
    db
      .select({ n: sql<number>`count(distinct ${platformVisits.sessionToken})::int` })
      .from(platformVisits)
      .where(gte(platformVisits.createdAt, since30d))
      .then((r) => r[0]?.n ?? 0),
    db
      .select({ sum: sql<number>`coalesce(sum(${platformPayments.amount}), 0)::int` })
      .from(platformPayments)
      .where(sql`${platformPayments.status} = 'captured' AND ${platformPayments.createdAt} >= ${since30d}`)
      .then((r) => r[0]?.sum ?? 0),
    db
      .select({ sum: sql<number>`coalesce(sum(${platformPayments.amount}), 0)::int` })
      .from(platformPayments)
      .where(eq(platformPayments.status, "captured"))
      .then((r) => r[0]?.sum ?? 0),
    db
      .select({ n: sql<number>`count(*)::int` })
      .from(platformPayments)
      .where(eq(platformPayments.status, "captured"))
      .then((r) => r[0]?.n ?? 0),
    db
      .select({
        date: sql<string>`to_char(${platformVisits.createdAt}, 'YYYY-MM-DD')`,
        count: sql<number>`count(*)::int`,
      })
      .from(platformVisits)
      .where(gte(platformVisits.createdAt, since30d))
      .groupBy(sql`to_char(${platformVisits.createdAt}, 'YYYY-MM-DD')`)
      .orderBy(sql`to_char(${platformVisits.createdAt}, 'YYYY-MM-DD')`),
    db
      .select({
        month: sql<string>`to_char(${platformPayments.createdAt}, 'YYYY-MM')`,
        amount: sql<number>`coalesce(sum(${platformPayments.amount}), 0)::int`,
      })
      .from(platformPayments)
      .where(eq(platformPayments.status, "captured"))
      .groupBy(sql`to_char(${platformPayments.createdAt}, 'YYYY-MM')`)
      .orderBy(sql`to_char(${platformPayments.createdAt}, 'YYYY-MM')`),
  ]);

  return {
    customers: { total: totalCustomers, activeLast30d: activeCustomers },
    users: { total: totalUsers },
    messages: { total: totalMessages, unread: unreadMessages },
    leads: { total: totalLeads, newLast7d: newLeads7d },
    visits: { last30d: visits30dRows, uniqueLast30d: uniqueVisits30dRows },
    revenue: {
      last30dInr: inr(revenue30d),
      lifetimeInr: inr(revenueLifetime),
      transactions: txCount,
    },
    series: {
      visitsByDay: visitsByDayRows,
      revenueByMonth: revenueByMonthRows.map((r) => ({ month: r.month, amount: inr(r.amount) })),
    },
  };
}

export const getDashboardMetrics = unstable_cache(load, ["owner:dashboard-metrics"], {
  revalidate: 60,
  tags: ["owner-metrics"],
});
