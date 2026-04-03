"server-only";

/**
 * Server-side DB query functions for the CRM domain.
 * Covers: Deals, Contacts, Client Accounts, Targets, Dashboards.
 * Import only in Server Components, Route Handlers, or Server Actions.
 */

import { db } from "@/lib/db";
import {
  deals,
  dealActivities,
  contacts,
  crmOrganizations,
  clients,
  clientAccounts,
  clientAccountActivities,
  targets,
  targetHistory,
  users,
  organizationMembers,
  crmDeals,
  crmCompanies,
  crmCampaigns,
  crmLeads,
  crmContent,
  crmEvents,
  crmActivities,
  crmSupportTickets,
  crmMonthlyMetrics,
  crmTeamPerformance,
  crmSupportTeamMembers,
  leads,
  leadActivities,
} from "@/lib/db/schema";
import {
  eq,
  and,
  desc,
  asc,
  sql,
  count,
  gte,
  lte,
  or,
  inArray,
} from "drizzle-orm";
import { subDays } from "date-fns";
import type {
  DealFilters,
  ContactFilters,
  ClientAccountFilters,
  TargetFilters,
} from "@/types/crm";

// ─── Deals ───────────────────────────────────────────────────────────────────

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

// ─── Contacts ─────────────────────────────────────────────────────────────────

export async function getContacts(orgId: string, filters?: ContactFilters) {
  const conditions = [eq(contacts.orgId, orgId)];
  if (filters?.organizationId)
    conditions.push(eq(contacts.organizationId, filters.organizationId));
  if (filters?.search) {
    const s = `%${filters.search}%`;
    conditions.push(
      or(
        sql`${contacts.name} ILIKE ${s}`,
        sql`${contacts.email} ILIKE ${s}`,
        sql`${contacts.company} ILIKE ${s}`
      )!
    );
  }

  const [totalResult] = await db
    .select({ count: count() })
    .from(contacts)
    .where(and(...conditions));

  const items = await db
    .select()
    .from(contacts)
    .where(and(...conditions))
    .orderBy(contacts.name)
    .limit(filters?.limit ?? 50)
    .offset(filters?.offset ?? 0);

  return { items, total: totalResult?.count ?? 0 };
}

export async function getContact(orgId: string, id: number) {
  return db.query.contacts.findFirst({
    where: and(eq(contacts.id, id), eq(contacts.orgId, orgId)),
    with: { crmOrganization: true, lead: true, deal: true },
  });
}

// ─── Client Accounts ─────────────────────────────────────────────────────────

