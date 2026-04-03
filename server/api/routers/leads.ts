import { createTRPCRouter, protectedProcedure, adminProcedure } from "@/server/api/trpc";
import { z } from "zod";
import { eq, and, desc, asc, sql, count, gte, lte, like, or } from "drizzle-orm";
import { leads, leadActivities, notifications, tickets, projects, users, departmentMembers, clients, deals, organizationMembers, auditLogs, leaveRequests } from "@/lib/db/schema";
import { inArray } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { sendEmail } from "@/lib/email";
import { logger } from "@/lib/logger";
import { appUrl } from "@/lib/app-url";
import { evaluateAssignmentRules, recalculateLeadScore, applySlaPolicy } from "./lead-auto-triggers";

const leadStatusValues = ["NEW", "CONTACTED", "INTERESTED", "QUALIFIED", "CONVERTED", "LOST"] as const;
const leadSourceValues = ["referral", "campaign", "cold_call", "website", "social_media", "walk_in", "other"] as const;
const activityTypeValues = ["call", "email", "whatsapp", "meeting", "site_visit"] as const;
const leadPriorityValues = ["HOT", "WARM", "COLD"] as const;

export const leadsRouter = createTRPCRouter({
  getAll: protectedProcedure
    .input(z.object({
      status: z.enum(leadStatusValues).optional(),
      priority: z.enum(leadPriorityValues).optional(),
      source: z.enum(leadSourceValues).optional(),
      assignedToId: z.string().optional(),
      search: z.string().optional(),
      sortBy: z.enum(["name", "email", "company", "status", "priority", "source", "score", "potentialValue", "createdAt"]).default("createdAt"),
      sortOrder: z.enum(["asc", "desc"]).default("desc"),
      page: z.number().min(1).default(1),
      limit: z.number().min(10).max(100).default(50),
      dateFrom: z.string().optional(),
      dateTo: z.string().optional(),
    }).optional())
    .query(async ({ ctx, input }) => {
      const orgId = ctx.session.orgId;
      const role = ctx.session.user.role;
      const userId = ctx.session.userId;
      const filters = [eq(leads.orgId, orgId)];

      // SALES role can only see their own assigned leads
      if (role === "SALES") {
        filters.push(eq(leads.assignedToId, userId));
      }

      if (input?.status) filters.push(eq(leads.status, input.status));
      if (input?.priority) filters.push(eq(leads.priority, input.priority));
      if (input?.source) filters.push(eq(leads.source, input.source));
      if (input?.assignedToId) filters.push(eq(leads.assignedToId, input.assignedToId));
      if (input?.dateFrom) filters.push(gte(leads.createdAt, new Date(input.dateFrom)));
      if (input?.dateTo) filters.push(lte(leads.createdAt, new Date(input.dateTo)));
      if (input?.search) {
        const s = `%${input.search.toLowerCase()}%`;
        filters.push(or(
          sql`LOWER(${leads.name}) LIKE ${s}`,
          sql`LOWER(${leads.email}) LIKE ${s}`,
          sql`${leads.phone} LIKE ${s}`,
          sql`LOWER(${leads.company}) LIKE ${s}`,
        )!);
      }

      // Dynamic sort
      const sortCol = input?.sortBy ?? "createdAt";
      const sortDir = input?.sortOrder ?? "desc";
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const colMap: Record<string, any> = {
        name: leads.name, email: leads.email, company: leads.company,
        status: leads.status, priority: leads.priority, source: leads.source,
        score: leads.score, potentialValue: leads.potentialValue, createdAt: leads.createdAt,
      };
      const orderCol = colMap[sortCol] || leads.createdAt;
      const orderFn = sortDir === "asc" ? asc(orderCol) : desc(orderCol);

      const page = input?.page ?? 1;
      const limit = input?.limit ?? 50;
      const offset = (page - 1) * limit;

      const whereClause = and(...filters);

      const [allLeads, totalResult] = await Promise.all([
        ctx.db.query.leads.findMany({
          where: whereClause,
          with: {
            assignedTo: { columns: { id: true, name: true, image: true } },
            campaign: { columns: { id: true, name: true } },
          },
          orderBy: [orderFn],
          limit,
          offset,
        }),
        ctx.db.select({ count: count() }).from(leads).where(whereClause),
      ]);

      const totalCount = totalResult[0]?.count ?? 0;

      return {
        leads: allLeads,
        totalCount,
        page,
        totalPages: Math.ceil(totalCount / limit),
      };
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
      referredBy: z.string().optional(),
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
        referredBy: input.referredBy,
        tags: input.tags,
        assignedToId: input.assignedToId || null,
        assignedById: input.assignedToId ? userId : null,
        assignedAt: input.assignedToId ? new Date() : null,
      }).returning();

      if (input.assignedToId) {
        await ctx.db.insert(notifications).values({
          orgId,
          userId: input.assignedToId,
          type: "INFO",
          title: "New Lead Assigned",
          message: `You have been assigned a new lead: ${input.name}`,
          link: `/crm/leads`,
        });
      }

      // --- Auto-triggers (fire-and-forget; failures must not break lead creation) ---

      // 1. Assignment rules – only when no explicit assignee was provided
      if (!input.assignedToId) {
        try {
          const result = await evaluateAssignmentRules(ctx.db, orgId, newLead.id);
          if (result.assigned) {
            logger.info("Auto-assigned lead via rule", { leadId: newLead.id, userId: result.userId, rule: result.ruleName });
          }
        } catch (err) {
          logger.error("Auto-trigger: assignment rules failed", { leadId: newLead.id, error: err });
        }
      }

      // 2. Scoring rules
      try {
        await recalculateLeadScore(ctx.db, orgId, newLead.id);
      } catch (err) {
        logger.error("Auto-trigger: lead scoring failed", { leadId: newLead.id, error: err });
      }

      // 3. SLA policy based on lead priority
      try {
        await applySlaPolicy(ctx.db, orgId, newLead.id);
      } catch (err) {
        logger.error("Auto-trigger: SLA policy failed", { leadId: newLead.id, error: err });
      }

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

      // --- Auto-trigger: recalculate score when lead fields change ---
      try {
        await recalculateLeadScore(ctx.db, ctx.session.orgId, updated.id);
      } catch (err) {
        logger.error("Auto-trigger: lead scoring on update failed", { leadId: updated.id, error: err });
      }

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

      // Audit log: record the assignment
      try {
        await ctx.db.insert(auditLogs).values({
          action: "lead.assigned",
          userId: ctx.session.userId,
          orgId,
          targetId: String(input.leadId),
          targetType: "lead",
          metadata: {
            previousAssignee: updated.assignedToId,
            newAssignee: input.assignedToId,
            leadName: updated.name,
          },
        });
      } catch (auditErr) {
        logger.error("Failed to write lead assignment audit log", { leadId: input.leadId, error: auditErr });
      }

      await ctx.db.insert(notifications).values({
        orgId,
        userId: input.assignedToId,
        type: "INFO",
        title: "Lead Assigned to You",
        message: `You have been assigned lead: ${updated.name}`,
        link: `/crm/leads/${updated.id}`,
      });

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
          const baseUrl = appUrl;
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
      expectedStatus: z.enum(leadStatusValues).optional(),
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

      // Prevent double conversion
      if (input.status === "CONVERTED") {
        const existing = await ctx.db.query.leads.findFirst({
          where: and(eq(leads.id, input.leadId), eq(leads.orgId, orgId)),
          columns: { status: true },
        });
        if (existing?.status === "CONVERTED") {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Lead has already been converted" });
        }
      }

      const [updated] = await ctx.db.update(leads)
        .set(updateData)
        .where(and(
          eq(leads.id, input.leadId),
          eq(leads.orgId, orgId),
          input.expectedStatus ? eq(leads.status, input.expectedStatus) : undefined
        ))
        .returning();

      if (!updated) {
        throw new TRPCError({ 
          code: "CONFLICT", 
          message: "Lead status has been updated by someone else, or lead not found. Please refresh." 
        });
      }

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
        // Wrap conversion in a transaction to prevent orphaned records on failure
        await ctx.db.transaction(async (tx) => {
          const firstProject = await tx.query.projects.findFirst({
            where: eq(projects.orgId, orgId),
          });

          if (firstProject) {
            // Use advisory lock to prevent ticket number collision
            await tx.execute(sql`SELECT pg_advisory_xact_lock(${firstProject.id})`);
            const ticketCountResult = await tx
              .select({ count: count() })
              .from(tickets)
              .where(eq(tickets.projectId, firstProject.id));
            const nextTicketNumber = (ticketCountResult[0]?.count ?? 0) + 1;

            await tx.insert(tickets).values({
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

          // Check if client already exists for this lead
          const existingClient = await tx.query.clients.findFirst({
            where: and(eq(clients.leadId, updated.id), eq(clients.orgId, orgId)),
          });

          if (!existingClient) {
            await tx.insert(clients).values({
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
          }

          await tx.insert(notifications).values({
            orgId,
            userId: updated.assignedToId || ctx.session.userId,
            type: "SUCCESS",
            title: "Lead Converted",
            message: `Lead "${updated.name}" has been converted to a client.`,
            link: `/crm/leads/${updated.id}`,
          });
        });
      }

      return updated;
    }),

  getBoard: protectedProcedure.query(async ({ ctx }) => {
    const orgId = ctx.session.orgId;
    const role = ctx.session.user.role;
    const userId = ctx.session.userId;

    const filters = [eq(leads.orgId, orgId)];

    // SALES role: only see assigned leads
    if (role === "SALES") {
      filters.push(eq(leads.assignedToId, userId));
    } else if (!["CEO", "HR"].includes(role ?? "")) {
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

  getStats: protectedProcedure
    .input(z.object({
      dateFrom: z.string().optional(),
      dateTo: z.string().optional(),
    }).optional())
    .query(async ({ ctx, input }) => {
    const orgId = ctx.session.orgId;
    const role = ctx.session.user.role;
    const userId = ctx.session.userId;
    const statsFilters = [eq(leads.orgId, orgId)];
    if (role === "SALES") statsFilters.push(eq(leads.assignedToId, userId));

    let allLeads = await ctx.db.query.leads.findMany({
      where: and(...statsFilters),
    });

    if (input?.dateFrom) {
      const from = new Date(input.dateFrom);
      allLeads = allLeads.filter(l => new Date(l.createdAt!) >= from);
    }
    if (input?.dateTo) {
      const to = new Date(input.dateTo);
      to.setHours(23, 59, 59, 999);
      allLeads = allLeads.filter(l => new Date(l.createdAt!) <= to);
    }

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
    const role = ctx.session.user.role;
    const userId = ctx.session.userId;
    const now = new Date();
    const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    const slaFilters = [
      eq(leads.orgId, orgId),
      sql`${leads.status} IN ('NEW', 'CONTACTED', 'INTERESTED', 'QUALIFIED')`,
    ];
    if (role === "SALES") slaFilters.push(eq(leads.assignedToId, userId));

    const allLeads = await ctx.db.query.leads.findMany({
      where: and(...slaFilters),
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
      const role = ctx.session.user.role;
      const userId = ctx.session.userId;
      const filters = [eq(clients.orgId, orgId)];
      if (role === "SALES") filters.push(eq(clients.accountManagerId, userId));
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
    .input(z.object({
      leadIds: z.number().array().min(1),
      skipAbsent: z.boolean().default(true), // true = skip absent, redistribute to present; false = assign anyway (queued)
    }))
    .mutation(async ({ ctx, input }) => {
      const orgId = ctx.session.orgId;
      const userRole = ctx.session.user.role ?? "";
      const allowedRoles = ["CEO", "HR"];

      if (!allowedRoles.includes(userRole)) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only CEO or HR can distribute leads",
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
          inArray(users.role, ["SALES"]),
        ),
        columns: { id: true, name: true, email: true },
      });

      if (salesPeople.length === 0) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "No active sales team members found. Ensure users with SALES role exist and have dashboard access enabled.",
        });
      }

      // Absence detection: check approved leaves for today
      const today = new Date().toISOString().split("T")[0];
      const approvedLeaves = await ctx.db.query.leaveRequests.findMany({
        where: and(
          eq(leaveRequests.orgId, orgId),
          eq(leaveRequests.status, "APPROVED"),
          lte(leaveRequests.startDate, today),
          gte(leaveRequests.endDate, today),
        ),
        columns: { userId: true },
      });
      const absentUserIds = new Set(approvedLeaves.map(l => l.userId));

      // Filter to present sales people if skipAbsent is enabled
      let availableSalesPeople = salesPeople;
      const absentSalesPeople = salesPeople.filter(sp => absentUserIds.has(sp.id));

      if (input.skipAbsent && absentSalesPeople.length > 0) {
        availableSalesPeople = salesPeople.filter(sp => !absentUserIds.has(sp.id));
        if (availableSalesPeople.length === 0) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "All sales team members are on leave today. Cannot distribute leads. Try again with 'Assign anyway' to queue leads.",
          });
        }
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

      // Round-robin distribution using available sales people
      const assignments = new Map<string, typeof leadsToDistribute>();
      for (const sp of availableSalesPeople) {
        assignments.set(sp.id, []);
      }

      for (let i = 0; i < leadsToDistribute.length; i++) {
        const salesPerson = availableSalesPeople[i % availableSalesPeople.length];
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
      const baseUrl = appUrl;
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
        salesPeople: availableSalesPeople.length,
        totalSalesPeople: salesPeople.length,
        absentCount: absentSalesPeople.length,
        absentNames: absentSalesPeople.map(sp => sp.name || "Unknown"),
        summary: [...assignments.entries()].map(([userId, assignedLeads]) => ({
          userId,
          name: availableSalesPeople.find(sp => sp.id === userId)?.name || "Unknown",
          count: assignedLeads.length,
        })),
      };
    }),

  bulkUpdate: adminProcedure
    .input(z.object({
      leadIds: z.array(z.number()).min(1),
      update: z.object({
        status: z.enum(leadStatusValues).optional(),
        priority: z.enum(leadPriorityValues).optional(),
        assignedToId: z.string().optional(),
      }),
    }))
    .mutation(async ({ ctx, input }) => {
      const { leadIds, update } = input;
      const setData: Record<string, unknown> = { updatedAt: new Date() };
      if (update.status) setData.status = update.status;
      if (update.priority) setData.priority = update.priority;
      if (update.assignedToId) {
        setData.assignedToId = update.assignedToId;
        setData.assignedAt = new Date();
        setData.assignedById = ctx.session.userId;
      }

      await ctx.db.update(leads)
        .set(setData)
        .where(and(
          eq(leads.orgId, ctx.session.orgId),
          inArray(leads.id, leadIds),
        ));

      return { updated: leadIds.length };
    }),

  bulkDelete: adminProcedure
    .input(z.object({ leadIds: z.array(z.number()).min(1) }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db.delete(leads)
        .where(and(
          eq(leads.orgId, ctx.session.orgId),
          inArray(leads.id, input.leadIds),
        ));
      return { deleted: input.leadIds.length };
    }),

  /* ─── HR Review Queue ─── */
  getUnverified: adminProcedure.query(async ({ ctx }) => {
    return ctx.db.query.leads.findMany({
      where: and(
        eq(leads.orgId, ctx.session.orgId),
        eq(leads.status, "NEW"),
        sql`${leads.verifiedById} IS NULL`,
      ),
      with: {
        assignedTo: { columns: { id: true, name: true, image: true } },
      },
      orderBy: [desc(leads.createdAt)],
    });
  }),

  verifyLead: adminProcedure
    .input(z.object({
      leadId: z.number(),
      priority: z.enum(leadPriorityValues).optional(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const updateData: Record<string, unknown> = {
        verifiedById: ctx.session.userId,
        updatedAt: new Date(),
      };
      if (input.priority) updateData.priority = input.priority;
      if (input.notes) updateData.notes = input.notes;

      const [updated] = await ctx.db.update(leads)
        .set(updateData)
        .where(and(eq(leads.id, input.leadId), eq(leads.orgId, ctx.session.orgId)))
        .returning();
      if (!updated) throw new TRPCError({ code: "NOT_FOUND" });
      return updated;
    }),

  rejectLead: adminProcedure
    .input(z.object({
      leadId: z.number(),
      reason: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const [updated] = await ctx.db.update(leads)
        .set({
          status: "LOST",
          lostReason: input.reason || "Rejected during review",
          verifiedById: ctx.session.userId,
          updatedAt: new Date(),
        })
        .where(and(eq(leads.id, input.leadId), eq(leads.orgId, ctx.session.orgId)))
        .returning();
      if (!updated) throw new TRPCError({ code: "NOT_FOUND" });
      return updated;
    }),

  getAnalyticsSummary: protectedProcedure
    .input(z.object({
      dateFrom: z.string().optional(),
      dateTo: z.string().optional(),
    }).optional())
    .query(async ({ ctx, input }) => {
      const orgId = ctx.session.orgId;
      const filters = [eq(leads.orgId, orgId)];
      if (input?.dateFrom) filters.push(gte(leads.createdAt, new Date(input.dateFrom)));
      if (input?.dateTo) filters.push(lte(leads.createdAt, new Date(input.dateTo + "T23:59:59")));

      const allLeadsData = await ctx.db.query.leads.findMany({
        where: and(...filters),
        columns: { id: true, status: true, source: true, assignedToId: true, createdAt: true, potentialValue: true },
      });

      const totalLeads = allLeadsData.length;
      const converted = allLeadsData.filter(l => l.status === "CONVERTED").length;
      const conversionRate = totalLeads > 0 ? Math.round((converted / totalLeads) * 100) : 0;

      const now = new Date();
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);

      const prevPeriodLeads = await ctx.db.query.leads.findMany({
        where: and(
          eq(leads.orgId, orgId),
          gte(leads.createdAt, sixtyDaysAgo),
          lte(leads.createdAt, thirtyDaysAgo),
        ),
        columns: { id: true, status: true },
      });
      const prevTotal = prevPeriodLeads.length;
      const prevConverted = prevPeriodLeads.filter(l => l.status === "CONVERTED").length;
      const prevConversionRate = prevTotal > 0 ? Math.round((prevConverted / prevTotal) * 100) : 0;

      const wonDeals = await ctx.db.query.deals.findMany({
        where: and(eq(deals.orgId, orgId), eq(deals.stage, "WON")),
        columns: { value: true, createdAt: true },
      });
      const totalRevenue = wonDeals.reduce((sum, d) => sum + Number(d.value ?? 0), 0);

      const conversionBySource: { source: string; total: number; converted: number; rate: number }[] = [];
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
      const sortedMonths = [...monthMap.entries()].sort((a, b) => a[0].localeCompare(b[0])).slice(-6);
      for (const [month, revenue] of sortedMonths) {
        monthlyRevenue.push({ month, revenue });
      }

      const assignmentDistribution: { userId: string; name: string; count: number }[] = [];
      const orgMembers = await ctx.db.query.organizationMembers.findMany({
        where: eq(organizationMembers.orgId, orgId),
        with: { user: { columns: { id: true, name: true, role: true } } },
      });
      const salesUsers = orgMembers.filter(m => m.user.role === "SALES").map(m => m.user);
      const assignMap = new Map<string, number>();
      for (const l of allLeadsData) {
        if (l.assignedToId) assignMap.set(l.assignedToId, (assignMap.get(l.assignedToId) ?? 0) + 1);
      }
      for (const u of salesUsers) {
        assignmentDistribution.push({
          userId: u.id,
          name: u.name ?? "Unknown",
          count: assignMap.get(u.id) ?? 0,
        });
      }

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
    }),

  getSalesTeamCapacity: adminProcedure.query(async ({ ctx }) => {
    const orgId = ctx.session.orgId;
    const salesMembers = await ctx.db.query.organizationMembers.findMany({
      where: eq(organizationMembers.orgId, orgId),
      with: { user: { columns: { id: true, name: true, image: true, role: true } } },
    });
    const salesUsers = salesMembers
      .filter(m => m.user.role === "SALES")
      .map(m => m.user);

    // Get lead counts per sales person
    const allLeads = await ctx.db.query.leads.findMany({
      where: and(
        eq(leads.orgId, orgId),
        sql`${leads.status} NOT IN ('CONVERTED', 'LOST')`,
        sql`${leads.assignedToId} IS NOT NULL`,
      ),
      columns: { assignedToId: true },
    });

    const countMap = new Map<string, number>();
    for (const l of allLeads) {
      if (l.assignedToId) countMap.set(l.assignedToId, (countMap.get(l.assignedToId) || 0) + 1);
    }

    return salesUsers.map(u => ({
      id: u.id,
      name: u.name,
      image: u.image,
      activeLeads: countMap.get(u.id) || 0,
    }));
  }),

  bulkImport: adminProcedure
    .input(z.object({
      leads: z.array(z.object({
        name: z.string().min(1, "Lead name is required"),
        email: z.string().optional().or(z.literal("")),
        phone: z.string().optional(),
        company: z.string().optional(),
        source: z.enum(leadSourceValues).optional(),
        notes: z.string().optional(),
        city: z.string().optional(),
        designation: z.string().optional(),
        referredBy: z.string().optional(),
        potentialValue: z.string().optional(),
        investmentInterest: z.string().optional(),
        whatsappNumber: z.string().optional(),
        website: z.string().optional(),
        priority: z.enum(leadPriorityValues).optional(),
        tags: z.array(z.string()).optional(),
      })).min(1, "At least one lead is required").max(1000, "Maximum 1000 leads per import"),
      duplicateAction: z.enum(["skip", "update", "import"]).default("skip"),
      autoDistribute: z.boolean().default(true),
    }))
    .mutation(async ({ ctx, input }) => {
      const orgId = ctx.session.orgId;
      const userId = ctx.session.userId;
      const CHUNK_SIZE = 100;

      const importEmails = input.leads.map(l => l.email).filter((e): e is string => !!e && e !== "");
      const importPhones = input.leads.map(l => l.phone).filter((p): p is string => !!p);

      const existingLeads = (importEmails.length > 0 || importPhones.length > 0)
        ? await ctx.db.query.leads.findMany({
            where: and(
              eq(leads.orgId, orgId),
              sql`(${leads.email} IN (${sql.join(importEmails.map(e => sql`${e}`), sql`, `)}) OR ${leads.phone} IN (${sql.join(importPhones.map(p => sql`${p}`), sql`, `)}))`,
            ),
            columns: { id: true, email: true, phone: true },
          })
        : [];

      const dupEmails = new Set(existingLeads.map(l => l.email?.toLowerCase()).filter(Boolean));
      const dupPhones = new Set(existingLeads.map(l => l.phone).filter(Boolean));

      let imported = 0;
      let skipped = 0;
      let updated = 0;
      const importedLeadIds: number[] = [];
      const errors: { row: number; message: string }[] = [];

      for (let i = 0; i < input.leads.length; i += CHUNK_SIZE) {
        const chunk = input.leads.slice(i, i + CHUNK_SIZE);
        const toInsert: typeof chunk = [];

        for (let j = 0; j < chunk.length; j++) {
          const lead = chunk[j];
          const rowNum = i + j + 2;
          const isDuplicate =
            (lead.email && dupEmails.has(lead.email.toLowerCase())) ||
            (lead.phone && dupPhones.has(lead.phone));

          if (isDuplicate) {
            if (input.duplicateAction === "skip") {
              skipped++;
              errors.push({ row: rowNum, message: `Duplicate (${lead.email || lead.phone})` });
              continue;
            } else if (input.duplicateAction === "update") {
              try {
                const matchField = lead.email && dupEmails.has(lead.email.toLowerCase())
                  ? eq(leads.email, lead.email)
                  : eq(leads.phone, lead.phone!);
                await ctx.db.update(leads).set({
                  name: lead.name,
                  company: lead.company || null,
                  notes: lead.notes || null,
                  city: lead.city || null,
                  designation: lead.designation || null,
                  updatedAt: new Date(),
                }).where(and(eq(leads.orgId, orgId), matchField));
                updated++;
              } catch {
                errors.push({ row: rowNum, message: "Failed to update duplicate" });
              }
              continue;
            }
          }

          toInsert.push(lead);
        }

        if (toInsert.length > 0) {
          try {
            const values = toInsert.map(lead => ({
              orgId,
              name: lead.name,
              email: lead.email || null,
              phone: lead.phone || null,
              company: lead.company || null,
              source: lead.source || ("other" as const),
              notes: lead.notes || null,
              city: lead.city || null,
              designation: lead.designation || null,
              referredBy: lead.referredBy || null,
              potentialValue: lead.potentialValue || null,
              investmentInterest: lead.investmentInterest || null,
              whatsappNumber: lead.whatsappNumber || null,
              website: lead.website || null,
              priority: lead.priority || ("WARM" as const),
              tags: lead.tags || null,
              status: "NEW" as const,
              assignedById: userId,
            }));
            const result = await ctx.db.insert(leads).values(values).returning({ id: leads.id });
            imported += result.length;
            importedLeadIds.push(...result.map(r => r.id));
          } catch (err) {
            errors.push({ row: i + 2, message: `Chunk insert failed: ${err instanceof Error ? err.message : "unknown error"}` });
          }
        }
      }

      let distributed = 0;
      let salesPeopleCount = 0;

      if (input.autoDistribute && importedLeadIds.length > 0) {
        try {
          const orgMembers = await ctx.db.query.organizationMembers.findMany({
            where: eq(organizationMembers.orgId, orgId),
            columns: { userId: true },
          });
          const orgMemberIds = orgMembers.map(m => m.userId);

          const salesPeople = orgMemberIds.length > 0
            ? await ctx.db.query.users.findMany({
                where: and(
                  inArray(users.id, orgMemberIds),
                  eq(users.isActive, true),
                  eq(users.hasDashboardAccess, true),
                  inArray(users.role, ["SALES"]),
                ),
                columns: { id: true, name: true },
              })
            : [];

          if (salesPeople.length > 0) {
            salesPeopleCount = salesPeople.length;
            const now = new Date();

            const assignmentMap = new Map<string, number[]>();
            for (const sp of salesPeople) assignmentMap.set(sp.id, []);

            for (let i = 0; i < importedLeadIds.length; i++) {
              const sp = salesPeople[i % salesPeople.length];
              assignmentMap.get(sp.id)!.push(importedLeadIds[i]);
            }

            for (const [salesPersonId, leadIds] of assignmentMap) {
              if (leadIds.length === 0) continue;
              await ctx.db.update(leads)
                .set({
                  assignedToId: salesPersonId,
                  assignedById: userId,
                  assignedAt: now,
                  updatedAt: now,
                })
                .where(and(inArray(leads.id, leadIds), eq(leads.orgId, orgId)));
              distributed += leadIds.length;
            }

            const { createNotification } = await import("@/server/actions/create-notification");
            for (const sp of salesPeople) {
              const assignedCount = assignmentMap.get(sp.id)?.length ?? 0;
              if (assignedCount === 0) continue;
              createNotification({
                orgId,
                userId: sp.id,
                type: "INFO",
                title: "New leads assigned",
                message: `${assignedCount} new lead${assignedCount > 1 ? "s" : ""} have been assigned to you via bulk import`,
                link: "/crm/leads",
              }).catch(() => {});
            }
          }
        } catch (err) {
          logger.error("Auto-distribute failed after bulk import", { error: err });
        }
      }

      return { imported, skipped, updated, errors, duplicatesFound: existingLeads.length, distributed, salesPeopleCount };
    }),

  checkDuplicates: adminProcedure
    .input(z.object({
      emails: z.array(z.string()),
      phones: z.array(z.string()),
    }))
    .query(async ({ ctx, input }) => {
      const orgId = ctx.session.orgId;
      const conditions = [];
      if (input.emails.length > 0) conditions.push(inArray(leads.email, input.emails));
      if (input.phones.length > 0) conditions.push(inArray(leads.phone, input.phones));
      if (conditions.length === 0) return { duplicateEmails: [] as string[], duplicatePhones: [] as string[] };

      const existing = await ctx.db.query.leads.findMany({
        where: and(eq(leads.orgId, orgId), sql`(${sql.join(conditions, sql` OR `)})`),
        columns: { email: true, phone: true },
      });

      return {
        duplicateEmails: existing.map(l => l.email).filter((e): e is string => !!e),
        duplicatePhones: existing.map(l => l.phone).filter((p): p is string => !!p),
      };
    }),
});
