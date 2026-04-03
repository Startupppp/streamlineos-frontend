"server-only";

/**
 * Server-side DB query functions for the Leads domain.
 * Import only in Server Components, Route Handlers, or Server Actions.
 */

import { db } from "@/lib/db";
import {
  leads,
  leadActivities,
  leadNotes,
  leadTasks,
  leadEmails,
  clients,
  deals,
  users,
  organizationMembers,
  departmentMembers,
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
import type {
  PipelineStatus,
  LeadPriority,
  LeadSource,
  LeadFilters,
} from "@/types/leads";
import { pushBranchAssigneeFilter, type BranchContext } from "@/lib/db/branch-filter";

// ─── getLeads ────────────────────────────────────────────────────────────────

export async function getLeads(
  orgId: string,
  filters?: LeadFilters & { role?: string; userId?: string; branch?: BranchContext }
) {
  const where = [eq(leads.orgId, orgId)];

  // Branch isolation: BRANCH_MANAGER/BRANCH_HR see only leads assigned to users in their branch
  if (filters?.branch) {
    await pushBranchAssigneeFilter(where, leads.assignedToId, filters.branch);
  }

  if (filters?.role === "SALES" && filters.userId) {
    where.push(eq(leads.assignedToId, filters.userId));
  }
  if (filters?.status) where.push(eq(leads.status, filters.status));
  if (filters?.priority) where.push(eq(leads.priority, filters.priority));
  if (filters?.source) where.push(eq(leads.source, filters.source));
  if (filters?.assignedToId) where.push(eq(leads.assignedToId, filters.assignedToId));
  if (filters?.dateFrom) where.push(gte(leads.createdAt, new Date(filters.dateFrom)));
  if (filters?.dateTo) where.push(lte(leads.createdAt, new Date(filters.dateTo)));
  if (filters?.search) {
    const s = `%${filters.search.toLowerCase()}%`;
    where.push(
      or(
        sql`LOWER(${leads.name}) LIKE ${s}`,
        sql`LOWER(${leads.email}) LIKE ${s}`,
        sql`${leads.phone} LIKE ${s}`,
        sql`LOWER(${leads.company}) LIKE ${s}`,
      )!
    );
  }

  const colMap = {
    name: leads.name,
    email: leads.email,
    company: leads.company,
    status: leads.status,
    priority: leads.priority,
    source: leads.source,
    score: leads.score,
    potentialValue: leads.potentialValue,
    createdAt: leads.createdAt,
  } as const;

  const sortBy = filters?.sortBy ?? "createdAt";
  const sortOrder = filters?.sortOrder ?? "desc";
  const orderCol = colMap[sortBy as keyof typeof colMap] ?? leads.createdAt;
  const orderFn = sortOrder === "asc" ? asc(orderCol) : desc(orderCol);

  const page = filters?.page ?? 1;
  const limit = filters?.limit ?? 50;
  const offset = (page - 1) * limit;
  const whereClause = and(...where);

  const [allLeads, totalResult] = await Promise.all([
    db.query.leads.findMany({
      where: whereClause,
      with: {
        assignedTo: { columns: { id: true, name: true, image: true } },
        campaign: { columns: { id: true, name: true } },
      },
      orderBy: [orderFn],
      limit,
      offset,
    }),
    db.select({ count: count() }).from(leads).where(whereClause),
  ]);

  const totalCount = totalResult[0]?.count ?? 0;
  return {
    leads: allLeads,
    totalCount,
    page,
    totalPages: Math.ceil(totalCount / limit),
  };
}

// ─── getLead ─────────────────────────────────────────────────────────────────

export async function getLead(orgId: string, id: number) {
  return db.query.leads.findFirst({
    where: and(eq(leads.id, id), eq(leads.orgId, orgId)),
    with: {
      assignedTo: { columns: { id: true, name: true, image: true, email: true } },
      assignedBy: { columns: { id: true, name: true } },
      campaign: { columns: { id: true, name: true } },
      activities: {
        with: { user: { columns: { id: true, name: true, image: true } } },
        orderBy: [desc(leadActivities.date)],
      },
    },
  });
}

// ─── getLeadBoard ─────────────────────────────────────────────────────────────

export async function getLeadBoard(
  orgId: string,
  opts?: { role?: string; userId?: string; branch?: BranchContext }
) {
  const filters = [eq(leads.orgId, orgId)];
  const role = opts?.role;
  const userId = opts?.userId;

  // Branch isolation for BRANCH_MANAGER/BRANCH_HR
  if (opts?.branch) {
    await pushBranchAssigneeFilter(filters, leads.assignedToId, opts.branch);
  }

  if (role === "SALES" && userId) {
    filters.push(eq(leads.assignedToId, userId));
  } else if (userId && role && !["CEO", "HR"].includes(role)) {
    const teamLeadDepts = await db.query.departmentMembers.findMany({
      where: and(
        eq(departmentMembers.userId, userId),
        eq(departmentMembers.role, "lead")
      ),
    });
    if (teamLeadDepts.length > 0) {
      const deptIds = teamLeadDepts.map((d) => d.departmentId);
      const teamMembers = await db.query.departmentMembers.findMany({
        where: inArray(departmentMembers.departmentId, deptIds),
      });
      const teamUserIds = [...new Set(teamMembers.map((m) => m.userId))];
      filters.push(inArray(leads.assignedToId, teamUserIds));
    } else {
      filters.push(eq(leads.assignedToId, userId));
    }
  }

  const allLeads = await db.query.leads.findMany({
    where: and(...filters),
    with: { assignedTo: { columns: { id: true, name: true, image: true } } },
    orderBy: [desc(leads.createdAt)],
  });

  const board: Record<string, typeof allLeads> = {
    NEW: [],
    CONTACTED: [],
    INTERESTED: [],
    QUALIFIED: [],
    CONVERTED: [],
    LOST: [],
  };

  for (const lead of allLeads) {
    if (board[lead.status]) {
      board[lead.status].push(lead);
    }
  }

  return board as {
    NEW: typeof allLeads;
    CONTACTED: typeof allLeads;
    INTERESTED: typeof allLeads;
    QUALIFIED: typeof allLeads;
    CONVERTED: typeof allLeads;
    LOST: typeof allLeads;
  };
}

// ─── getLeadStats ─────────────────────────────────────────────────────────────

export async function getLeadStats(
  orgId: string,
  filters?: { dateFrom?: string; dateTo?: string; role?: string; userId?: string; branch?: BranchContext }
) {
  const statsFilters = [eq(leads.orgId, orgId)];
  if (filters?.branch) {
    await pushBranchAssigneeFilter(statsFilters, leads.assignedToId, filters.branch);
  }
  if (filters?.role === "SALES" && filters.userId) {
    statsFilters.push(eq(leads.assignedToId, filters.userId));
  }

  let allLeads = await db.query.leads.findMany({ where: and(...statsFilters) });

  if (filters?.dateFrom) {
    const from = new Date(filters.dateFrom);
    allLeads = allLeads.filter((l) => new Date(l.createdAt!) >= from);
  }
  if (filters?.dateTo) {
    const to = new Date(filters.dateTo);
    to.setHours(23, 59, 59, 999);
    allLeads = allLeads.filter((l) => new Date(l.createdAt!) <= to);
  }

  const total = allLeads.length;
  const byStatus = {
    NEW: allLeads.filter((l) => l.status === "NEW").length,
    CONTACTED: allLeads.filter((l) => l.status === "CONTACTED").length,
    INTERESTED: allLeads.filter((l) => l.status === "INTERESTED").length,
    QUALIFIED: allLeads.filter((l) => l.status === "QUALIFIED").length,
    CONVERTED: allLeads.filter((l) => l.status === "CONVERTED").length,
    LOST: allLeads.filter((l) => l.status === "LOST").length,
  };

  const conversionRate = total > 0 ? (byStatus.CONVERTED / total) * 100 : 0;
  const totalPotentialValue = allLeads.reduce(
    (s, l) => s + Number(l.potentialValue ?? 0),
    0
  );
  const unassigned = allLeads.filter((l) => !l.assignedToId).length;

  const now = new Date();
  const thisMonth = allLeads.filter((l) => {
    const created = new Date(l.createdAt!);
    return (
      created.getMonth() === now.getMonth() &&
      created.getFullYear() === now.getFullYear()
    );
  }).length;

  return {
    total,
    byStatus,
    conversionRate: Math.round(conversionRate * 10) / 10,
    totalPotentialValue,
    unassigned,
    thisMonth,
  };
}

// ─── getLeadActivities ────────────────────────────────────────────────────────

export async function getLeadActivities(
  orgId: string,
  leadId: number,
  limit = 20
) {
  return db.query.leadActivities.findMany({
    where: and(
      eq(leadActivities.leadId, leadId),
      eq(leadActivities.orgId, orgId)
    ),
    with: { user: { columns: { id: true, name: true, image: true } } },
    orderBy: [desc(leadActivities.date)],
    limit,
  });
}

// ─── getLeadTimeline ──────────────────────────────────────────────────────────

export async function getLeadTimeline(
  orgId: string,
  leadId: number,
  limit = 50
) {
  const [notes, tasks, emails, activities] = await Promise.all([
    db.query.leadNotes.findMany({
      where: and(eq(leadNotes.leadId, leadId), eq(leadNotes.orgId, orgId)),
      with: { author: { columns: { id: true, name: true } } },
      orderBy: desc(leadNotes.createdAt),
      limit,
    }),
    db.query.leadTasks.findMany({
      where: and(eq(leadTasks.leadId, leadId), eq(leadTasks.orgId, orgId)),
      orderBy: desc(leadTasks.createdAt),
      limit,
    }),
    db
      .select()
      .from(leadEmails)
      .where(and(eq(leadEmails.leadId, leadId), eq(leadEmails.orgId, orgId)))
      .orderBy(desc(leadEmails.sentAt))
      .limit(limit),
    db
      .select()
      .from(leadActivities)
      .where(
        and(
          eq(leadActivities.leadId, leadId),
          eq(leadActivities.orgId, orgId)
        )
      )
      .orderBy(desc(leadActivities.createdAt))
      .limit(limit),
  ]);

  type TimelineItem = {
    id: number;
    type: "note" | "task" | "email" | "activity";
    timestamp: Date | null;
    data: Record<string, unknown>;
  };

  const timeline: TimelineItem[] = [
    ...notes.map((n) => ({
      id: n.id,
      type: "note" as const,
      timestamp: n.createdAt,
      data: n as unknown as Record<string, unknown>,
    })),
    ...tasks.map((t) => ({
      id: t.id,
      type: "task" as const,
      timestamp: t.createdAt,
      data: t as unknown as Record<string, unknown>,
    })),
    ...emails.map((e) => ({
      id: e.id,
      type: "email" as const,
      timestamp: e.sentAt,
      data: e as unknown as Record<string, unknown>,
    })),
    ...activities.map((a) => ({
      id: a.id,
      type: "activity" as const,
      timestamp: a.createdAt,
      data: a as unknown as Record<string, unknown>,
    })),
  ];

  timeline.sort((a, b) => {
    const aTime = a.timestamp ? new Date(a.timestamp).getTime() : 0;
    const bTime = b.timestamp ? new Date(b.timestamp).getTime() : 0;
    return bTime - aTime;
  });

  return timeline.slice(0, limit);
}

// ─── getLeadSlaAlerts ─────────────────────────────────────────────────────────

export async function getLeadSlaAlerts(
  orgId: string,
  opts?: { role?: string; userId?: string }
) {
  const now = new Date();
  const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

  const slaFilters = [
    eq(leads.orgId, orgId),
    sql`${leads.status} IN ('NEW', 'CONTACTED', 'INTERESTED', 'QUALIFIED')`,
  ];
  if (opts?.role === "SALES" && opts.userId) {
    slaFilters.push(eq(leads.assignedToId, opts.userId));
  }

  const allLeads = await db.query.leads.findMany({
    where: and(...slaFilters),
    with: { assignedTo: { columns: { id: true, name: true } } },
  });

  const slaBreached: {
    leadId: number;
    leadName: string;
    status: string;
    assignedTo: string | null;
    hoursSinceUpdate: number;
    priority: string | null;
  }[] = [];

  for (const lead of allLeads) {
    const updatedAt = lead.updatedAt
      ? new Date(lead.updatedAt)
      : lead.createdAt
        ? new Date(lead.createdAt)
        : now;

    if (updatedAt < twentyFourHoursAgo) {
      const hoursSince = Math.round(
        (now.getTime() - updatedAt.getTime()) / (1000 * 60 * 60)
      );
      slaBreached.push({
        leadId: lead.id,
        leadName: lead.name,
        status: lead.status,
        assignedTo: lead.assignedTo?.name || null,
        hoursSinceUpdate: hoursSince,
        priority: lead.priority,
      });
    }
  }

  slaBreached.sort((a, b) => b.hoursSinceUpdate - a.hoursSinceUpdate);
  return { total: slaBreached.length, leads: slaBreached };
}

// ─── getLeadAnalytics ────────────────────────────────────────────────────────

export async function getLeadAnalytics(
  orgId: string,
  filters?: { dateFrom?: string; dateTo?: string }
) {
  const f = [eq(leads.orgId, orgId)];
  if (filters?.dateFrom) f.push(gte(leads.createdAt, new Date(filters.dateFrom)));
  if (filters?.dateTo) f.push(lte(leads.createdAt, new Date(filters.dateTo + "T23:59:59")));

  const allLeadsData = await db.query.leads.findMany({
    where: and(...f),
    columns: {
      id: true,
      status: true,
      source: true,
      assignedToId: true,
      createdAt: true,
      potentialValue: true,
    },
  });

  const totalLeads = allLeadsData.length;
  const converted = allLeadsData.filter((l) => l.status === "CONVERTED").length;
  const conversionRate = totalLeads > 0 ? Math.round((converted / totalLeads) * 100) : 0;

  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);

  const prevPeriodLeads = await db.query.leads.findMany({
    where: and(
      eq(leads.orgId, orgId),
      gte(leads.createdAt, sixtyDaysAgo),
      lte(leads.createdAt, thirtyDaysAgo)
    ),
    columns: { id: true, status: true },
  });
  const prevTotal = prevPeriodLeads.length;
  const prevConverted = prevPeriodLeads.filter((l) => l.status === "CONVERTED").length;
  const prevConversionRate =
    prevTotal > 0 ? Math.round((prevConverted / prevTotal) * 100) : 0;

  const wonDeals = await db.query.deals.findMany({
    where: and(eq(deals.orgId, orgId), eq(deals.stage, "WON")),
    columns: { value: true, createdAt: true },
  });
  const totalRevenue = wonDeals.reduce((sum, d) => sum + Number(d.value ?? 0), 0);

  const conversionBySource: {
    source: string;
    total: number;
    converted: number;
    rate: number;
  }[] = [];
  const sourceMap = new Map<string, { total: number; converted: number }>();
  for (const l of allLeadsData) {
    const src = l.source ?? "other";
    const entry = sourceMap.get(src) || { total: 0, converted: 0 };
    entry.total++;
    if (l.status === "CONVERTED") entry.converted++;
    sourceMap.set(src, entry);
  }
  for (const [source, data] of sourceMap) {
    conversionBySource.push({
      source: source.replace(/_/g, " "),
      total: data.total,
      converted: data.converted,
      rate: data.total > 0 ? Math.round((data.converted / data.total) * 100) : 0,
    });
  }

  const monthlyRevenue: { month: string; revenue: number }[] = [];
  const monthMap = new Map<string, number>();
  for (const d of wonDeals) {
    const date = d.createdAt;
    if (!date) continue;
    const m = new Date(date);
    const key = `${m.getFullYear()}-${String(m.getMonth() + 1).padStart(2, "0")}`;
    monthMap.set(key, (monthMap.get(key) ?? 0) + Number(d.value ?? 0));
  }
  const sortedMonths = [...monthMap.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .slice(-6);
  for (const [month, revenue] of sortedMonths) {
    monthlyRevenue.push({ month, revenue });
  }

  const orgMembers = await db.query.organizationMembers.findMany({
    where: eq(organizationMembers.orgId, orgId),
    with: { user: { columns: { id: true, name: true, role: true } } },
  });
  const salesUsers = orgMembers
    .filter((m) => m.user.role === "SALES")
    .map((m) => m.user);
  const assignMap = new Map<string, number>();
  for (const l of allLeadsData) {
    if (l.assignedToId)
      assignMap.set(l.assignedToId, (assignMap.get(l.assignedToId) ?? 0) + 1);
  }
  const assignmentDistribution = salesUsers.map((u) => ({
    userId: u.id,
    name: u.name ?? "Unknown",
    count: assignMap.get(u.id) ?? 0,
  }));

  return {
    totalLeads,
    totalLeadsPrevPeriod: prevTotal,
    conversionRate,
    conversionRatePrevPeriod: prevConversionRate,
    totalRevenue,
    conversionBySource,
    monthlyRevenue,
    assignmentDistribution,
  };
}

// ─── getDashboardMetrics ──────────────────────────────────────────────────────

export async function getDashboardMetrics(orgId: string) {
  const [allLeads, allActivities] = await Promise.all([
    db.query.leads.findMany({ where: eq(leads.orgId, orgId) }),
    db.query.leadActivities.findMany({
      where: eq(leadActivities.orgId, orgId),
    }),
  ]);

  const activeClients = allLeads.filter((l) => l.status === "CONVERTED").length;
  const inactiveClients = allLeads.filter((l) => l.status === "LOST").length;
  const totalCalls = allActivities.filter((a) => a.type === "call").length;
  const inPersonMeetings = allActivities.filter(
    (a) => a.type === "meeting" || a.type === "site_visit"
  ).length;

  const now = new Date();
  const followUpDue = allLeads.filter((l) => {
    if (l.status === "CONVERTED" || l.status === "LOST") return false;
    const updated = new Date(l.updatedAt!);
    const daysSince = Math.floor(
      (now.getTime() - updated.getTime()) / (1000 * 60 * 60 * 24)
    );
    return daysSince >= 3;
  }).length;

  return {
    activeClients,
    inactiveClients,
    totalCalls,
    inPersonMeetings,
    followUpDue,
    totalLeads: allLeads.length,
    conversionRate:
      allLeads.length > 0
        ? Math.round((activeClients / allLeads.length) * 1000) / 10
        : 0,
  };
}

// ─── getUnverifiedLeads ───────────────────────────────────────────────────────

export async function getUnverifiedLeads(orgId: string) {
  return db.query.leads.findMany({
    where: and(
      eq(leads.orgId, orgId),
      eq(leads.status, "NEW"),
      sql`${leads.verifiedById} IS NULL`
    ),
    with: { assignedTo: { columns: { id: true, name: true, image: true } } },
    orderBy: [desc(leads.createdAt)],
  });
}

// ─── getLeadClients ───────────────────────────────────────────────────────────

export async function getLeadClients(
  orgId: string,
  filters?: { status?: "active" | "inactive"; search?: string; role?: string; userId?: string }
) {
  const f = [eq(clients.orgId, orgId)];
  if (filters?.role === "SALES" && filters.userId) {
    f.push(eq(clients.accountManagerId, filters.userId));
  }
  if (filters?.status) f.push(eq(clients.status, filters.status));

  let allClients = await db.query.clients.findMany({
    where: and(...f),
    with: {
      accountManager: { columns: { id: true, name: true, image: true } },
      lead: { columns: { id: true, source: true, priority: true } },
    },
    orderBy: [desc(clients.createdAt)],
  });

  if (filters?.search) {
    const s = filters.search.toLowerCase();
    allClients = allClients.filter(
      (c) =>
        c.name.toLowerCase().includes(s) ||
        c.email?.toLowerCase().includes(s) ||
        c.company?.toLowerCase().includes(s)
    );
  }

  return allClients;
}

// ─── getSalesLeaderboard ──────────────────────────────────────────────────────

export async function getSalesLeaderboard(orgId: string) {
  const [allLeads, allActivities] = await Promise.all([
    db.query.leads.findMany({
      where: eq(leads.orgId, orgId),
      columns: {
        id: true,
        status: true,
        assignedToId: true,
        potentialValue: true,
      },
    }),
    db.query.leadActivities.findMany({
      where: eq(leadActivities.orgId, orgId),
      columns: { id: true, type: true, userId: true },
    }),
  ]);

  const userMap = new Map<
    string,
    {
      totalCalls: number;
      totalMeetings: number;
      totalEmails: number;
      leadsAssigned: number;
      leadsConverted: number;
      totalRevenue: number;
      score: number;
    }
  >();

  for (const lead of allLeads) {
    if (!lead.assignedToId) continue;
    const entry = userMap.get(lead.assignedToId) || {
      totalCalls: 0,
      totalMeetings: 0,
      totalEmails: 0,
      leadsAssigned: 0,
      leadsConverted: 0,
      totalRevenue: 0,
      score: 0,
    };
    entry.leadsAssigned++;
    if (lead.status === "CONVERTED") {
      entry.leadsConverted++;
      entry.totalRevenue += Number(lead.potentialValue ?? 0);
    }
    userMap.set(lead.assignedToId, entry);
  }

  for (const activity of allActivities) {
    const entry = userMap.get(activity.userId) || {
      totalCalls: 0,
      totalMeetings: 0,
      totalEmails: 0,
      leadsAssigned: 0,
      leadsConverted: 0,
      totalRevenue: 0,
      score: 0,
    };
    if (activity.type === "call") entry.totalCalls++;
    if (activity.type === "meeting" || activity.type === "site_visit")
      entry.totalMeetings++;
    if (activity.type === "email") entry.totalEmails++;
    userMap.set(activity.userId, entry);
  }

  for (const [, entry] of userMap) {
    entry.score =
      entry.leadsConverted * 50 +
      entry.totalCalls * 5 +
      entry.totalMeetings * 10 +
      entry.totalEmails * 3;
  }

  const userIds = Array.from(userMap.keys());
  const usersData =
    userIds.length > 0
      ? await db.query.users.findMany({
          where: sql`${users.id} = ANY(ARRAY[${sql.join(
            userIds.map((id) => sql`${id}`),
            sql`, `
          )}])`,
          columns: { id: true, name: true, image: true },
        })
      : [];

  const userLookup = new Map(usersData.map((u) => [u.id, u]));

  return Array.from(userMap.entries())
    .map(([userId, data]) => ({
      userId,
      name: userLookup.get(userId)?.name ?? "Unknown",
      image: userLookup.get(userId)?.image ?? null,
      ...data,
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 20);
}

// ─── getSalesTeamCapacity ─────────────────────────────────────────────────────

export async function getSalesTeamCapacity(orgId: string) {
  const salesMembers = await db.query.organizationMembers.findMany({
    where: eq(organizationMembers.orgId, orgId),
    with: {
      user: { columns: { id: true, name: true, image: true, role: true } },
    },
  });
  const salesUsers = salesMembers
    .filter((m) => m.user.role === "SALES")
    .map((m) => m.user);

  const activeLeadsList = await db.query.leads.findMany({
    where: and(
      eq(leads.orgId, orgId),
      sql`${leads.status} NOT IN ('CONVERTED', 'LOST')`,
      sql`${leads.assignedToId} IS NOT NULL`
    ),
    columns: { assignedToId: true },
  });

  const countMap = new Map<string, number>();
  for (const l of activeLeadsList) {
    if (l.assignedToId)
      countMap.set(l.assignedToId, (countMap.get(l.assignedToId) || 0) + 1);
  }

  return salesUsers.map((u) => ({
    id: u.id,
    name: u.name,
    image: u.image,
    activeLeads: countMap.get(u.id) || 0,
  }));
}
