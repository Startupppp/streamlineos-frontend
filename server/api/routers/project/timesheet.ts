import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "../../trpc";
import { isAdminOrOwner } from "../../../../lib/auth-helpers";
import {
  projects,
  tickets,
  timesheets,
  users,
  projectMembers,
} from "../../../../lib/db/schema";
import { eq, and, desc, sql, inArray, gte, lte } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { formatDateOnly } from "../../../../lib/date-utils";
import {
  addTimeEntryInputSchema,
  updateTimeEntryInputSchema,
  deleteTimeEntryInputSchema,
} from "../../../../lib/validations/project";
import {
  getOffset,
  DEFAULT_PAGE,
} from "../../../../lib/pagination";

export const timesheetRouter = createTRPCRouter({
  addTimeEntry: protectedProcedure
    .input(addTimeEntryInputSchema)
    .mutation(async ({ ctx, input }) => {
      const ticket = await ctx.db.query.tickets.findFirst({
          where: and(eq(tickets.id, input.ticketId), eq(tickets.orgId, ctx.session.orgId)),
          columns: { projectId: true },
          with: { project: { columns: { managerId: true, id: true } } }
      });

      if (!ticket || !ticket.project) throw new TRPCError({ code: "NOT_FOUND", message: "Ticket not found" });

      const isOwnerOrAdmin = isAdminOrOwner(ctx.session.user.role);
      const isManager = ticket.project.managerId === ctx.session.userId;

      if (!isOwnerOrAdmin && !isManager) {
          const membership = await ctx.db.query.projectMembers.findFirst({
              where: and(
                  eq(projectMembers.projectId, ticket.project.id),
                  eq(projectMembers.userId, ctx.session.userId)
              )
          });
          if (!membership) {
              throw new TRPCError({ code: "FORBIDDEN", message: "You must be a project member to log time." });
          }
      }

      const [entry] = await ctx.db
        .insert(timesheets)
        .values({
          orgId: ctx.session.orgId,
          userId: ctx.session.userId,
          ticketId: input.ticketId,
          date: formatDateOnly(input.date),
          hours: input.hours.toString(),
          description: input.description || null,
          imageUrl: (input.imageUrl && input.imageUrl.trim() !== "") ? input.imageUrl.trim() : null,
          workLink: (input.workLink && input.workLink.trim() !== "") ? input.workLink.trim() : null,
        })
        .returning();

      const totalHours = await ctx.db
        .select({
          total: sql<number>`COALESCE(SUM(${timesheets.hours}::numeric), 0)`,
        })
        .from(timesheets)
        .where(eq(timesheets.ticketId, input.ticketId));

      await ctx.db
        .update(tickets)
        .set({
          timeSpent: totalHours[0]?.total?.toString() || "0",
        })
        .where(eq(tickets.id, input.ticketId));

      return entry;
    }),

  getTimeEntries: protectedProcedure
    .input(
      z.object({
        ticketId: z.number().optional(),
        userId: z.string().optional(),
        projectId: z.number().optional(),
        startDate: z.string().optional(),
        endDate: z.string().optional(),
        page: z.number().min(1).optional(),
        limit: z.number().min(1).max(100).optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const isOwnerOrAdmin = isAdminOrOwner(ctx.session.user.role);
      const page = input.page || DEFAULT_PAGE;
      const limit = input.limit || 50;
      const offset = getOffset(page, limit);
      const conditions = [eq(timesheets.orgId, ctx.session.orgId)];

      if (input.ticketId) {
        conditions.push(eq(timesheets.ticketId, input.ticketId));
      }
      if (input.userId) {
        conditions.push(eq(timesheets.userId, input.userId));
      }
      if (input.startDate) {
        conditions.push(gte(timesheets.date, input.startDate));
      }
      if (input.endDate) {
        conditions.push(lte(timesheets.date, input.endDate));
      }
      if (!isOwnerOrAdmin && !input.ticketId && input.userId !== ctx.session.userId) {
        conditions.push(eq(timesheets.userId, ctx.session.userId));
      }
      if (input.projectId) {
        conditions.push(
          sql`${timesheets.ticketId} IN (
            SELECT id FROM tickets
            WHERE project_id = ${input.projectId}
            AND org_id = ${ctx.session.orgId}
          )`
        );
      }
      const entries = await ctx.db.query.timesheets.findMany({
        where: and(...conditions),
        orderBy: [desc(timesheets.date)],
        limit,
        offset,
        with: {
          ticket: {
            columns: {
              id: true,
              title: true,
              ticketNumber: true,
              projectId: true,
            },
            with: {
              project: {
                columns: {
                  id: true,
                  name: true,
                  key: true,
                },
              },
            },
          },
        },
      });

      return entries;
    }),

  updateTimeEntry: protectedProcedure
    .input(updateTimeEntryInputSchema)
    .mutation(async ({ ctx, input }) => {
      const entry = await ctx.db.query.timesheets.findFirst({
        where: and(
          eq(timesheets.id, input.entryId),
          eq(timesheets.orgId, ctx.session.orgId)
        ),
        with: {
          ticket: {
            with: {
              project: true
            }
          }
        }
      });

      if (!entry) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Time entry not found" });
      }
      if (entry.status !== "PENDING") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Cannot edit timesheet entry that has been reviewed"
        });
      }
      const isOwnerOrAdmin = isAdminOrOwner(ctx.session.user.role);
      if (!isOwnerOrAdmin && entry.userId !== ctx.session.userId) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You can only edit your own timesheet entries"
        });
      }

      const updateData: { description?: string; hours?: string; updatedAt?: Date } = {
        updatedAt: new Date()
      };

      if (input.description !== undefined) {
        updateData.description = input.description;
      }
      if (input.hours !== undefined) {
        updateData.hours = input.hours.toString();
      }

      const [updated] = await ctx.db
        .update(timesheets)
        .set(updateData)
        .where(eq(timesheets.id, input.entryId))
        .returning();
      if (input.hours !== undefined && entry.ticketId) {
        const totalHours = await ctx.db
          .select({
            total: sql<number>`COALESCE(SUM(${timesheets.hours}::numeric), 0)`,
          })
          .from(timesheets)
          .where(eq(timesheets.ticketId, entry.ticketId));

        await ctx.db
          .update(tickets)
          .set({
            timeSpent: totalHours[0]?.total?.toString() || "0",
          })
          .where(eq(tickets.id, entry.ticketId));
      }

      return updated;
    }),

  deleteTimeEntry: protectedProcedure
    .input(deleteTimeEntryInputSchema)
    .mutation(async ({ ctx, input }) => {
      const entry = await ctx.db.query.timesheets.findFirst({
        where: and(
          eq(timesheets.id, input.entryId),
          eq(timesheets.orgId, ctx.session.orgId)
        ),
        with: {
          ticket: {
            with: {
              project: true
            }
          }
        }
      });

      if (!entry) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Time entry not found" });
      }
      if (entry.status !== "PENDING") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Cannot delete timesheet entry that has been reviewed"
        });
      }
      const isOwnerOrAdmin = isAdminOrOwner(ctx.session.user.role);
      if (!isOwnerOrAdmin && entry.userId !== ctx.session.userId) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You can only delete your own timesheet entries"
        });
      }

      const ticketId = entry.ticketId;

      await ctx.db
        .delete(timesheets)
        .where(eq(timesheets.id, input.entryId));
      if (ticketId) {
        const totalHours = await ctx.db
          .select({
            total: sql<number>`COALESCE(SUM(${timesheets.hours}::numeric), 0)`,
          })
          .from(timesheets)
          .where(eq(timesheets.ticketId, ticketId));

        await ctx.db
          .update(tickets)
          .set({
            timeSpent: totalHours[0]?.total?.toString() || "0",
          })
          .where(eq(tickets.id, ticketId));
      }

      return { success: true };
    }),

  getAllTeamTimesheets: protectedProcedure
    .input(
      z.object({
        userId: z.string().optional(),
        projectId: z.number().optional(),
        startDate: z.string().optional(),
        endDate: z.string().optional(),
        status: z.enum(["PENDING", "APPROVED", "REJECTED"]).optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      if (ctx.session.user.role !== "OWNER" && ctx.session.user.role !== "ADMIN") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only owners and admins can view team timesheets",
        });
      }

      const conditions = [eq(timesheets.orgId, ctx.session.orgId)];

      if (input.userId) {
        conditions.push(eq(timesheets.userId, input.userId));
      }

      if (input.startDate) {
        conditions.push(gte(timesheets.date, input.startDate));
      }

      if (input.endDate) {
        conditions.push(lte(timesheets.date, input.endDate));
      }

      if (input.status) {
        conditions.push(eq(timesheets.status, input.status));
      }
      const entries = await ctx.db
        .select({
          id: timesheets.id,
          userId: timesheets.userId,
          ticketId: timesheets.ticketId,
          date: timesheets.date,
          hours: timesheets.hours,
          description: timesheets.description,
          imageUrl: timesheets.imageUrl,
          workLink: timesheets.workLink,
          status: timesheets.status,
          approvedBy: timesheets.approvedBy,
          approvedAt: timesheets.approvedAt,
          rejectionReason: timesheets.rejectionReason,
          createdAt: timesheets.createdAt,
          user: {
            id: users.id,
            firstName: users.firstName,
            lastName: users.lastName,
            email: users.email,
            image: users.image,
          },
          approver: sql<{
            firstName: string | null;
            lastName: string | null;
          } | null>`
            CASE
              WHEN ${timesheets.approvedBy} IS NOT NULL THEN
                json_build_object(
                  'firstName', (SELECT first_name FROM users WHERE id = ${timesheets.approvedBy}),
                  'lastName', (SELECT last_name FROM users WHERE id = ${timesheets.approvedBy})
                )
              ELSE NULL
            END
          `.as('approver'),
        })
        .from(timesheets)
        .leftJoin(users, eq(timesheets.userId, users.id))
        .where(and(...conditions))
        .orderBy(desc(timesheets.date));
      const ticketIds = entries.map(e => e.ticketId).filter(Boolean) as number[];
      const ticketsMap = new Map();

      if (ticketIds.length > 0) {
        const ticketsData = await ctx.db.query.tickets.findMany({
          where: inArray(tickets.id, ticketIds),
          with: {
            project: true,
          },
        });
        ticketsData.forEach(t => ticketsMap.set(t.id, t));
      }
      const result = entries.map(entry => ({
        ...entry,
        ticket: entry.ticketId ? ticketsMap.get(entry.ticketId) : null,
        approverName: entry.approver
          ? `${entry.approver.firstName || ''} ${entry.approver.lastName || ''}`.trim()
          : null,
      }));

      if (input.projectId) {
        return result.filter((entry) => entry.ticket?.projectId === input.projectId);
      }

      return result;
    }),

  approveTimesheet: protectedProcedure
    .input(z.object({
      timesheetId: z.number(),
    }))
    .mutation(async ({ ctx, input }) => {
      if (ctx.session.user.role !== "OWNER" && ctx.session.user.role !== "ADMIN") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only owners and admins can approve timesheets",
        });
      }

      await ctx.db
        .update(timesheets)
        .set({
          status: "APPROVED",
          approvedBy: ctx.session.userId,
          approvedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(timesheets.id, input.timesheetId),
            eq(timesheets.orgId, ctx.session.orgId)
          )
        );

      return { success: true };
    }),

  rejectTimesheet: protectedProcedure
    .input(z.object({
      timesheetId: z.number(),
      reason: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      if (ctx.session.user.role !== "OWNER" && ctx.session.user.role !== "ADMIN") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only owners and admins can reject timesheets",
        });
      }

      await ctx.db
        .update(timesheets)
        .set({
          status: "REJECTED",
          rejectionReason: input.reason,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(timesheets.id, input.timesheetId),
            eq(timesheets.orgId, ctx.session.orgId)
          )
        );

      return { success: true };
    }),

  bulkApproveTimesheets: protectedProcedure
    .input(z.object({
      timesheetIds: z.array(z.number()),
    }))
    .mutation(async ({ ctx, input }) => {
      if (ctx.session.user.role !== "OWNER" && ctx.session.user.role !== "ADMIN") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only owners and admins can approve timesheets",
        });
      }

      await ctx.db
        .update(timesheets)
        .set({
          status: "APPROVED",
          approvedBy: ctx.session.userId,
          approvedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(
          and(
            inArray(timesheets.id, input.timesheetIds),
            eq(timesheets.orgId, ctx.session.orgId)
          )
        );

      return { success: true, count: input.timesheetIds.length };
    }),

  getBillingSummary: protectedProcedure
    .input(z.object({ startDate: z.date(), endDate: z.date() }))
    .query(async ({ ctx, input }) => {
       if (ctx.session.user.role !== "OWNER" && ctx.session.user.role !== "ADMIN") {
           throw new TRPCError({ code: "FORBIDDEN" });
       }

       const summary = await ctx.db
         .select({
             projectId: projects.id,
             projectName: projects.name,
             totalHours: sql<number>`SUM(${timesheets.hours}::numeric)`,
         })
         .from(timesheets)
         .innerJoin(tickets, eq(timesheets.ticketId, tickets.id))
         .innerJoin(projects, eq(tickets.projectId, projects.id))
         .where(and(
             eq(timesheets.orgId, ctx.session.orgId),
             gte(timesheets.date, formatDateOnly(input.startDate)),
             lte(timesheets.date, formatDateOnly(input.endDate))
         ))
         .groupBy(projects.id, projects.name);

       return summary;
    }),
});
