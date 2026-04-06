"server-only";

import { db } from "@/lib/db";
import { cached, CACHE_KEYS, CACHE_TTL } from "@/lib/cache";
import {
  crmDeals,
  crmCampaigns,
  crmLeads,
  crmContent,
  crmEvents,
  crmActivities,
  crmSupportTickets,
  crmMonthlyMetrics,
  crmCompanies,
  crmSupportTeamMembers,
  crmPeople,
  leads,
  leadActivities,
} from "@/lib/db/schema";
import { eq, and, desc, gte, count, sum, sql, ne, isNotNull } from "drizzle-orm";
import { subDays } from "date-fns";

// ─── CRM Dashboards ───────────────────────────────────────────────────────────

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
  // SQL aggregation: count and sum per stage
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

  // Compute totals from SQL aggregations
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

  // Fetch people names for leaderboard
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
    followUpNeeded: 0, // computed on frontend from lead list
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

      // SQL GROUP BY status instead of fetching all leads
      db
        .select({ status: crmLeads.status, cnt: count() })
        .from(crmLeads)
        .where(eq(crmLeads.orgId, orgId))
        .groupBy(crmLeads.status),

      // SQL GROUP BY channel
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

export async function getSupportDashboard(orgId: string) {
  return cached(CACHE_KEYS.supportDashboard(orgId), () => _getSupportDashboard(orgId), { ttlSeconds: CACHE_TTL.MEDIUM });
}

async function _getSupportDashboard(orgId: string) {
  const [statusAggs, priorityAggs, metrics, supportActivities, teamMembers, resolvedTickets] =
    await Promise.all([
      // SQL GROUP BY status
      db
        .select({ status: crmSupportTickets.status, cnt: count() })
        .from(crmSupportTickets)
        .where(eq(crmSupportTickets.orgId, orgId))
        .groupBy(crmSupportTickets.status),

      // SQL GROUP BY priority
      db
        .select({ priority: crmSupportTickets.priority, cnt: count() })
        .from(crmSupportTickets)
        .where(eq(crmSupportTickets.orgId, orgId))
        .groupBy(crmSupportTickets.priority),

      db.query.crmMonthlyMetrics.findMany({
        where: eq(crmMonthlyMetrics.orgId, orgId),
        orderBy: [desc(crmMonthlyMetrics.id)],
      }),

      db.query.crmActivities.findMany({
        where: and(eq(crmActivities.orgId, orgId), eq(crmActivities.category, "support")),
        orderBy: [desc(crmActivities.createdAt)],
        limit: 7,
      }),

      db.query.crmSupportTeamMembers.findMany({
        where: eq(crmSupportTeamMembers.orgId, orgId),
      }),

      // Fetch only resolved tickets for avg resolution time calculation
      db.query.crmSupportTickets.findMany({
        where: and(
          eq(crmSupportTickets.orgId, orgId),
          isNotNull(crmSupportTickets.resolvedAt)
        ),
        columns: { resolvedAt: true, createdAt: true },
        limit: 500,
      }),
    ]);

  const statusMap = new Map(statusAggs.map((r) => [r.status, r.cnt]));
  const totalTickets = statusAggs.reduce((s, r) => s + r.cnt, 0);
  const openTickets = (statusMap.get("new") ?? 0) + (statusMap.get("in_progress") ?? 0);
  const closedOrResolved = (statusMap.get("resolved") ?? 0) + (statusMap.get("closed") ?? 0);
  const responseRateVal = totalTickets > 0 ? Math.round((closedOrResolved / totalTickets) * 1000) / 10 : 0;

  const avgResolveMs = resolvedTickets.length > 0
    ? resolvedTickets.reduce((sum, t) => {
        if (!t.resolvedAt || !t.createdAt) return sum;
        return sum + (t.resolvedAt.getTime() - t.createdAt.getTime());
      }, 0) / resolvedTickets.length
    : 0;
  const avgResolveH = Math.floor(avgResolveMs / (1000 * 60 * 60));
  const avgResolveM = Math.round((avgResolveMs / (1000 * 60)) % 60);
  const avgResolutionStr = avgResolveMs > 0 ? `${avgResolveH}h ${avgResolveM}m` : "—";

  const supportDashboardStats = {
    openTickets: { value: openTickets, trend: computeTrend(metrics[0]?.ticketVolume ?? 0, metrics[1]?.ticketVolume ?? 0) },
    avgResolution: { value: avgResolutionStr, trend: computeTrend(avgResolveH, avgResolveH + 1) },
    csatScore: { value: `${Number(metrics[0]?.csat ?? 0).toFixed(1)}/5`, trend: computeTrend(Number(metrics[0]?.csat ?? 0), Number(metrics[1]?.csat ?? 0)) },
    responseRate: { value: `${responseRateVal}%`, trend: computeTrend(responseRateVal, 95) },
  };

  const STATUS_LABELS: Record<string, string> = { new: "New", in_progress: "In Progress", resolved: "Resolved", closed: "Closed" };
  const STATUS_COLORS: Record<string, string> = { new: "#3B82F6", in_progress: "#F59E0B", resolved: "#10B981", closed: "#6366F1" };
  const ticketStatusBreakdown = ["new", "in_progress", "resolved", "closed"].map((status) => ({
    label: STATUS_LABELS[status],
    value: statusMap.get(status as "new" | "in_progress" | "resolved" | "closed") ?? 0,
    color: STATUS_COLORS[status],
  }));

  const ticketVolumeTimeline = metrics.map((m) => ({ month: m.month, value: m.ticketVolume ?? 0 })).reverse();

  const supportActivityFeed = supportActivities.map((a) => ({
    type: a.type as "deal_won" | "meeting" | "proposal" | "call" | "email" | "ticket" | "escalation",
    message: a.message,
    time: a.time,
    person: a.person ?? "",
  }));

  const supportTeamMembers = teamMembers.map((m) => ({
    name: m.name,
    role: m.role,
    access: m.access,
    avatar: m.avatar,
    status: m.status as "online" | "away" | "offline",
  }));

  const priorityMap = new Map(priorityAggs.map((r) => [r.priority, r.cnt]));
  const PRIORITY_LABELS: Record<string, string> = { critical: "Critical", high: "High", medium: "Medium", low: "Low" };
  const PRIORITY_COLORS: Record<string, string> = { critical: "#EF4444", high: "#F59E0B", medium: "#3B82F6", low: "#10B981" };
  const ticketsByPriority = ["critical", "high", "medium", "low"].map((priority) => ({
    label: PRIORITY_LABELS[priority],
    value: priorityMap.get(priority as "critical" | "high" | "medium" | "low") ?? 0,
    color: PRIORITY_COLORS[priority],
  }));

  return { supportDashboardStats, ticketStatusBreakdown, ticketVolumeTimeline, supportActivityFeed, supportTeamMembers, ticketsByPriority };
}

