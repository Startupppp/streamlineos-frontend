import { createTRPCRouter, protectedProcedure } from "../trpc";
import { z } from "zod";
import { eq, and, desc, sql, count } from "drizzle-orm";
import { leads, leadActivities, /* notifications, */ tickets, projects, users, departmentMembers, clients, deals, organizationMembers } from "../../../lib/db/schema";
import { inArray } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { sendEmail } from "../../../lib/email";
import { logger } from "../../../lib/logger";

const leadStatusValues = ["NEW", "CONTACTED", "INTERESTED", "QUALIFIED", "CONVERTED", "LOST"] as const;
const leadSourceValues = ["referral", "campaign", "cold_call", "website", "social_media", "walk_in", "other"] as const;
const activityTypeValues = ["call", "email", "whatsapp", "meeting", "site_visit"] as const;
const leadPriorityValues = ["HOT", "WARM", "COLD"] as const;

export const leadsRouter = createTRPCRouter({
  getAll: protectedProcedure
    .input(z.object({
      status: z.enum(leadStatusValues).optional(),
      assignedToId: z.string().optional(),
      search: z.string().optional(),
      limit: z.number().min(1).max(100).default(50),
      offset: z.number().min(0).default(0),
    }).optional())
    .query(async ({ ctx, input }) => {
      const orgId = ctx.session.orgId;
      const filters = [eq(leads.orgId, orgId)];

      if (input?.status) filters.push(eq(leads.status, input.status));
      if (input?.assignedToId) filters.push(eq(leads.assignedToId, input.assignedToId));

      let allLeads = await ctx.db.query.leads.findMany({
        where: and(...filters),
        with: {
          assignedTo: { columns: { id: true, name: true, image: true } },
          campaign: { columns: { id: true, name: true } },
        },
        orderBy: [desc(leads.createdAt)],
        limit: input?.limit ?? 50,
        offset: input?.offset ?? 0,
      });

      if (input?.search) {
        const s = input.search.toLowerCase();
        allLeads = allLeads.filter(l =>
          l.name.toLowerCase().includes(s) ||
          l.email?.toLowerCase().includes(s) ||
          l.phone?.includes(s) ||
          l.company?.toLowerCase().includes(s)
        );
      }

      return allLeads;
    }),

  getById: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ ctx, input }) => {
      const lead = await ctx.db.query.leads.findFirst({
        where: and(eq(leads.id, input.id), eq(leads.orgId, ctx.session.orgId)),
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

      if (!lead) throw new TRPCError({ code: "NOT_FOUND", message: "Lead not found" });
      return lead;
    }),

  create: protectedProcedure
    .input(z.object({
      name: z.string().min(1),
      email: z.string().email().optional().or(z.literal("")),
      phone: z.string().optional(),
      whatsappNumber: z.string().optional(),
      source: z.enum(leadSourceValues).default("other"),
      campaignId: z.number().optional(),
      investmentInterest: z.string().optional(),
      potentialValue: z.string().optional(),
      notes: z.string().optional(),
      company: z.string().optional(),
      designation: z.string().optional(),
      city: z.string().optional(),
      tags: z.string().array().optional(),
      assignedToId: z.string().optional(),
      priority: z.enum(leadPriorityValues).default("WARM"),
    }))
    .mutation(async ({ ctx, input }) => {
      const orgId = ctx.session.orgId;
      const userId = ctx.session.userId;

      const [newLead] = await ctx.db.insert(leads).values({
        orgId,
        name: input.name,
        email: input.email || null,
        phone: input.phone,
        whatsappNumber: input.whatsappNumber,
        source: input.source,
        campaignId: input.campaignId,
        priority: input.priority,
        investmentInterest: input.investmentInterest,
        potentialValue: input.potentialValue,
        notes: input.notes,
        company: input.company,
        designation: input.designation,
        city: input.city,
        tags: input.tags,
        assignedToId: input.assignedToId || null,
        assignedById: input.assignedToId ? userId : null,
        assignedAt: input.assignedToId ? new Date() : null,
      }).returning();

      // In-app notifications disabled
      // if (input.assignedToId) {
      //   await ctx.db.insert(notifications).values({...});
      // }

      return newLead;
    }),

  update: protectedProcedure
    .input(z.object({
      id: z.number(),
      name: z.string().min(1).optional(),
      email: z.string().email().optional().or(z.literal("")),
      phone: z.string().optional(),
      whatsappNumber: z.string().optional(),
      source: z.enum(leadSourceValues).optional(),
      campaignId: z.number().optional(),
      investmentInterest: z.string().optional(),
      potentialValue: z.string().optional(),
      notes: z.string().optional(),
      company: z.string().optional(),
      designation: z.string().optional(),
      city: z.string().optional(),
      tags: z.string().array().optional(),
      lostReason: z.string().optional(),
      priority: z.enum(leadPriorityValues).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;
      const [updated] = await ctx.db.update(leads)
        .set({ ...data, updatedAt: new Date() })
        .where(and(eq(leads.id, id), eq(leads.orgId, ctx.session.orgId)))
        .returning();

      if (!updated) throw new TRPCError({ code: "NOT_FOUND" });
      return updated;
    }),

  assign: protectedProcedure
    .input(z.object({
      leadId: z.number(),
      assignedToId: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      const orgId = ctx.session.orgId;
      const [updated] = await ctx.db.update(leads)
        .set({
          assignedToId: input.assignedToId,
          assignedById: ctx.session.userId,
          assignedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(and(eq(leads.id, input.leadId), eq(leads.orgId, orgId)))
        .returning();

      if (!updated) throw new TRPCError({ code: "NOT_FOUND" });

      // In-app notifications disabled
      // await ctx.db.insert(notifications).values({...});

      try {
        const assignee = await ctx.db.query.users.findFirst({
          where: eq(users.id, input.assignedToId),
          columns: { email: true, name: true },
        });
        const assigner = await ctx.db.query.users.findFirst({
          where: eq(users.id, ctx.session.userId),
          columns: { name: true },
        });
        if (assignee?.email) {
          const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
          await sendEmail({
            to: assignee.email,
            subject: `Lead Assigned: ${updated.name} — Vaivamm Capital`,
            html: `<!DOCTYPE html><html><body style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;">
              <div style="background:linear-gradient(135deg,#0f2b7f,#1e40af);padding:24px;text-align:center;border-radius:10px 10px 0 0;">
                <h1 style="color:#bd882c;margin:0;font-size:22px;">Vaivamm Capital</h1>
              </div>
              <div style="background:#fff;padding:24px;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 10px 10px;">
                <h2 style="color:#1e40af;margin-top:0;">New Lead Assigned to You</h2>
                <p>Hi <strong>${assignee.name || "Team Member"}</strong>,</p>
                <p><strong>${assigner?.name || "A manager"}</strong> has assigned you the following lead:</p>
                <table style="width:100%;border-collapse:collapse;margin:16px 0;">
                  <tr><td style="padding:8px;color:#6b7280;">Name</td><td style="padding:8px;font-weight:bold;">${updated.name}</td></tr>
                  ${updated.company ? `<tr><td style="padding:8px;color:#6b7280;">Company</td><td style="padding:8px;">${updated.company}</td></tr>` : ""}
                  ${updated.email ? `<tr><td style="padding:8px;color:#6b7280;">Email</td><td style="padding:8px;">${updated.email}</td></tr>` : ""}
                  ${updated.phone ? `<tr><td style="padding:8px;color:#6b7280;">Phone</td><td style="padding:8px;">${updated.phone}</td></tr>` : ""}
                  <tr><td style="padding:8px;color:#6b7280;">Status</td><td style="padding:8px;">${updated.status}</td></tr>
                </table>
                <div style="text-align:center;margin:24px 0;">
                  <a href="${baseUrl}/crm/leads/${updated.id}" style="background:#0f2b7f;color:#bd882c;padding:12px 28px;text-decoration:none;border-radius:6px;font-weight:bold;">View Lead</a>
                </div>
              </div>
            </body></html>`,
          });
        }
      } catch (emailErr) {
        logger.error("Failed to send lead assignment email", { leadId: updated.id, error: emailErr });
      }

      return updated;
    }),

  selfAssign: protectedProcedure
    .input(z.object({ leadId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const [updated] = await ctx.db.update(leads)
        .set({
          assignedToId: ctx.session.userId,
          assignedById: ctx.session.userId,
          assignedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(and(
          eq(leads.id, input.leadId),
          eq(leads.orgId, ctx.session.orgId)
        ))
        .returning();

      if (!updated) throw new TRPCError({ code: "NOT_FOUND" });
      return updated;
    }),

  updateStatus: protectedProcedure
    .input(z.object({
      leadId: z.number(),
      status: z.enum(leadStatusValues),
      lostReason: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const orgId = ctx.session.orgId;
      const updateData: Record<string, unknown> = {
        status: input.status,
        updatedAt: new Date(),
      };

      if (input.status === "CONVERTED") updateData.convertedAt = new Date();
      if (input.status === "LOST" && input.lostReason) updateData.lostReason = input.lostReason;

      const [updated] = await ctx.db.update(leads)
        .set(updateData)
        .where(and(eq(leads.id, input.leadId), eq(leads.orgId, orgId)))
        .returning();

      if (!updated) throw new TRPCError({ code: "NOT_FOUND" });

      // Create a deal record when lead becomes INTERESTED or QUALIFIED
      if (input.status === "INTERESTED" || input.status === "QUALIFIED") {
        // Check if a deal already exists for this lead to avoid duplicates
        const existingDeal = await ctx.db.query.deals.findFirst({
          where: and(eq(deals.leadId, updated.id), eq(deals.orgId, orgId)),
        });

        if (!existingDeal) {
          await ctx.db.insert(deals).values({
            orgId,
            leadId: updated.id,
            name: `${updated.name}${updated.company ? " - " + updated.company : ""}`,
            value: updated.potentialValue || updated.investmentInterest || "0",
            stage: "LEAD",
            contactPerson: updated.name,
            contactEmail: updated.email,
            contactPhone: updated.phone,
            assignedToId: null,
          });
        }
      }

      if (input.status === "CONVERTED") {
        const firstProject = await ctx.db.query.projects.findFirst({
          where: eq(projects.orgId, orgId),
        });

        if (firstProject) {
          const ticketCountResult = await ctx.db
            .select({ count: count() })
            .from(tickets)
            .where(eq(tickets.projectId, firstProject.id));
          const nextTicketNumber = (ticketCountResult[0]?.count ?? 0) + 1;

          await ctx.db.insert(tickets).values({
            orgId,
            title: `Onboard converted lead: ${updated.name}`,
            description: `Lead "${updated.name}" has been converted.\nCompany: ${updated.company || "N/A"}\nEmail: ${updated.email || "N/A"}\nPhone: ${updated.phone || "N/A"}\nPotential Value: ${updated.potentialValue || "N/A"}\nInvestment Interest: ${updated.investmentInterest || "N/A"}`,
            type: "TASK",
            status: "TODO",
            priority: "HIGH",
            projectId: firstProject.id,
            ticketNumber: nextTicketNumber,
            reporterId: ctx.session.userId,
          });
        }

        await ctx.db.insert(clients).values({
          orgId,
          leadId: updated.id,
          name: updated.name,
          email: updated.email,
          phone: updated.phone,
          company: updated.company,
          designation: updated.designation,
          city: updated.city,
          investmentValue: updated.potentialValue,
          accountManagerId: updated.assignedToId,
          status: "active",
        });

        // In-app notifications disabled
        // await ctx.db.insert(notifications).values({...});
      }

      return updated;
    }),

  getBoard: protectedProcedure.query(async ({ ctx }) => {
    const orgId = ctx.session.orgId;
    const role = ctx.session.user.role;
    const userId = ctx.session.userId;

    const filters = [eq(leads.orgId, orgId)];
    if (role === "MEMBER") {
      const teamLeadDepts = await ctx.db.query.departmentMembers.findMany({
        where: and(eq(departmentMembers.userId, userId), eq(departmentMembers.role, "lead")),
      });

      if (teamLeadDepts.length > 0) {
        const deptIds = teamLeadDepts.map(d => d.departmentId);
        const teamMembers = await ctx.db.query.departmentMembers.findMany({
          where: inArray(departmentMembers.departmentId, deptIds),
        });
        const teamUserIds = [...new Set(teamMembers.map(m => m.userId))];
        filters.push(inArray(leads.assignedToId, teamUserIds));
      } else {
        filters.push(eq(leads.assignedToId, userId));
      }
    }

    const allLeads = await ctx.db.query.leads.findMany({
      where: and(...filters),
      with: {
        assignedTo: { columns: { id: true, name: true, image: true } },
      },
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

    return board;
  }),

  getStats: protectedProcedure.query(async ({ ctx }) => {
    const orgId = ctx.session.orgId;
    const allLeads = await ctx.db.query.leads.findMany({
      where: eq(leads.orgId, orgId),
    });

    const total = allLeads.length;
    const byStatus = {
      NEW: allLeads.filter(l => l.status === "NEW").length,
      CONTACTED: allLeads.filter(l => l.status === "CONTACTED").length,
      INTERESTED: allLeads.filter(l => l.status === "INTERESTED").length,
      QUALIFIED: allLeads.filter(l => l.status === "QUALIFIED").length,
      CONVERTED: allLeads.filter(l => l.status === "CONVERTED").length,
      LOST: allLeads.filter(l => l.status === "LOST").length,
    };

    const conversionRate = total > 0 ? (byStatus.CONVERTED / total) * 100 : 0;
    const totalPotentialValue = allLeads.reduce((s, l) => s + Number(l.potentialValue ?? 0), 0);
    const unassigned = allLeads.filter(l => !l.assignedToId).length;

    const now = new Date();
    const thisMonth = allLeads.filter(l => {
      const created = new Date(l.createdAt!);
      return created.getMonth() === now.getMonth() && created.getFullYear() === now.getFullYear();
    }).length;

    return { total, byStatus, conversionRate: Math.round(conversionRate * 10) / 10, totalPotentialValue, unassigned, thisMonth };
  }),

  logActivity: protectedProcedure
    .input(z.object({
      leadId: z.number(),
      type: z.enum(activityTypeValues),
      date: z.string(),
      duration: z.number().optional(),
      subject: z.string().optional(),
      location: z.string().optional(),
      locationLink: z.string().optional(),
      messageSummary: z.string().optional(),
      notes: z.string().optional(),
      outcome: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const [activity] = await ctx.db.insert(leadActivities).values({
        orgId: ctx.session.orgId,
        leadId: input.leadId,
        type: input.type,
        date: new Date(input.date),
        duration: input.duration,
        subject: input.subject,
        location: input.location,
        locationLink: input.locationLink,
        messageSummary: input.messageSummary,
        notes: input.notes,
        outcome: input.outcome,
        userId: ctx.session.userId,
      }).returning();

      return activity;
    }),

  getActivities: protectedProcedure
    .input(z.object({
      leadId: z.number(),
      limit: z.number().default(20),
    }))
    .query(async ({ ctx, input }) => {
      return ctx.db.query.leadActivities.findMany({
        where: and(
          eq(leadActivities.leadId, input.leadId),
          eq(leadActivities.orgId, ctx.session.orgId)
        ),
        with: { user: { columns: { id: true, name: true, image: true } } },
        orderBy: [desc(leadActivities.date)],
        limit: input.limit,
      });
    }),

  getSalesLeaderboard: protectedProcedure.query(async ({ ctx }) => {
    const orgId = ctx.session.orgId;

    const allLeads = await ctx.db.query.leads.findMany({
      where: eq(leads.orgId, orgId),
      columns: { id: true, status: true, assignedToId: true, potentialValue: true },
    });

    const allActivities = await ctx.db.query.leadActivities.findMany({
      where: eq(leadActivities.orgId, orgId),
      columns: { id: true, type: true, userId: true },
    });

    const userMap = new Map<string, {
      totalCalls: number;
      totalMeetings: number;
      totalEmails: number;
      leadsAssigned: number;
      leadsConverted: number;
      totalRevenue: number;
      score: number;
    }>();

    for (const lead of allLeads) {
      if (!lead.assignedToId) continue;
      const entry = userMap.get(lead.assignedToId) || {
        totalCalls: 0, totalMeetings: 0, totalEmails: 0,
        leadsAssigned: 0, leadsConverted: 0, totalRevenue: 0, score: 0,
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
        totalCalls: 0, totalMeetings: 0, totalEmails: 0,
        leadsAssigned: 0, leadsConverted: 0, totalRevenue: 0, score: 0,
      };
      if (activity.type === "call") entry.totalCalls++;
      if (activity.type === "meeting" || activity.type === "site_visit") entry.totalMeetings++;
      if (activity.type === "email") entry.totalEmails++;
      userMap.set(activity.userId, entry);
    }

    for (const [, entry] of userMap) {
      entry.score = (entry.leadsConverted * 50) + (entry.totalCalls * 5) + (entry.totalMeetings * 10) + (entry.totalEmails * 3);
    }

    const userIds = Array.from(userMap.keys());
    const usersData = userIds.length > 0
      ? await ctx.db.query.users.findMany({
          where: sql`${users.id} = ANY(ARRAY[${sql.join(userIds.map(id => sql`${id}`), sql`, `)}])`,
          columns: { id: true, name: true, image: true },
        })
      : [];

    const userLookup = new Map(usersData.map(u => [u.id, u]));

    return Array.from(userMap.entries())
      .map(([userId, data]) => ({
        userId,
        name: userLookup.get(userId)?.name ?? "Unknown",
        image: userLookup.get(userId)?.image ?? null,
        ...data,
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 20);
  }),

  getSlaAlerts: protectedProcedure.query(async ({ ctx }) => {
    const orgId = ctx.session.orgId;
    const now = new Date();
    const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    const allLeads = await ctx.db.query.leads.findMany({
      where: and(
        eq(leads.orgId, orgId),
        sql`${leads.status} IN ('NEW', 'CONTACTED', 'INTERESTED', 'QUALIFIED')`
      ),
      with: {
        assignedTo: { columns: { id: true, name: true } },
      },
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
      const updatedAt = lead.updatedAt ? new Date(lead.updatedAt) : lead.createdAt ? new Date(lead.createdAt) : now;
      if (updatedAt < twentyFourHoursAgo) {
        const hoursSince = Math.round((now.getTime() - updatedAt.getTime()) / (1000 * 60 * 60));
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

    return {
      total: slaBreached.length,
      leads: slaBreached,
    };
  }),

  getClients: protectedProcedure
    .input(z.object({
      status: z.enum(["active", "inactive"]).optional(),
      search: z.string().optional(),
    }).optional())
    .query(async ({ ctx, input }) => {
      const orgId = ctx.session.orgId;
      const filters = [eq(clients.orgId, orgId)];
      if (input?.status) filters.push(eq(clients.status, input.status));

      let allClients = await ctx.db.query.clients.findMany({
        where: and(...filters),
        with: {
          accountManager: { columns: { id: true, name: true, image: true } },
          lead: { columns: { id: true, source: true, priority: true } },
        },
        orderBy: [desc(clients.createdAt)],
      });

      if (input?.search) {
        const s = input.search.toLowerCase();
        allClients = allClients.filter(c =>
          c.name.toLowerCase().includes(s) ||
          c.email?.toLowerCase().includes(s) ||
          c.company?.toLowerCase().includes(s)
        );
      }

      return allClients;
    }),

  getDashboardMetrics: protectedProcedure.query(async ({ ctx }) => {
    const orgId = ctx.session.orgId;

    const allLeads = await ctx.db.query.leads.findMany({
      where: eq(leads.orgId, orgId),
    });

    const allActivities = await ctx.db.query.leadActivities.findMany({
      where: eq(leadActivities.orgId, orgId),
    });

    const activeClients = allLeads.filter(l => l.status === "CONVERTED").length;
    const inactiveClients = allLeads.filter(l => l.status === "LOST").length;
    const totalCalls = allActivities.filter(a => a.type === "call").length;
    const inPersonMeetings = allActivities.filter(a => a.type === "meeting" || a.type === "site_visit").length;

    const now = new Date();
    const followUpLeads = allLeads.filter(l => {
      if (l.status === "CONVERTED" || l.status === "LOST") return false;
      const updated = new Date(l.updatedAt!);
      const daysSince = Math.floor((now.getTime() - updated.getTime()) / (1000 * 60 * 60 * 24));
      return daysSince >= 3;
    });

    return {
      activeClients,
      inactiveClients,
      totalCalls,
      inPersonMeetings,
      followUpDue: followUpLeads.length,
      totalLeads: allLeads.length,
      conversionRate: allLeads.length > 0 ? Math.round((activeClients / allLeads.length) * 1000) / 10 : 0,
    };
  }),

  distributeToSales: protectedProcedure
    .input(z.object({ leadIds: z.number().array().min(1) }))
    .mutation(async ({ ctx, input }) => {
      const orgId = ctx.session.orgId;
      const userRole = ctx.session.user.role ?? "";
      const allowedRoles = ["CEO", "ADMIN", "HR", "MARKETING", "DIGITAL_MARKETING"];

      if (!allowedRoles.includes(userRole)) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only CEO, ADMIN, HR, or MARKETING roles can distribute leads",
        });
      }

      // Get active sales team members who are org members
      const orgMembers = await ctx.db.query.organizationMembers.findMany({
        where: eq(organizationMembers.orgId, orgId),
        columns: { userId: true },
      });
      const orgMemberIds = orgMembers.map(m => m.userId);

      if (orgMemberIds.length === 0) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "No organization members found" });
      }

      const salesPeople = await ctx.db.query.users.findMany({
        where: and(
          inArray(users.id, orgMemberIds),
          eq(users.isActive, true),
          eq(users.hasDashboardAccess, true),
          inArray(users.role, ["SALES", "SALES_MANAGER"]),
        ),
        columns: { id: true, name: true, email: true },
      });

      if (salesPeople.length === 0) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "No active sales team members found. Ensure users with SALES or SALES_MANAGER role exist and have dashboard access enabled.",
        });
      }

      // Verify leads belong to this org
      const leadsToDistribute = await ctx.db.query.leads.findMany({
        where: and(
          inArray(leads.id, input.leadIds),
          eq(leads.orgId, orgId),
        ),
      });

      if (leadsToDistribute.length === 0) {
        throw new TRPCError({ code: "NOT_FOUND", message: "No valid leads found to distribute" });
      }

      // Round-robin distribution
      const assignments = new Map<string, typeof leadsToDistribute>();
      for (const sp of salesPeople) {
        assignments.set(sp.id, []);
      }

      for (let i = 0; i < leadsToDistribute.length; i++) {
        const salesPerson = salesPeople[i % salesPeople.length];
        assignments.get(salesPerson.id)!.push(leadsToDistribute[i]);
      }

      // Update leads with assignments
      const now = new Date();
      for (const [salesPersonId, assignedLeads] of assignments) {
        if (assignedLeads.length === 0) continue;

        const leadIds = assignedLeads.map(l => l.id);
        await ctx.db.update(leads)
          .set({
            assignedToId: salesPersonId,
            assignedById: ctx.session.userId,
            assignedAt: now,
            updatedAt: now,
          })
          .where(and(
            inArray(leads.id, leadIds),
            eq(leads.orgId, orgId),
          ));
      }

      // Send email notifications to each sales person
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
      const assignerName = ctx.session.user.name || "A manager";

      for (const sp of salesPeople) {
        const assignedLeads = assignments.get(sp.id) || [];
        if (assignedLeads.length === 0 || !sp.email) continue;

        try {
          const leadRows = assignedLeads.map(l =>
            `<tr>
              <td style="padding:8px;border-bottom:1px solid #e5e7eb;">${l.name}</td>
              <td style="padding:8px;border-bottom:1px solid #e5e7eb;">${l.company || "N/A"}</td>
              <td style="padding:8px;border-bottom:1px solid #e5e7eb;">${l.status}</td>
            </tr>`
          ).join("");

          await sendEmail({
            to: sp.email,
            subject: `${assignedLeads.length} New Lead${assignedLeads.length > 1 ? "s" : ""} Assigned — Vaivamm Capital`,
            html: `<!DOCTYPE html><html><body style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;">
              <div style="background:linear-gradient(135deg,#0f2b7f,#1e40af);padding:24px;text-align:center;border-radius:10px 10px 0 0;">
                <h1 style="color:#bd882c;margin:0;font-size:22px;">Vaivamm Capital</h1>
              </div>
              <div style="background:#fff;padding:24px;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 10px 10px;">
                <h2 style="color:#1e40af;margin-top:0;">New Leads Assigned to You</h2>
                <p>Hi <strong>${sp.name || "Team Member"}</strong>,</p>
                <p><strong>${assignerName}</strong> has distributed <strong>${assignedLeads.length}</strong> lead${assignedLeads.length > 1 ? "s" : ""} to you:</p>
                <table style="width:100%;border-collapse:collapse;margin:16px 0;">
                  <tr style="background:#f3f4f6;">
                    <th style="padding:8px;text-align:left;">Name</th>
                    <th style="padding:8px;text-align:left;">Company</th>
                    <th style="padding:8px;text-align:left;">Status</th>
                  </tr>
                  ${leadRows}
                </table>
                <div style="text-align:center;margin:24px 0;">
                  <a href="${baseUrl}/crm/leads" style="background:#0f2b7f;color:#bd882c;padding:12px 28px;text-decoration:none;border-radius:6px;font-weight:bold;">View Leads</a>
                </div>
              </div>
            </body></html>`,
          });
        } catch (emailErr) {
          logger.error("Failed to send lead distribution email", { salesPersonId: sp.id, error: emailErr });
        }
      }

      return {
        distributed: leadsToDistribute.length,
        salesPeople: salesPeople.length,
      };
    }),

  bulkImport: protectedProcedure
    .input(z.object({
      leads: z.array(z.object({
        name: z.string().min(1, "Lead name is required"),
        email: z.string().email().optional().or(z.literal("")),
        phone: z.string().optional(),
        company: z.string().optional(),
        source: z.enum(leadSourceValues).optional(),
        notes: z.string().optional(),
      })).min(1, "At least one lead is required").max(500, "Maximum 500 leads per import"),
    }))
    .mutation(async ({ ctx, input }) => {
      const orgId = ctx.session.orgId;
      const userId = ctx.session.userId;

      const valuesToInsert = input.leads.map(lead => ({
        orgId,
        name: lead.name,
        email: lead.email || null,
        phone: lead.phone || null,
        company: lead.company || null,
        source: lead.source || ("other" as const),
        notes: lead.notes || null,
        status: "NEW" as const,
        priority: "WARM" as const,
        assignedById: userId,
      }));

      const inserted = await ctx.db.insert(leads).values(valuesToInsert).returning({ id: leads.id });

      return { imported: inserted.length };
    }),
});
