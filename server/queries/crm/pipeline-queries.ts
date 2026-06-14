"server-only";

import { db } from "@/lib/db";
import { cached, CACHE_KEYS, CACHE_TTL } from "@/lib/cache";
import {
  crmDeals,
  crmActivities,
  crmMonthlyMetrics,
  crmPeople,
  leads,
  leadActivities,
} from "@/lib/db/schema";
import { eq, and, desc, gte, count, sql, ne, isNotNull } from "drizzle-orm";
import { subDays } from "date-fns";

function computeTrend(current: number, previous: number) {
  if (previous === 0) return { value: 0, isPositive: true };
  const change = ((current - previous) / previous) * 100;
  return { value: Math.round(Math.abs(change) * 10) / 10, isPositive: change >= 0 };
}

const STAGE_ORDER = ["Discovery", "Qualified", "Proposal", "Negotiation", "Closed Won"] as const;
const STAGE_COLORS: Record<string, string> = {
  Discovery: "#3B82F6",
  Qualified: "#6366F1",
  Proposal: "#8B5CF6",
  Negotiation: "#A855F7",
  "Closed Won": "#10B981",
};

export async function getSalesDashboard(orgId: string) {
  return cached(CACHE_KEYS.salesDashboard(orgId), () => _getSalesDashboard(orgId), { ttlSeconds: CACHE_TTL.MEDIUM });
}