export async function getCustomerExecutiveDashboard(orgId: string) {
  return cached(CACHE_KEYS.ceDashboard(orgId), () => _getCustomerExecutiveDashboard(orgId), { ttlSeconds: CACHE_TTL.MEDIUM });
}

async function _getCustomerExecutiveDashboard(orgId: string) {
  const [healthAggs, companies, ceMetrics, ceActivities, supportTicketStats, resolvedCeTickets] =
    await Promise.all([
      // SQL GROUP BY health
      db
        .select({ health: crmCompanies.health, cnt: count() })
        .from(crmCompanies)
        .where(eq(crmCompanies.orgId, orgId))
        .groupBy(crmCompanies.health),

      db.query.crmCompanies.findMany({
        where: eq(crmCompanies.orgId, orgId),
        with: { csm: true },
        orderBy: [desc(crmCompanies.revenue)],
      }),

      db.query.crmMonthlyMetrics.findMany({
        where: eq(crmMonthlyMetrics.orgId, orgId),
        orderBy: [desc(crmMonthlyMetrics.id)],
      }),

      db.query.crmActivities.findMany({
        where: and(eq(crmActivities.orgId, orgId), eq(crmActivities.category, "customer_success")),
        orderBy: [desc(crmActivities.createdAt)],
        limit: 6,
      }),

      // SQL aggregation for support ticket counts
      db
        .select({ status: crmSupportTickets.status, cnt: count() })
        .from(crmSupportTickets)
        .where(eq(crmSupportTickets.orgId, orgId))
        .groupBy(crmSupportTickets.status),

      db.query.crmSupportTickets.findMany({
        where: and(eq(crmSupportTickets.orgId, orgId), isNotNull(crmSupportTickets.resolvedAt)),
        columns: { resolvedAt: true, createdAt: true },
        limit: 500,
      }),
    ]);

  const totalClients = companies.length;
  const healthMap = new Map(healthAggs.map((r) => [r.health ?? "healthy", r.cnt]));
  const newClients = companies.filter((c) => c.customerSince === "2025" || c.customerSince === "2026").length;

  const ceCurr = ceMetrics[0];
  const cePrev = ceMetrics[1];
  const latestCsat = Number(ceCurr?.csat ?? 0);
  const latestRetention = Number(ceCurr?.retention ?? 0);
  const latestNps = Math.round(latestCsat * 16);

  const customerStats = {
    totalClients: { value: totalClients, trend: computeTrend(totalClients, totalClients - newClients) },
    nps: { value: latestNps, trend: computeTrend(Number(ceCurr?.csat ?? 0) * 16, Number(cePrev?.csat ?? 0) * 16) },
    csat: { value: latestCsat, trend: computeTrend(Number(ceCurr?.csat ?? 0), Number(cePrev?.csat ?? 0)) },
    retention: { value: latestRetention, trend: computeTrend(Number(ceCurr?.retention ?? 0), Number(cePrev?.retention ?? 0)) },
  };

  const clientHealth = [
    { label: "Healthy", value: healthMap.get("healthy") ?? 0, color: "#10B981" },
    { label: "At Risk", value: healthMap.get("at_risk") ?? 0, color: "#F59E0B" },
    { label: "Critical", value: healthMap.get("critical") ?? 0, color: "#EF4444" },
    { label: "New", value: newClients, color: "#3B82F6" },
  ];

  const upcomingRenewals = companies
    .filter((c) => c.renewalDate)
    .sort((a, b) => (a.renewalDate! > b.renewalDate! ? 1 : -1))
    .slice(0, 6)
    .map((c) => ({
      client: c.name,
      value: Number(c.renewalValue),
      date: c.renewalDate!,
      health: c.health as "healthy" | "at_risk" | "critical",
    }));

  const keyAccounts = companies.slice(0, 5).map((c) => ({
    name: c.name,
    revenue: Number(c.revenue),
    health: c.health as "healthy" | "at_risk" | "critical",
    csm: c.csm ? `${c.csm.name.split(" ")[0]} ${c.csm.name.split(" ")[1]?.[0] ?? ""}.` : "Unassigned",
    since: c.customerSince ?? "—",
  }));

  const customerInteractions = ceActivities.map((a) => ({
    type: a.type as "call" | "email" | "meeting" | "ticket" | "escalation",
    message: a.message,
    time: a.time,
    person: a.person ?? "",
  }));

  const ticketStatusMap = new Map(supportTicketStats.map((r) => [r.status, r.cnt]));
  const openTickets = (ticketStatusMap.get("new") ?? 0) + (ticketStatusMap.get("in_progress") ?? 0);
  const avgResMs = resolvedCeTickets.length > 0
    ? resolvedCeTickets.reduce((sum, t) => {
        if (!t.resolvedAt || !t.createdAt) return sum;
        return sum + (t.resolvedAt.getTime() - t.createdAt.getTime());
      }, 0) / resolvedCeTickets.length
    : 0;
  const avgResHours = avgResMs / (1000 * 60 * 60);
  const avgResMinutes = Math.round((avgResMs / (1000 * 60)) % 60);
  const ceAvgResolution = avgResMs > 0 ? `${Math.floor(avgResHours)}h ${avgResMinutes}m` : "—";
  const ceFirstResponse = avgResMs > 0 ? `${Math.max(1, Math.round(avgResHours * 60 * 0.07))}min` : "—";
  const ceSatisfaction = latestCsat > 0 ? Math.round(latestCsat * 20 * 10) / 10 : 0;

  const supportStats = { openTickets, avgResolution: ceAvgResolution, firstResponse: ceFirstResponse, satisfaction: ceSatisfaction };
  const retentionTimeline = ceMetrics.map((m) => ({ month: m.month, value: Number(m.retention) })).reverse();
  const csatTimeline = ceMetrics.map((m) => ({ month: m.month, value: Number(m.csat) })).reverse();

  return { customerStats, clientHealth, upcomingRenewals, keyAccounts, customerInteractions, supportStats, retentionTimeline, csatTimeline };
}
