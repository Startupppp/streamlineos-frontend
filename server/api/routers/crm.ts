import { createTRPCRouter, protectedProcedure } from "../trpc";
import { z } from "zod";
import { eq, and, sql, desc } from "drizzle-orm";
import {
  crmPeople,
  crmCompanies,
  crmDeals,
  crmCampaigns,
  crmLeads,
  crmContent,
  crmEvents,
  crmActivities,
  crmSupportTickets,
  crmMonthlyMetrics,
  crmTeamPerformance,
  crmSupportTeamMembers,
} from "../../../lib/db/schema";

export const crmRouter = createTRPCRouter({
  // ─── Sales Dashboard ─────────────────────────────────────────────────
  getSalesDashboard: protectedProcedure.query(async ({ ctx }) => {
    const orgId = ctx.session.orgId;

    // Get all deals for this org
    const deals = await ctx.db.query.crmDeals.findMany({
      where: eq(crmDeals.orgId, orgId),
      with: { salesRep: true },
    });

    // Compute sales stats
    const closedWonDeals = deals.filter((d) => d.stage === "Closed Won");
    const pipelineValue = deals.reduce((s, d) => s + Number(d.value), 0);
    const dealsWon = closedWonDeals.length;
    const totalDeals = deals.length;
    const conversionRate = totalDeals > 0 ? (dealsWon / totalDeals) * 100 : 0;
    const avgDealSize = dealsWon > 0 ? closedWonDeals.reduce((s, d) => s + Number(d.value), 0) / dealsWon : 0;

    const salesStats = {
      pipeline: { value: pipelineValue, trend: { value: 12.3, isPositive: true } },
      dealsWon: { value: dealsWon, trend: { value: 8.1, isPositive: true } },
      conversionRate: { value: Math.round(conversionRate * 10) / 10, trend: { value: 3.2, isPositive: true } },
      avgDealSize: { value: Math.round(avgDealSize), trend: { value: 5.4, isPositive: false } },
    };

    // Revenue timeline from monthly metrics
    const metrics = await ctx.db.query.crmMonthlyMetrics.findMany({
      where: eq(crmMonthlyMetrics.orgId, orgId),
      orderBy: [desc(crmMonthlyMetrics.id)],
    });
    const revenueTimeline = metrics
      .map((m) => ({ month: m.month, value: Number(m.revenue) }))
      .reverse();

    // Sales funnel — group deals by stage
    const stageOrder = ["Discovery", "Qualified", "Proposal", "Negotiation", "Closed Won"];
    const stageColors: Record<string, string> = {
      Discovery: "#3B82F6",
      Qualified: "#6366F1",
      Proposal: "#8B5CF6",
      Negotiation: "#A855F7",
      "Closed Won": "#10B981",
    };
    const salesFunnel = stageOrder.map((stage) => {
      const stageDeals = deals.filter((d) => d.stage === stage);
      return {
        stage,
        value: stageDeals.length,
        color: stageColors[stage] || "#3B82F6",
      };
    });

    // Top deals
    const topDeals = deals
      .filter((d) => d.stage !== "Closed Won")
      .sort((a, b) => Number(b.value) - Number(a.value))
      .slice(0, 5)
      .map((d) => ({
        company: d.companyName,
        value: Number(d.value),
        stage: d.stage,
        rep: d.salesRep ? `${d.salesRep.name.split(" ")[0]} ${d.salesRep.name.split(" ")[1]?.[0]}.` : "Unassigned",
        probability: d.probability ?? 0,
      }));

    // Sales leaderboard — group deals by rep
    const repMap = new Map<number, { name: string; deals: number; revenue: number; avatar: string }>();
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

    // Sales activity
    const salesActivities = await ctx.db.query.crmActivities.findMany({
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

    // Deals by stage
    const dealsByStage = stageOrder.map((stage) => {
      const stageDeals = deals.filter((d) => d.stage === stage);
      return {
        stage,
        count: stageDeals.length,
        value: stageDeals.reduce((s, d) => s + Number(d.value), 0),
        color: stageColors[stage] || "#3B82F6",
      };
    });

    return {
      salesStats,
      revenueTimeline,
      salesFunnel,
      topDeals,
      salesLeaderboard,
      salesActivity,
      dealsByStage,
    };
  }),

  // ─── Customer Executive Dashboard ────────────────────────────────────
  getCustomerExecutiveDashboard: protectedProcedure.query(async ({ ctx }) => {
    const orgId = ctx.session.orgId;

    const companies = await ctx.db.query.crmCompanies.findMany({
      where: eq(crmCompanies.orgId, orgId),
      with: { csm: true },
    });

    const totalClients = companies.length;
    const healthCounts = {
      healthy: companies.filter((c) => c.health === "healthy").length,
      at_risk: companies.filter((c) => c.health === "at_risk").length,
      critical: companies.filter((c) => c.health === "critical").length,
    };
    const newClients = companies.filter((c) => c.customerSince === "2025" || c.customerSince === "2026").length;

    const customerStats = {
      totalClients: { value: totalClients, trend: { value: 4.2, isPositive: true } },
      nps: { value: 72, trend: { value: 6.0, isPositive: true } },
      csat: { value: 4.6, trend: { value: 2.1, isPositive: true } },
      retention: { value: 93.6, trend: { value: 1.8, isPositive: true } },
    };

    const clientHealth = [
      { label: "Healthy", value: healthCounts.healthy, color: "#10B981" },
      { label: "At Risk", value: healthCounts.at_risk, color: "#F59E0B" },
      { label: "Critical", value: healthCounts.critical, color: "#EF4444" },
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

    const keyAccounts = companies
      .sort((a, b) => Number(b.revenue) - Number(a.revenue))
      .slice(0, 5)
      .map((c) => ({
        name: c.name,
        revenue: Number(c.revenue),
        health: c.health as "healthy" | "at_risk" | "critical",
        csm: c.csm ? `${c.csm.name.split(" ")[0]} ${c.csm.name.split(" ")[1]?.[0]}.` : "Unassigned",
        since: c.customerSince ?? "—",
      }));

    const ceActivities = await ctx.db.query.crmActivities.findMany({
      where: and(eq(crmActivities.orgId, orgId), eq(crmActivities.category, "customer_success")),
      orderBy: [desc(crmActivities.createdAt)],
      limit: 6,
    });
    const customerInteractions = ceActivities.map((a) => ({
      type: a.type as "call" | "email" | "meeting" | "ticket" | "escalation",
      message: a.message,
      time: a.time,
      person: a.person ?? "",
    }));

    // Support stats from CRM support tickets
    const supportTickets = await ctx.db.query.crmSupportTickets.findMany({
      where: eq(crmSupportTickets.orgId, orgId),
    });
    const openTickets = supportTickets.filter((t) => t.status === "new" || t.status === "in_progress").length;
    const supportStats = {
      openTickets,
      avgResolution: "4.2h",
      firstResponse: "18min",
      satisfaction: 94.2,
    };

    // Timeline metrics
    const metrics = await ctx.db.query.crmMonthlyMetrics.findMany({
      where: eq(crmMonthlyMetrics.orgId, orgId),
      orderBy: [desc(crmMonthlyMetrics.id)],
    });
    const retentionTimeline = metrics
      .map((m) => ({ month: m.month, value: Number(m.retention) }))
      .reverse();
    const csatTimeline = metrics
      .map((m) => ({ month: m.month, value: Number(m.csat) }))
      .reverse();

    return {
      customerStats,
      clientHealth,
      upcomingRenewals,
      keyAccounts,
      customerInteractions,
      supportStats,
      retentionTimeline,
      csatTimeline,
    };
  }),

  // ─── Marketing Dashboard ─────────────────────────────────────────────
  getMarketingDashboard: protectedProcedure.query(async ({ ctx }) => {
    const orgId = ctx.session.orgId;

    const allCampaigns = await ctx.db.query.crmCampaigns.findMany({
      where: eq(crmCampaigns.orgId, orgId),
    });

    const activeCampaigns = allCampaigns.filter((c) => c.status === "active").length;
    const totalLeads = allCampaigns.reduce((s, c) => s + (c.leads ?? 0), 0);

    const metrics = await ctx.db.query.crmMonthlyMetrics.findMany({
      where: eq(crmMonthlyMetrics.orgId, orgId),
      orderBy: [desc(crmMonthlyMetrics.id)],
    });
    const latestMqls = metrics.length > 0 ? metrics[0].mqls ?? 0 : 0;
    const totalSpend = allCampaigns.reduce((s, c) => s + Number(c.spend), 0);
    const totalRoi = totalSpend > 0 ? Math.round((totalLeads * 100) / totalSpend) : 0;

    const marketingStats = {
      campaigns: { value: activeCampaigns, trend: { value: 14.3, isPositive: true } },
      leads: { value: totalLeads, trend: { value: 22.1, isPositive: true } },
      mqls: { value: latestMqls, trend: { value: 18.6, isPositive: true } },
      roi: { value: totalRoi, trend: { value: 15.0, isPositive: true } },
    };

    const mqlTimeline = metrics
      .map((m) => ({ month: m.month, value: m.mqls ?? 0 }))
      .reverse();

    // Lead funnel from leads table
    const leads = await ctx.db.query.crmLeads.findMany({
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
      value: leads.filter((l) => l.status === status).length,
      color: leadStatusColors[status] || "#3B82F6",
    }));

    const campaigns = allCampaigns.map((c) => ({
      name: c.name,
      status: c.status as "active" | "paused" | "completed",
      leads: c.leads ?? 0,
      spend: Number(c.spend),
      roi: Number(c.roi),
    }));

    // Channel breakdown from leads
    const channelMap = new Map<string, number>();
    for (const lead of leads) {
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
    const totalLeadCount = leads.length || 1;
    const channelBreakdown = Array.from(channelMap.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([label, count]) => ({
        label,
        value: Math.round((count / totalLeadCount) * 100),
        color: channelColorMap[label] || "#6B7280",
      }));

    // Content performance
    const contentList = await ctx.db.query.crmContent.findMany({
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

    // Events
    const events = await ctx.db.query.crmEvents.findMany({
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
  }),

  // ─── Support Dashboard ───────────────────────────────────────────────
  getSupportDashboard: protectedProcedure.query(async ({ ctx }) => {
    const orgId = ctx.session.orgId;

    const tickets = await ctx.db.query.crmSupportTickets.findMany({
      where: eq(crmSupportTickets.orgId, orgId),
    });

    const openTickets = tickets.filter((t) => t.status === "new" || t.status === "in_progress").length;
    const supportDashboardStats = {
      openTickets: { value: openTickets, trend: { value: 5.2, isPositive: false } },
      avgResolution: { value: "4h 12m", trend: { value: 12.5, isPositive: true } },
      csatScore: { value: "4.8/5", trend: { value: 0.8, isPositive: true } },
      responseRate: { value: "98.2%", trend: { value: 2.1, isPositive: true } },
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
    const ticketStatusBreakdown = ["new", "in_progress", "resolved", "closed"].map((status) => ({
      label: statusLabels[status],
      value: tickets.filter((t) => t.status === status).length,
      color: statusColors[status],
    }));

    // Ticket volume timeline
    const metrics = await ctx.db.query.crmMonthlyMetrics.findMany({
      where: eq(crmMonthlyMetrics.orgId, orgId),
      orderBy: [desc(crmMonthlyMetrics.id)],
    });
    const ticketVolumeTimeline = metrics
      .map((m) => ({ month: m.month, value: m.ticketVolume ?? 0 }))
      .reverse();

    // Activity feed
    const supportActivities = await ctx.db.query.crmActivities.findMany({
      where: and(eq(crmActivities.orgId, orgId), eq(crmActivities.category, "support")),
      orderBy: [desc(crmActivities.createdAt)],
      limit: 7,
    });
    const supportActivityFeed = supportActivities.map((a) => ({
      type: a.type as "deal_won" | "meeting" | "proposal" | "call" | "email" | "ticket" | "escalation",
      message: a.message,
      time: a.time,
      person: a.person ?? "",
    }));

    // Team members
    const teamMembers = await ctx.db.query.crmSupportTeamMembers.findMany({
      where: eq(crmSupportTeamMembers.orgId, orgId),
    });
    const supportTeamMembers = teamMembers.map((m) => ({
      name: m.name,
      role: m.role,
      access: m.access,
      avatar: m.avatar,
      status: m.status as "online" | "away" | "offline",
    }));

    // Tickets by priority
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
    const ticketsByPriority = ["critical", "high", "medium", "low"].map((priority) => ({
      label: priorityLabels[priority],
      value: tickets.filter((t) => t.priority === priority).length,
      color: priorityColors[priority],
    }));

    return {
      supportDashboardStats,
      ticketStatusBreakdown,
      ticketVolumeTimeline,
      supportActivityFeed,
      supportTeamMembers,
      ticketsByPriority,
    };
  }),

  // ─── Person Detail ───────────────────────────────────────────────────
  getPersonBySlug: protectedProcedure
    .input(z.object({ slug: z.string() }))
    .query(async ({ ctx, input }) => {
      const orgId = ctx.session.orgId;

      const person = await ctx.db.query.crmPeople.findFirst({
        where: and(eq(crmPeople.orgId, orgId), eq(crmPeople.slug, input.slug)),
      });

      if (!person) return null;

      // Get monthly performance
      const performance = await ctx.db.query.crmTeamPerformance.findMany({
        where: and(
          eq(crmTeamPerformance.orgId, orgId),
          eq(crmTeamPerformance.personId, person.id)
        ),
      });
      const monthlyPerformance = performance.map((p) => ({
        month: p.month,
        value: Number(p.value),
      }));

      // Get deals (for sales reps)
      const deals = await ctx.db.query.crmDeals.findMany({
        where: and(eq(crmDeals.orgId, orgId), eq(crmDeals.salesRepId, person.id)),
      });
      const personDeals = deals.map((d) => ({
        company: d.companyName,
        value: Number(d.value),
        stage: d.stage,
        probability: d.probability ?? 0,
        closeDate: d.closeDate ?? "",
      }));

      // Get accounts (for CSMs)
      const accounts = await ctx.db.query.crmCompanies.findMany({
        where: and(eq(crmCompanies.orgId, orgId), eq(crmCompanies.csmId, person.id)),
      });
      const personAccounts = accounts.map((a) => ({
        name: a.name,
        revenue: Number(a.revenue),
        health: a.health as "healthy" | "at_risk" | "critical",
        since: a.customerSince ?? "—",
        renewalDate: a.renewalDate ?? "",
      }));

      // Get activities
      const activities = await ctx.db.query.crmActivities.findMany({
        where: and(eq(crmActivities.orgId, orgId), eq(crmActivities.personId, person.id)),
        orderBy: [desc(crmActivities.createdAt)],
        limit: 10,
      });
      const personActivities = activities.map((a) => ({
        type: a.type as "deal_won" | "meeting" | "proposal" | "call" | "email" | "ticket" | "escalation",
        message: a.message,
        time: a.time,
      }));

      // Compute stats based on role
      const stats = computePersonStats(person.role, personDeals, personAccounts, monthlyPerformance);

      return {
        slug: person.slug,
        name: person.name,
        initials: person.initials,
        role: person.role,
        title: person.title,
        department: person.department,
        email: person.email,
        phone: person.phone ?? "",
        location: person.location ?? "",
        joinDate: person.joinDate ?? "",
        bio: person.bio ?? "",
        stats,
        monthlyPerformance,
        deals: personDeals,
        accounts: personAccounts,
        activities: personActivities,
        skills: person.skills ?? [],
      };
    }),

  // ─── Person slug lookup helper ───────────────────────────────────────
  getPersonSlug: protectedProcedure
    .input(z.object({ name: z.string() }))
    .query(async ({ ctx, input }) => {
      const orgId = ctx.session.orgId;
      // Try matching by abbreviated name (e.g. "Sarah M.") or full name
      const allPeople = await ctx.db.query.crmPeople.findMany({
        where: eq(crmPeople.orgId, orgId),
        columns: { slug: true, name: true },
      });

      for (const p of allPeople) {
        if (p.name === input.name) return p.slug;
        const parts = p.name.split(" ");
        const abbreviated = `${parts[0]} ${parts[1]?.[0]}.`;
        if (abbreviated === input.name) return p.slug;
      }
      return null;
    }),

  // ─── All people slugs (for link resolution) ─────────────────────────
  getAllPeopleSlugs: protectedProcedure.query(async ({ ctx }) => {
    const orgId = ctx.session.orgId;
    const people = await ctx.db.query.crmPeople.findMany({
      where: eq(crmPeople.orgId, orgId),
      columns: { slug: true, name: true },
    });

    // Build lookup maps: full name → slug, abbreviated → slug
    const slugMap: Record<string, string> = {};
    for (const p of people) {
      slugMap[p.name] = p.slug;
      const parts = p.name.split(" ");
      const abbreviated = `${parts[0]} ${parts[1]?.[0]}.`;
      slugMap[abbreviated] = p.slug;
    }
    return slugMap;
  }),
});

// Helper to compute person stats from their deals/accounts/performance
function computePersonStats(
  role: string,
  deals: { value: number; stage: string; probability: number }[],
  accounts: { revenue: number; health: string }[],
  monthlyPerformance: { value: number }[]
) {
  if (role === "sales_rep") {
    const totalRevenue = deals.reduce((s, d) => s + d.value, 0);
    const dealsWon = deals.filter((d) => d.stage === "Closed Won").length;
    const totalDeals = deals.length;
    const convRate = totalDeals > 0 ? (dealsWon / totalDeals) * 100 : 0;
    const avgDeal = totalDeals > 0 ? totalRevenue / totalDeals : 0;
    const pipeline = deals.filter((d) => d.stage !== "Closed Won").reduce((s, d) => s + d.value, 0);

    return [
      { label: "Revenue", value: `$${(totalRevenue / 1000).toFixed(0)}K`, trend: { value: 18.2, isPositive: true } },
      { label: "Deals Won", value: dealsWon, trend: { value: 12.0, isPositive: true } },
      { label: "Conv. Rate", value: `${convRate.toFixed(1)}%`, trend: { value: 4.5, isPositive: true } },
      { label: "Avg Deal", value: `$${(avgDeal / 1000).toFixed(1)}K`, trend: { value: 7.8, isPositive: true } },
      { label: "Quota Attain.", value: "—" },
      { label: "Pipeline", value: `$${(pipeline / 1000).toFixed(0)}K` },
    ];
  }

  if (role === "csm") {
    const totalAccounts = accounts.length;
    const arrManaged = accounts.reduce((s, a) => s + a.revenue, 0);
    const healthyPercent = totalAccounts > 0 ? (accounts.filter((a) => a.health === "healthy").length / totalAccounts) * 100 : 0;

    return [
      { label: "Accounts", value: totalAccounts, trend: { value: 8.3, isPositive: true } },
      { label: "ARR Managed", value: `$${(arrManaged / 1000000).toFixed(1)}M`, trend: { value: 12.5, isPositive: true } },
      { label: "NPS", value: 78, trend: { value: 5.0, isPositive: true } },
      { label: "Retention", value: `${healthyPercent.toFixed(1)}%`, trend: { value: 2.1, isPositive: true } },
      { label: "CSAT", value: "4.8/5", trend: { value: 3.0, isPositive: true } },
      { label: "Expansion Rev.", value: "—" },
    ];
  }

  return [];
}