export async function getClientAccounts(
  orgId: string,
  filters?: ClientAccountFilters & { role?: string; userId?: string }
) {
  const f: ReturnType<typeof eq>[] = [eq(clientAccounts.orgId, orgId)];
  if (filters?.role === "SALES" && filters.userId) {
    f.push(eq(clientAccounts.salesRepId, filters.userId));
  }
  if (filters?.role === "CUSTOMER_SUPPORT" && filters.userId) {
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

// ─── Targets ─────────────────────────────────────────────────────────────────

export async function getTargets(orgId: string, filters?: TargetFilters) {
  const f = [eq(targets.orgId, orgId)];
  if (filters?.userId) f.push(eq(targets.userId, filters.userId));
  if (filters?.period) f.push(eq(targets.period, filters.period));

  return db.query.targets.findMany({
    where: and(...f),
    with: { user: { columns: { id: true, name: true, image: true } } },
    orderBy: [desc(targets.createdAt)],
    limit: filters?.limit ?? 50,
    offset: filters?.offset ?? 0,
  });
}

export async function getMyTargets(userId: string, orgId: string) {
  return db.query.targets.findMany({
    where: and(eq(targets.orgId, orgId), eq(targets.userId, userId)),
    orderBy: [desc(targets.startDate)],
  });
}

export async function getTargetLeaderboard(orgId: string, metricType?: string) {
  const f = [eq(targets.orgId, orgId)];
  if (metricType) f.push(eq(targets.metricType, metricType));

  const allTargets = await db.query.targets.findMany({
    where: and(...f),
    with: { user: { columns: { id: true, name: true, image: true } } },
    orderBy: [desc(targets.currentValue)],
  });

  const userMap = new Map<
    string,
    { name: string; image: string | null; totalTarget: number; totalCurrent: number }
  >();

  for (const t of allTargets) {
    if (!t.user) continue;
    const existing = userMap.get(t.userId) || {
      name: t.user.name ?? "",
      image: t.user.image,
      totalTarget: 0,
      totalCurrent: 0,
    };
    existing.totalTarget += Number(t.targetValue);
    existing.totalCurrent += Number(t.currentValue ?? 0);
    userMap.set(t.userId, existing);
  }

  return Array.from(userMap.entries())
    .map(([userId, data]) => ({
      userId,
      ...data,
      progress:
        data.totalTarget > 0
          ? Math.round((data.totalCurrent / data.totalTarget) * 100)
          : 0,
    }))
    .sort((a, b) => b.progress - a.progress);
}

export async function getTargetHistory(orgId: string, targetId: number) {
  return db.query.targetHistory.findMany({
    where: and(
      eq(targetHistory.targetId, targetId),
      eq(targetHistory.orgId, orgId)
    ),
    with: { changedBy: { columns: { id: true, name: true, image: true } } },
    orderBy: [desc(targetHistory.createdAt)],
  });
}

// ─── CRM Dashboards ───────────────────────────────────────────────────────────

function computeTrend(current: number, previous: number) {
  if (previous === 0) return { value: 0, isPositive: true };
  const change = ((current - previous) / previous) * 100;
  return { value: Math.round(Math.abs(change) * 10) / 10, isPositive: change >= 0 };
}

export async function getSalesDashboard(orgId: string) {
  const allDeals = await db.query.crmDeals.findMany({
    where: eq(crmDeals.orgId, orgId),
    with: { salesRep: true },
  });

  const closedWonDeals = allDeals.filter((d) => d.stage === "Closed Won");
  const pipelineValue = allDeals.reduce((s, d) => s + Number(d.value), 0);
  const dealsWon = closedWonDeals.length;
  const totalDeals = allDeals.length;
  const conversionRate = totalDeals > 0 ? (dealsWon / totalDeals) * 100 : 0;
  const avgDealSize =
    dealsWon > 0
      ? closedWonDeals.reduce((s, d) => s + Number(d.value), 0) / dealsWon
      : 0;

  const metrics = await db.query.crmMonthlyMetrics.findMany({
    where: eq(crmMonthlyMetrics.orgId, orgId),
    orderBy: [desc(crmMonthlyMetrics.id)],
  });
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

  const stageOrder = ["Discovery", "Qualified", "Proposal", "Negotiation", "Closed Won"];
  const stageColors: Record<string, string> = {
    Discovery: "#3B82F6",
    Qualified: "#6366F1",
    Proposal: "#8B5CF6",
    Negotiation: "#A855F7",
    "Closed Won": "#10B981",
  };
  const salesFunnel = stageOrder.map((stage) => {
    const stageDeals = allDeals.filter((d) => d.stage === stage);
    return { stage, value: stageDeals.length, color: stageColors[stage] || "#3B82F6" };
  });

  const topDeals = allDeals
    .filter((d) => d.stage !== "Closed Won")
    .sort((a, b) => Number(b.value) - Number(a.value))
    .slice(0, 5)
    .map((d) => ({
      company: d.companyName,
      value: Number(d.value),
      stage: d.stage,
      rep: d.salesRep
        ? `${d.salesRep.name.split(" ")[0]} ${d.salesRep.name.split(" ")[1]?.[0]}.`
        : "Unassigned",
      probability: d.probability ?? 0,
    }));

  const repMap = new Map<
    number,
    { name: string; deals: number; revenue: number; avatar: string }
  >();
  for (const deal of closedWonDeals) {
    if (!deal.salesRep) continue;
    const existing = repMap.get(deal.salesRep.id) || {
      name: deal.salesRep.name,
      deals: 0,
      revenue: 0,
      avatar: deal.salesRep.initials,
    };
    existing.deals += 1;
    existing.revenue += Number(deal.value);
    repMap.set(deal.salesRep.id, existing);
  }
  const salesLeaderboard = Array.from(repMap.values())
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 5);

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

  const dealsByStage = stageOrder.map((stage) => {
    const stageDeals = allDeals.filter((d) => d.stage === stage);
    return {
      stage,
      count: stageDeals.length,
      value: stageDeals.reduce((s, d) => s + Number(d.value), 0),
      color: stageColors[stage] || "#3B82F6",
    };
  });

  const allLeads = await db.query.leads.findMany({
    where: eq(leads.orgId, orgId),
  });

  const activeClients = allLeads.filter((l) => l.status === "CONVERTED").length;
  const inactiveClients = allLeads.filter((l) => l.status === "LOST").length;

  const sevenDaysAgo = subDays(new Date(), 7);
  const recentActivities = await db
    .select({ type: leadActivities.type, count: count() })
    .from(leadActivities)
    .innerJoin(leads, eq(leads.id, leadActivities.leadId))
    .where(and(eq(leads.orgId, orgId), gte(leadActivities.createdAt, sevenDaysAgo)))
    .groupBy(leadActivities.type);

  const activityMap = Object.fromEntries(recentActivities.map((a) => [a.type, a.count]));

  const leadsNeedingFollowUp = allLeads.filter((l) => {
    if (l.status === "CONVERTED" || l.status === "LOST") return false;
    if (!l.updatedAt) return true;
    const daysSinceContact =
      (Date.now() - new Date(l.updatedAt).getTime()) / (1000 * 60 * 60 * 24);
    return daysSinceContact > 3;
  }).length;

  const enhancedMetrics = {
    activeClients,
    inactiveClients,
    totalCalls: activityMap["call"] ?? 0,
    totalMeetings: activityMap["meeting"] ?? 0,
    totalEmails: activityMap["email"] ?? 0,
    totalSiteVisits: activityMap["site_visit"] ?? 0,
    followUpNeeded: leadsNeedingFollowUp,
  };

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
  const allCampaigns = await db.query.crmCampaigns.findMany({
    where: eq(crmCampaigns.orgId, orgId),
  });

  const activeCampaigns = allCampaigns.filter((c) => c.status === "active").length;
  const totalLeads = allCampaigns.reduce((s, c) => s + (c.leads ?? 0), 0);

  const metrics = await db.query.crmMonthlyMetrics.findMany({
    where: eq(crmMonthlyMetrics.orgId, orgId),
    orderBy: [desc(crmMonthlyMetrics.id)],
  });
  const latestMqls = metrics.length > 0 ? (metrics[0].mqls ?? 0) : 0;
  const totalSpend = allCampaigns.reduce((s, c) => s + Number(c.spend), 0);
  const totalRoi = totalSpend > 0 ? Math.round((totalLeads * 100) / totalSpend) : 0;

  const mktCurr = metrics[0];
  const mktPrev = metrics[1];

  const marketingStats = {
    campaigns: {
      value: activeCampaigns,
      trend: computeTrend(mktCurr?.mqls ?? 0, mktPrev?.mqls ?? 0),
    },
    leads: {
      value: totalLeads,
      trend: computeTrend(mktCurr?.mqls ?? 0, mktPrev?.mqls ?? 0),
    },
    mqls: {
      value: latestMqls,
      trend: computeTrend(mktCurr?.mqls ?? 0, mktPrev?.mqls ?? 0),
    },
    roi: {
      value: totalRoi,
      trend: computeTrend(Number(mktCurr?.revenue ?? 0), Number(mktPrev?.revenue ?? 0)),
    },
  };

  const mqlTimeline = metrics
    .map((m) => ({ month: m.month, value: m.mqls ?? 0 }))
    .reverse();

  const crmLeadsList = await db.query.crmLeads.findMany({
    where: eq(crmLeads.orgId, orgId),
  });
  const leadStatusOrder = ["visitor", "lead", "mql", "sql", "opportunity"];
  const leadStatusLabels: Record<string, string> = {
    visitor: "Visitors",
    lead: "Leads",
    mql: "MQLs",
    sql: "SQLs",
    opportunity: "Opportunities",
  };
  const leadStatusColors: Record<string, string> = {
    visitor: "#3B82F6",
    lead: "#6366F1",
    mql: "#8B5CF6",
    sql: "#A855F7",
    opportunity: "#10B981",
  };
  const leadFunnel = leadStatusOrder.map((status) => ({
    stage: leadStatusLabels[status] || status,
    value: crmLeadsList.filter((l) => l.status === status).length,
    color: leadStatusColors[status] || "#3B82F6",
  }));

  const campaigns = allCampaigns.map((c) => ({
    name: c.name,
    status: c.status as "active" | "paused" | "completed",
    leads: c.leads ?? 0,
    spend: Number(c.spend),
    roi: Number(c.roi),
  }));

  const channelMap = new Map<string, number>();
  for (const lead of crmLeadsList) {
    const ch = lead.channel ?? "Other";
    channelMap.set(ch, (channelMap.get(ch) ?? 0) + 1);
  }
  const channelColorMap: Record<string, string> = {
    "Organic Search": "#10B981",
    "Paid Ads": "#3B82F6",
    "Social Media": "#8B5CF6",
    Email: "#F59E0B",
    Referral: "#EF4444",
  };
  const totalLeadCount = crmLeadsList.length || 1;
  const channelBreakdown = Array.from(channelMap.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([label, c]) => ({
      label,
      value: Math.round((c / totalLeadCount) * 100),
      color: channelColorMap[label] || "#6B7280",
    }));

  const contentList = await db.query.crmContent.findMany({
    where: eq(crmContent.orgId, orgId),
    orderBy: [desc(crmContent.views)],
    limit: 5,
  });
  const contentPerformance = contentList.map((c) => ({
    title: c.title,
    type: c.type,
    views: c.views ?? 0,
    leads: c.leads ?? 0,
    convRate: Number(c.convRate),
  }));

  const events = await db.query.crmEvents.findMany({
    where: eq(crmEvents.orgId, orgId),
    orderBy: [desc(crmEvents.id)],
    limit: 5,
  });
  const upcomingEvents = events.map((e) => ({
    name: e.name,
    date: e.date,
    type: e.type,
    status: e.status as "planning" | "confirmed" | "completed",
  }));

  return {
    marketingStats,
    mqlTimeline,
    leadFunnel,
    campaigns,
    channelBreakdown,
    contentPerformance,
    upcomingEvents,
  };
}

export async function getSupportDashboard(orgId: string) {
  const tickets = await db.query.crmSupportTickets.findMany({
    where: eq(crmSupportTickets.orgId, orgId),
  });

  const openTickets = tickets.filter(
    (t) => t.status === "new" || t.status === "in_progress"
  ).length;
  const resolvedTickets = tickets.filter((t) => t.resolvedAt && t.createdAt);
  const avgResolveMs =
    resolvedTickets.length > 0
      ? resolvedTickets.reduce(
          (sum, t) => sum + (t.resolvedAt!.getTime() - t.createdAt!.getTime()),
          0
        ) / resolvedTickets.length
      : 0;
  const avgResolveH = Math.floor(avgResolveMs / (1000 * 60 * 60));
  const avgResolveM = Math.round((avgResolveMs / (1000 * 60)) % 60);
  const avgResolutionStr =
    avgResolveMs > 0 ? `${avgResolveH}h ${avgResolveM}m` : "—";

  const closedOrResolved = tickets.filter(
    (t) => t.status === "resolved" || t.status === "closed"
  ).length;
  const responseRateVal =
    tickets.length > 0
      ? Math.round((closedOrResolved / tickets.length) * 1000) / 10
      : 0;

  const metrics = await db.query.crmMonthlyMetrics.findMany({
    where: eq(crmMonthlyMetrics.orgId, orgId),
    orderBy: [desc(crmMonthlyMetrics.id)],
  });

  const supportDashboardStats = {
    openTickets: {
      value: openTickets,
      trend: computeTrend(
        metrics[0]?.ticketVolume ?? 0,
        metrics[1]?.ticketVolume ?? 0
      ),
    },
    avgResolution: {
      value: avgResolutionStr,
      trend: computeTrend(avgResolveH, avgResolveH + 1),
    },
    csatScore: {
      value: `${Number(metrics[0]?.csat ?? 0).toFixed(1)}/5`,
      trend: computeTrend(
        Number(metrics[0]?.csat ?? 0),
        Number(metrics[1]?.csat ?? 0)
      ),
    },
    responseRate: {
      value: `${responseRateVal}%`,
      trend: computeTrend(responseRateVal, 95),
    },
  };

  const statusLabels: Record<string, string> = {
    new: "New",
    in_progress: "In Progress",
    resolved: "Resolved",
    closed: "Closed",
  };
  const statusColors: Record<string, string> = {
    new: "#3B82F6",
    in_progress: "#F59E0B",
    resolved: "#10B981",
    closed: "#6366F1",
  };
  const ticketStatusBreakdown = ["new", "in_progress", "resolved", "closed"].map(
    (status) => ({
      label: statusLabels[status],
      value: tickets.filter((t) => t.status === status).length,
      color: statusColors[status],
    })
  );

  const ticketVolumeTimeline = metrics
    .map((m) => ({ month: m.month, value: m.ticketVolume ?? 0 }))
    .reverse();

  const supportActivities = await db.query.crmActivities.findMany({
    where: and(
      eq(crmActivities.orgId, orgId),
      eq(crmActivities.category, "support")
    ),
    orderBy: [desc(crmActivities.createdAt)],
    limit: 7,
  });
  const supportActivityFeed = supportActivities.map((a) => ({
    type: a.type as
      | "deal_won"
      | "meeting"
      | "proposal"
      | "call"
      | "email"
      | "ticket"
      | "escalation",
    message: a.message,
    time: a.time,
    person: a.person ?? "",
  }));

  const teamMembers = await db.query.crmSupportTeamMembers.findMany({
    where: eq(crmSupportTeamMembers.orgId, orgId),
  });
  const supportTeamMembers = teamMembers.map((m) => ({
    name: m.name,
    role: m.role,
    access: m.access,
    avatar: m.avatar,
    status: m.status as "online" | "away" | "offline",
  }));

  const priorityLabels: Record<string, string> = {
    critical: "Critical",
    high: "High",
    medium: "Medium",
    low: "Low",
  };
  const priorityColors: Record<string, string> = {
    critical: "#EF4444",
    high: "#F59E0B",
    medium: "#3B82F6",
    low: "#10B981",
  };
  const ticketsByPriority = ["critical", "high", "medium", "low"].map(
    (priority) => ({
      label: priorityLabels[priority],
      value: tickets.filter((t) => t.priority === priority).length,
      color: priorityColors[priority],
    })
  );

  return {
    supportDashboardStats,
    ticketStatusBreakdown,
    ticketVolumeTimeline,
    supportActivityFeed,
    supportTeamMembers,
    ticketsByPriority,
  };
}