async function _getSalesDashboard(orgId: string) {

  const [stageAggs, topDealsRaw, leaderboardRaw, metrics, recentActivities, leadMetrics] =
    await Promise.all([
      db
        .select({
          stage: crmDeals.stage,
          dealCount: count(),
          totalValue: sql<number>`COALESCE(sum(${crmDeals.value}::numeric), 0)::float`,
        })
        .from(crmDeals)
        .where(eq(crmDeals.orgId, orgId))
        .groupBy(crmDeals.stage),

      db.query.crmDeals.findMany({
        where: and(eq(crmDeals.orgId, orgId), ne(crmDeals.stage, "Closed Won")),
        with: { salesRep: true },
        orderBy: [desc(crmDeals.value)],
        limit: 5,
      }),

      db
        .select({
          salesRepId: crmDeals.salesRepId,
          deals: count(),
          revenue: sql<number>`COALESCE(sum(${crmDeals.value}::numeric), 0)::float`,
        })
        .from(crmDeals)
        .where(and(eq(crmDeals.orgId, orgId), eq(crmDeals.stage, "Closed Won"), isNotNull(crmDeals.salesRepId)))
        .groupBy(crmDeals.salesRepId)
        .orderBy(desc(sql`sum(${crmDeals.value}::numeric)`))
        .limit(5),

      db.query.crmMonthlyMetrics.findMany({
        where: eq(crmMonthlyMetrics.orgId, orgId),
        orderBy: [desc(crmMonthlyMetrics.id)],
      }),

      db
        .select({ type: leadActivities.type, actCount: count() })
        .from(leadActivities)
        .innerJoin(leads, eq(leads.id, leadActivities.leadId))
        .where(and(eq(leads.orgId, orgId), gte(leadActivities.createdAt, subDays(new Date(), 7))))
        .groupBy(leadActivities.type),

      db
        .select({
          status: leads.status,
          cnt: count(),
        })
        .from(leads)
        .where(eq(leads.orgId, orgId))
        .groupBy(leads.status),
    ]);

  const stageMap = new Map(stageAggs.map((r) => [r.stage, r]));
  const pipelineValue = stageAggs.reduce((s, r) => s + r.totalValue, 0);
  const closedWonAgg = stageMap.get("Closed Won");
  const dealsWon = closedWonAgg?.dealCount ?? 0;
  const totalDeals = stageAggs.reduce((s, r) => s + r.dealCount, 0);
  const conversionRate = totalDeals > 0 ? (dealsWon / totalDeals) * 100 : 0;
  const avgDealSize = dealsWon > 0 ? (closedWonAgg?.totalValue ?? 0) / dealsWon : 0;

  const curr = metrics[0];
  const prev = metrics[1];

  const salesStats = {
    pipeline: {
      value: pipelineValue,
      trend: computeTrend(Number(curr?.revenue ?? 0), Number(prev?.revenue ?? 0)),
    },
    dealsWon: {
      value: dealsWon,
      trend: computeTrend(curr?.mqls ?? 0, prev?.mqls ?? 0),
    },
    conversionRate: {
      value: Math.round(conversionRate * 10) / 10,
      trend: computeTrend(Number(curr?.retention ?? 0), Number(prev?.retention ?? 0)),
    },
    avgDealSize: {
      value: Math.round(avgDealSize),
      trend: computeTrend(Number(curr?.csat ?? 0), Number(prev?.csat ?? 0)),
    },
  };

  const revenueTimeline = metrics
    .map((m) => ({ month: m.month, value: Number(m.revenue) }))
    .reverse();

  const salesFunnel = STAGE_ORDER.map((stage) => {
    const agg = stageMap.get(stage);
    return { stage, value: agg?.dealCount ?? 0, color: STAGE_COLORS[stage] };
  });

  const topDeals = topDealsRaw.map((d) => ({
    company: d.companyName,
    value: Number(d.value),
    stage: d.stage,
    rep: d.salesRep
      ? `${d.salesRep.name.split(" ")[0]} ${d.salesRep.name.split(" ")[1]?.[0] ?? ""}.`
      : "Unassigned",
    probability: d.probability ?? 0,
  }));

  const repIds = leaderboardRaw.map((r) => r.salesRepId).filter(Boolean) as number[];
  const people = repIds.length
    ? await db.query.crmPeople.findMany({
        where: (p, { inArray }) => inArray(p.id, repIds),
        columns: { id: true, name: true, initials: true },
      })
    : [];
  const peopleMap = new Map(people.map((p) => [p.id, p]));

  const salesLeaderboard = leaderboardRaw.map((r) => {
    const person = r.salesRepId ? peopleMap.get(r.salesRepId) : null;
    return {
      name: person?.name ?? "Unknown",
      deals: r.deals,
      revenue: r.revenue,
      avatar: person?.initials ?? "?",
    };
  });

  const dealsByStage = STAGE_ORDER.map((stage) => {
    const agg = stageMap.get(stage);
    return {
      stage,
      count: agg?.dealCount ?? 0,
      value: agg?.totalValue ?? 0,
      color: STAGE_COLORS[stage],
    };
  });

  const statusMap = new Map(leadMetrics.map((r) => [r.status, r.cnt]));
  const activityMap = Object.fromEntries(recentActivities.map((a) => [a.type, a.actCount]));

  const enhancedMetrics = {
    activeClients: statusMap.get("CONVERTED") ?? 0,
    inactiveClients: statusMap.get("LOST") ?? 0,
    totalCalls: activityMap["call"] ?? 0,
    totalMeetings: activityMap["meeting"] ?? 0,
    totalEmails: activityMap["email"] ?? 0,
    totalSiteVisits: activityMap["site_visit"] ?? 0,
    followUpNeeded: 0,
  };

  const salesActivities = await db.query.crmActivities.findMany({
    where: and(eq(crmActivities.orgId, orgId), eq(crmActivities.category, "sales")),
    orderBy: [desc(crmActivities.createdAt)],
    limit: 7,
  });
  const salesActivity = salesActivities.map((a) => ({
    type: a.type as "deal_won" | "meeting" | "proposal" | "call" | "email",
    message: a.message,
    time: a.time,
    person: a.person ?? "",
  }));

  return {
    salesStats,
    revenueTimeline,
    salesFunnel,
    topDeals,
    salesLeaderboard,
    salesActivity,
    dealsByStage,
    enhancedMetrics,
  };
}
