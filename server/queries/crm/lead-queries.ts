"server-only";

import { db } from "@/lib/db";
import { cached, CACHE_KEYS, CACHE_TTL } from "@/lib/cache";
import {
  crmCampaigns,
  crmLeads,
  crmContent,
  crmEvents,
  crmMonthlyMetrics,
} from "@/lib/db/schema";
import { eq, desc, count, sql } from "drizzle-orm";

function computeTrend(current: number, previous: number) {
  if (previous === 0) return { value: 0, isPositive: true };
  const change = ((current - previous) / previous) * 100;
  return { value: Math.round(Math.abs(change) * 10) / 10, isPositive: change >= 0 };
}

export async function getMarketingDashboard(orgId: string) {
  return cached(CACHE_KEYS.marketingDashboard(orgId), () => _getMarketingDashboard(orgId), { ttlSeconds: CACHE_TTL.MEDIUM });
}

async function _getMarketingDashboard(orgId: string) {
  const [allCampaigns, metrics, leadsByStatus, leadsByChannel, contentList, events] =
    await Promise.all([
      db.query.crmCampaigns.findMany({ where: eq(crmCampaigns.orgId, orgId) }),

      db.query.crmMonthlyMetrics.findMany({
        where: eq(crmMonthlyMetrics.orgId, orgId),
        orderBy: [desc(crmMonthlyMetrics.id)],
      }),

      db
        .select({ status: crmLeads.status, cnt: count() })
        .from(crmLeads)
        .where(eq(crmLeads.orgId, orgId))
        .groupBy(crmLeads.status),

      db
        .select({
          channel: sql<string>`COALESCE(${crmLeads.channel}, 'Other')`,
          cnt: count(),
        })
        .from(crmLeads)
        .where(eq(crmLeads.orgId, orgId))
        .groupBy(sql`COALESCE(${crmLeads.channel}, 'Other')`),

      db.query.crmContent.findMany({
        where: eq(crmContent.orgId, orgId),
        orderBy: [desc(crmContent.views)],
        limit: 5,
      }),

      db.query.crmEvents.findMany({
        where: eq(crmEvents.orgId, orgId),
        orderBy: [desc(crmEvents.id)],
        limit: 5,
      }),
    ]);

  const activeCampaigns = allCampaigns.filter((c) => c.status === "active").length;
  const totalLeads = allCampaigns.reduce((s, c) => s + (c.leads ?? 0), 0);
  const totalSpend = allCampaigns.reduce((s, c) => s + Number(c.spend), 0);
  const totalRoi = totalSpend > 0 ? Math.round((totalLeads * 100) / totalSpend) : 0;

  const mktCurr = metrics[0];
  const mktPrev = metrics[1];
  const latestMqls = mktCurr?.mqls ?? 0;

  const marketingStats = {
    campaigns: { value: activeCampaigns, trend: computeTrend(mktCurr?.mqls ?? 0, mktPrev?.mqls ?? 0) },
    leads: { value: totalLeads, trend: computeTrend(mktCurr?.mqls ?? 0, mktPrev?.mqls ?? 0) },
    mqls: { value: latestMqls, trend: computeTrend(mktCurr?.mqls ?? 0, mktPrev?.mqls ?? 0) },
    roi: { value: totalRoi, trend: computeTrend(Number(mktCurr?.revenue ?? 0), Number(mktPrev?.revenue ?? 0)) },
  };

  const mqlTimeline = metrics.map((m) => ({ month: m.month, value: m.mqls ?? 0 })).reverse();

  const statusMap = new Map(leadsByStatus.map((r) => [r.status, r.cnt]));
  const LEAD_STATUS_ORDER = ["visitor", "lead", "mql", "sql", "opportunity"];
  const LEAD_STATUS_LABELS: Record<string, string> = { visitor: "Visitors", lead: "Leads", mql: "MQLs", sql: "SQLs", opportunity: "Opportunities" };
  const LEAD_STATUS_COLORS: Record<string, string> = { visitor: "#3B82F6", lead: "#6366F1", mql: "#8B5CF6", sql: "#A855F7", opportunity: "#10B981" };
  const leadFunnel = LEAD_STATUS_ORDER.map((status) => ({
    stage: LEAD_STATUS_LABELS[status] ?? status,
    value: statusMap.get(status as "visitor" | "lead" | "mql" | "sql" | "opportunity") ?? 0,
    color: LEAD_STATUS_COLORS[status] ?? "#3B82F6",
  }));

  const campaigns = allCampaigns.map((c) => ({
    name: c.name,
    status: c.status as "active" | "paused" | "completed",
    leads: c.leads ?? 0,
    spend: Number(c.spend),
    roi: Number(c.roi),
  }));

  const totalLeadCount = leadsByChannel.reduce((s, r) => s + r.cnt, 0) || 1;
  const CHANNEL_COLORS: Record<string, string> = {
    "Organic Search": "#10B981",
    "Paid Ads": "#3B82F6",
    "Social Media": "#8B5CF6",
    Email: "#F59E0B",
    Referral: "#EF4444",
  };
  const channelBreakdown = leadsByChannel
    .sort((a, b) => b.cnt - a.cnt)
    .map(({ channel, cnt }) => ({
      label: channel,
      value: Math.round((cnt / totalLeadCount) * 100),
      color: CHANNEL_COLORS[channel] ?? "#6B7280",
    }));

  const contentPerformance = contentList.map((c) => ({
    title: c.title,
    type: c.type,
    views: c.views ?? 0,
    leads: c.leads ?? 0,
    convRate: Number(c.convRate),
  }));

  const upcomingEvents = events.map((e) => ({
    name: e.name,
    date: e.date,
    type: e.type,
    status: e.status as "planning" | "confirmed" | "completed",
  }));

  return { marketingStats, mqlTimeline, leadFunnel, campaigns, channelBreakdown, contentPerformance, upcomingEvents };
}
