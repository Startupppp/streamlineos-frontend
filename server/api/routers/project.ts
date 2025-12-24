import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "../trpc";
import {
  projects,
  tickets,
  sprints,
  ticketComments,
  ticketAttachments,
  ticketLabels,
  ticketLabelMappings,
  timesheets,
  organizationMembers,
  users,
  projectStatuses,
  projectMembers,
} from "../../../lib/db/schema";
import { eq, and, desc, asc, sql, or, inArray, gte, lte } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { format, differenceInCalendarDays, addDays } from "date-fns";
import {
  createTicketInputSchema,
  updateTicketInputSchema,
  updateTicketStatusInputSchema,
  updateProjectSettingsInputSchema,
  createProjectInputSchema,
  createSprintInputSchema,
  updateSprintInputSchema,
  addCommentInputSchema,
  addAttachmentInputSchema,
  createLabelInputSchema,
  addTimeEntryInputSchema,
} from "../../../lib/validations/project";

export const projectRouter = createTRPCRouter({
  getProjects: protectedProcedure.query(async ({ ctx }) => {
    const isOwnerOrAdmin = ctx.session.user.role === "OWNER" || ctx.session.user.role === "ADMIN";

    if (isOwnerOrAdmin) {
      return await ctx.db.query.projects.findMany({
        where: eq(projects.orgId, ctx.session.orgId),
        orderBy: [desc(projects.id)],
      });
    }

    const memberOf = await ctx.db
      .select({ projectId: projectMembers.projectId })
      .from(projectMembers)
      .where(eq(projectMembers.userId, ctx.session.userId));

    const projectIds = memberOf.map((m) => m.projectId);

    return await ctx.db.query.projects.findMany({
      where: and(
        eq(projects.orgId, ctx.session.orgId),
        or(
          eq(projects.managerId, ctx.session.userId),
          projectIds.length > 0 ? inArray(projects.id, projectIds) : undefined
        )
      ),
      orderBy: [desc(projects.id)],
    });
  }),

  getProjectMembers: protectedProcedure.query(async ({ ctx }) => {
    const members = await ctx.db
      .select({
        id: users.id,
        name: users.name,
        firstName: users.firstName,
        lastName: users.lastName,
        image: users.image,
        email: users.email,
        role: organizationMembers.role,
      })
      .from(organizationMembers)
      .innerJoin(users, eq(organizationMembers.userId, users.id))
      .where(eq(organizationMembers.orgId, ctx.session.orgId));
    return members;
  }),

  getProjectDetails: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ ctx, input }) => {
      const isOwnerOrAdmin = ctx.session.user.role === "OWNER" || ctx.session.user.role === "ADMIN";

      let whereClause;
      if (isOwnerOrAdmin) {
          whereClause = and(
              eq(projects.id, input.id),
              eq(projects.orgId, ctx.session.orgId)
          );
      } else {
          // Check membership or manager
          const memberOf = await ctx.db.query.projectMembers.findFirst({
              where: and(
                  eq(projectMembers.projectId, input.id),
                  eq(projectMembers.userId, ctx.session.userId)
              )
          });
          const isMember = !!memberOf;

          whereClause = and(
              eq(projects.id, input.id),
              eq(projects.orgId, ctx.session.orgId),
              or(
                  eq(projects.managerId, ctx.session.userId),
                  isMember ? undefined : sql`1=0` // If not member and not manager (checked in query), return empty?
                  // Better: Just check manual membership boolean
              )
          );
          
          if (!isMember) {
              // If not member, rely on query matching managerId.
               whereClause = and(
                  eq(projects.id, input.id),
                  eq(projects.orgId, ctx.session.orgId),
                  eq(projects.managerId, ctx.session.userId)
               );
          } else {
               // If member, standard check
               whereClause = and(
                  eq(projects.id, input.id),
                  eq(projects.orgId, ctx.session.orgId)
               );
          }
      }
      // Re-simplifying logic to match getProjects style
      const memberOf = await ctx.db
            .select({ projectId: projectMembers.projectId })
            .from(projectMembers)
            .where(and(eq(projectMembers.userId, ctx.session.userId), eq(projectMembers.projectId, input.id)));

      const isMember = memberOf.length > 0;

      if (!isOwnerOrAdmin && !isMember) {
           whereClause = and(
               eq(projects.id, input.id),
               eq(projects.orgId, ctx.session.orgId),
               eq(projects.managerId, ctx.session.userId)
           );
      } else {
           whereClause = and(
               eq(projects.id, input.id),
               eq(projects.orgId, ctx.session.orgId)
           );
      }

      const project = await ctx.db.query.projects.findFirst({
        where: whereClause,
        with: {
          members: {
             with: {
                 user: true
             }
          },
          tickets: {
            with: {
              assignee: true,
              reporter: true,
              comments: {
                with: {
                  user: true,
                },
                orderBy: [desc(ticketComments.createdAt)],
              },
              attachments: true,
              labels: {
                with: {
                  label: true,
                },
              },
            },
          },
        },
      });
      return project;
    }),

  createProject: protectedProcedure
    .input(createProjectInputSchema)
    .mutation(async ({ ctx, input }) => {
      // Generate key if not provided: Uppercase first 3 chars or random
      let projectKey = input.key;
      if (!projectKey) {
          const namePart = input.name.replace(/[^a-zA-Z]/g, "").substring(0, 3).toUpperCase();
          const randomPart = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
          projectKey = (namePart.length >= 2 ? namePart : "PRJ") + "-" + randomPart;
      }

      const [project] = await ctx.db
        .insert(projects)
        .values({
          orgId: ctx.session.orgId,
          key: projectKey, // Added key
          name: input.name,
          description: input.description,
          managerId: input.managerId,
          clientId: input.clientId,
          startDate: input.startDate,
          endDate: input.endDate,
          status: "ACTIVE",
        })
        .returning();

      // Seed default statuses
      const defaultStatuses = [
          { name: "TODO", order: 0, color: "#e2e8f0" },
          { name: "IN_PROGRESS", order: 1, color: "#3b82f6" },
          { name: "IN_REVIEW", order: 2, color: "#eab308" },
          { name: "DONE", order: 3, color: "#22c55e" },
      ];

      await ctx.db.insert(projectStatuses).values(
          defaultStatuses.map(s => ({
              orgId: ctx.session.orgId,
              projectId: project.id,
              name: s.name,
              order: s.order,
              color: s.color,
          }))
      );

      // Add members if provided
      if (input.memberIds && input.memberIds.length > 0) {
          await ctx.db.insert(projectMembers).values(
              input.memberIds.map(userId => ({
                  projectId: project.id,
                  userId: userId,
                  role: "CONTRIBUTOR",
              }))
          );
      }

      return project;
    }),

  updateProjectSettings: protectedProcedure
    .input(updateProjectSettingsInputSchema)
    .mutation(async ({ ctx, input }) => {
      await ctx.db
        .update(projects)
        .set({
          name: input.name,
          description: input.description,
          status: input.status,
          managerId: input.managerId,
          clientId: input.clientId,
          startDate: input.startDate,
          endDate: input.endDate,
        })
        .where(
          and(
            eq(projects.orgId, ctx.session.orgId)
          )
        );

      if (input.memberIds) {
        // Remove existing members
        await ctx.db
          .delete(projectMembers)
          .where(eq(projectMembers.projectId, input.projectId));

        // Add new members
        if (input.memberIds.length > 0) {
          await ctx.db.insert(projectMembers).values(
            input.memberIds.map((userId) => ({
              projectId: input.projectId,
              userId,
              role: "CONTRIBUTOR",
            }))
          );
        }
      }
    }),

  getSprints: protectedProcedure
    .input(z.object({ projectId: z.number().optional() }))
    .query(async ({ ctx, input }) => {
      const conditions = [eq(sprints.orgId, ctx.session.orgId)];
      if (input.projectId) {
        conditions.push(eq(sprints.projectId, input.projectId));
      }
      return await ctx.db.query.sprints.findMany({
        where: and(...conditions),
        with: {
          tickets: {
            with: {
              assignee: true,
            },
          },
        },
        orderBy: [desc(sprints.startDate)],
      });
    }),

  createSprint: protectedProcedure
    .input(createSprintInputSchema)
    .mutation(async ({ ctx, input }) => {
      const [sprint] = await ctx.db
        .insert(sprints)
        .values({
          orgId: ctx.session.orgId,
          projectId: input.projectId,
          name: input.name,
          startDate: input.startDate,
          endDate: input.endDate,
          goal: input.goal,
          status: "PLANNED",
        })
        .returning();
      return sprint;
    }),

  updateSprint: protectedProcedure
    .input(updateSprintInputSchema)
    .mutation(async ({ ctx, input }) => {
      const { sprintId, ...updateData } = input;
      await ctx.db
        .update(sprints)
        .set({
          ...(updateData.name && { name: updateData.name }),
          ...(updateData.startDate && { startDate: updateData.startDate }),
          ...(updateData.endDate && { endDate: updateData.endDate }),
          ...(updateData.goal !== undefined && { goal: updateData.goal }),
          ...(updateData.status && { status: updateData.status }),
        })
        .where(
          and(eq(sprints.id, sprintId), eq(sprints.orgId, ctx.session.orgId))
        );
    }),

  createTicket: protectedProcedure
    .input(createTicketInputSchema)
    .mutation(async ({ ctx, input }) => {
      const [ticket] = await ctx.db
        .insert(tickets)
        .values({
          orgId: ctx.session.orgId,
          projectId: input.projectId,
          title: input.title,
          description: input.description,
          type: (input.type === "FEATURE" ? "STORY" : input.type) as
            | "EPIC"
            | "STORY"
            | "TASK"
            | "BUG",
          priority: input.priority || "MEDIUM",
          assigneeId: input.assigneeId,
          reporterId: input.reporterId || ctx.session.userId,
          sprintId: input.sprintId,
          epicId: input.epicId,
          points: input.points,
          link: input.link,
          originalEstimate: input.originalEstimate?.toString(),
          status: "TODO",
        })
        .returning();
      return ticket;
    }),

  updateTicket: protectedProcedure
    .input(updateTicketInputSchema)
    .mutation(async ({ ctx, input }) => {
      const { ticketId, ...updateData } = input;
      await ctx.db
        .update(tickets)
        .set({
          ...(updateData.title && { title: updateData.title }),
          ...(updateData.description !== undefined && {
            description: updateData.description,
          }),
          ...(updateData.type && {
            type: updateData.type as "EPIC" | "STORY" | "TASK" | "BUG",
          }),
          ...(updateData.status && { status: updateData.status }),
          ...(updateData.priority && { priority: updateData.priority }),
          ...(updateData.assigneeId !== undefined && {
            assigneeId: updateData.assigneeId,
          }),
          ...(updateData.sprintId !== undefined && {
            sprintId: updateData.sprintId,
          }),
          ...(updateData.epicId !== undefined && { epicId: updateData.epicId }),
          ...(updateData.points !== undefined && { points: updateData.points }),
          ...(updateData.originalEstimate !== undefined && {
            originalEstimate: updateData.originalEstimate.toString(),
          }),
          updatedAt: new Date(),
        })
        .where(
          and(eq(tickets.id, ticketId), eq(tickets.orgId, ctx.session.orgId))
        );
    }),

  updateTicketStatus: protectedProcedure
    .input(updateTicketStatusInputSchema)
    .mutation(async ({ ctx, input }) => {
      await ctx.db
        .update(tickets)
        .set({ status: input.status, updatedAt: new Date() })
        .where(
          and(
            eq(tickets.id, input.ticketId),
            eq(tickets.orgId, ctx.session.orgId)
          )
        );
    }),

  deleteTicket: protectedProcedure
    .input(z.object({ ticketId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      // Delete related records first (cascade should handle this if set up, but let's be safe or rely on constraints)
      // Assuming simplified deletion for now or cascade constraints exist. 
      // If not, we might need to delete from mapping tables.
      // Based on typical schema, cascade might not be everywhere.
      // Let's check schema.ts later if this fails, but for now strict delete from tickets.
      
      await ctx.db
        .delete(tickets)
        .where(
          and(eq(tickets.id, input.ticketId), eq(tickets.orgId, ctx.session.orgId))
        );
    }),

  getTicketDetails: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ ctx, input }) => {
      const ticket = await ctx.db.query.tickets.findFirst({
        where: and(
          eq(tickets.id, input.id),
          eq(tickets.orgId, ctx.session.orgId)
        ),
        with: {
          project: true,
          sprint: true,
          assignee: true,
          reporter: true,
          comments: {
            with: {
              user: true,
            },
            orderBy: [desc(ticketComments.createdAt)],
          },
          attachments: {
            with: {
              uploader: true,
            },
          },
          labels: {
            with: {
              label: true,
            },
          },
        },
      });
      return ticket;
    }),

  addComment: protectedProcedure
    .input(addCommentInputSchema)
    .mutation(async ({ ctx, input }) => {
      const [comment] = await ctx.db
        .insert(ticketComments)
        .values({
          orgId: ctx.session.orgId,
          ticketId: input.ticketId,
          userId: ctx.session.userId,
          content: input.content,
          parentCommentId: input.parentCommentId,
        })
        .returning();
      return comment;
    }),

  addAttachment: protectedProcedure
    .input(addAttachmentInputSchema)
    .mutation(async ({ ctx, input }) => {
      const [attachment] = await ctx.db
        .insert(ticketAttachments)
        .values({
          orgId: ctx.session.orgId,
          ticketId: input.ticketId,
          fileUrl: input.fileUrl,
          fileName: input.fileName,
          fileSize: input.fileSize,
          mimeType: input.mimeType,
          uploadedBy: ctx.session.userId,
        })
        .returning();
      return attachment;
    }),

  getLabels: protectedProcedure.query(async ({ ctx }) => {
    return await ctx.db.query.ticketLabels.findMany({
      where: eq(ticketLabels.orgId, ctx.session.orgId),
      orderBy: [desc(ticketLabels.createdAt)],
    });
  }),

  createLabel: protectedProcedure
    .input(createLabelInputSchema)
    .mutation(async ({ ctx, input }) => {
      const [label] = await ctx.db
        .insert(ticketLabels)
        .values({
          orgId: ctx.session.orgId,
          name: input.name,
          color: input.color || "#3B82F6",
        })
        .returning();
      return label;
    }),

  addLabelToTicket: protectedProcedure
    .input(z.object({ ticketId: z.number(), labelId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db.insert(ticketLabelMappings).values({
        ticketId: input.ticketId,
        labelId: input.labelId,
      });
    }),

  removeLabelFromTicket: protectedProcedure
    .input(z.object({ ticketId: z.number(), labelId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db
        .delete(ticketLabelMappings)
        .where(
          and(
            eq(ticketLabelMappings.ticketId, input.ticketId),
            eq(ticketLabelMappings.labelId, input.labelId)
          )
        );
    }),

  addTimeEntry: protectedProcedure
    .input(addTimeEntryInputSchema)
    .mutation(async ({ ctx, input }) => {
      // PERMISSION CHECK
      const ticket = await ctx.db.query.tickets.findFirst({
          where: eq(tickets.id, input.ticketId),
          columns: { projectId: true },
          with: { project: { columns: { managerId: true, id: true } } }
      });

      if (!ticket || !ticket.project) throw new TRPCError({ code: "NOT_FOUND", message: "Ticket not found" });

      const isOwnerOrAdmin = ctx.session.user.role === "OWNER" || ctx.session.user.role === "ADMIN";
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
          date: format(input.date, "yyyy-MM-dd"),
          hours: input.hours.toString(),
          description: input.description,
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
      })
    )
    .query(async ({ ctx, input }) => {
      const conditions = [eq(timesheets.orgId, ctx.session.orgId)];
      const isOwnerOrAdmin = ctx.session.user.role === "OWNER" || ctx.session.user.role === "ADMIN";

      if (input.ticketId) {
        conditions.push(eq(timesheets.ticketId, input.ticketId));
      }
      if (input.userId) {
        conditions.push(eq(timesheets.userId, input.userId));
      }
      
      // If not admin and no specific ticket context, restrict to own timesheets.
      // E.g. "My Timesheets" page.
      if (!isOwnerOrAdmin && !input.ticketId && input.userId !== ctx.session.userId) {
          conditions.push(eq(timesheets.userId, ctx.session.userId));
      }

      return await ctx.db.query.timesheets.findMany({
        where: and(...conditions),
        orderBy: [desc(timesheets.date)],
        with: {
            ticket: {
                with: {
                    project: true
                }
            }
        }
      });
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
             gte(timesheets.date, format(input.startDate, "yyyy-MM-dd")),
             lte(timesheets.date, format(input.endDate, "yyyy-MM-dd"))
         ))
         .groupBy(projects.id, projects.name);
         
       return summary;
    }),

  getSprintBurndown: protectedProcedure
    .input(z.object({ sprintId: z.number() }))
    .query(async ({ ctx, input }) => {
      const sprint = await ctx.db.query.sprints.findFirst({
        where: and(
          eq(sprints.id, input.sprintId),
          eq(sprints.orgId, ctx.session.orgId)
        ),
        with: {
          tickets: true,
        },
      });

      if (!sprint) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Sprint not found" });
      }

      const totalPoints = sprint.tickets.reduce(
        (sum, ticket) => sum + (ticket.points || 0),
        0
      );

      const startDate = new Date(sprint.startDate);
      const endDate = new Date(sprint.endDate);
      const days = differenceInCalendarDays(endDate, startDate) + 1;

      const idealBurndown = Array.from({ length: days }).map((_, i) => {
        const date = addDays(startDate, i);
        const remainingDays = days - i;
        const idealPoints = Math.max(0, (totalPoints / days) * remainingDays);
        return { date, points: idealPoints };
      });

      const allTimeEntries = await ctx.db.query.timesheets.findMany({
        where: and(
          eq(timesheets.orgId, ctx.session.orgId),
          sql`${timesheets.ticketId} IN (SELECT id FROM tickets WHERE sprint_id = ${input.sprintId})`
        ),
        with: {
          ticket: true,
        },
      });

      const completedTickets = sprint.tickets.filter(
        (t) => t.status === "DONE"
      );
      const completedPointsByDate = new Map<string, number>();

      completedTickets.forEach((ticket) => {
        const ticketEntries = allTimeEntries.filter(
          (e) => e.ticketId === ticket.id
        );
        if (ticketEntries.length > 0) {
          const lastEntry = ticketEntries.reduce((latest, entry) => {
            return new Date(entry.date) > new Date(latest.date)
              ? entry
              : latest;
          });
          const dateKey = format(new Date(lastEntry.date), "yyyy-MM-dd");
          const currentPoints = completedPointsByDate.get(dateKey) || 0;
          completedPointsByDate.set(
            dateKey,
            currentPoints + (ticket.points || 0)
          );
        }
      });

      const actualBurndown = Array.from(completedPointsByDate.entries()).map(
        ([date, points]) => ({
          date,
          points,
        })
      );

      let cumulativePoints = 0;
      const actualBurndownCumulative = idealBurndown.map((ideal) => {
        const dateKey = format(ideal.date, "yyyy-MM-dd");
        const dayPoints = completedPointsByDate.get(dateKey) || 0;
        cumulativePoints += dayPoints;
        return {
          date: ideal.date,
          points: totalPoints - cumulativePoints,
        };
      });

      return {
        sprint,
        totalPoints,
        idealBurndown,
        actualBurndown: actualBurndownCumulative,
      };
    }),

  createProjectStatus: protectedProcedure
    .input(z.object({
        projectId: z.number(),
        name: z.string(),
        color: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
        // Get max order
        const existingStatuses = await ctx.db.query.projectStatuses.findMany({
            where: and(
                eq(projectStatuses.projectId, input.projectId),
                eq(projectStatuses.orgId, ctx.session.orgId)
            ),
            orderBy: [desc(projectStatuses.order)],
            limit: 1,
        });
        const nextOrder = (existingStatuses[0]?.order ?? -1) + 1;

        const [status] = await ctx.db.insert(projectStatuses).values({
            orgId: ctx.session.orgId,
            projectId: input.projectId,
            name: input.name,
            color: input.color,
            order: nextOrder,
        }).returning();
        return status;
    }),

  updateProjectStatusOrder: protectedProcedure
    .input(z.object({
        projectId: z.number(),
        statusIds: z.array(z.number()), // Ordered list of IDs
    }))
    .mutation(async ({ ctx, input }) => {
        // Transaction to update orders
        await ctx.db.transaction(async (tx) => {
            for (let i = 0; i < input.statusIds.length; i++) {
                await tx.update(projectStatuses)
                    .set({ order: i })
                    .where(and(
                        eq(projectStatuses.id, input.statusIds[i]),
                        eq(projectStatuses.projectId, input.projectId),
                        eq(projectStatuses.orgId, ctx.session.orgId)
                    ));
            }
        });
    }),
  deleteProjectStatus: protectedProcedure
    .input(z.object({
        statusId: z.number(),
        projectId: z.number(),
    }))
    .mutation(async ({ ctx, input }) => {
        // Check if there are tickets with this status name
        // We need the name first
        const status = await ctx.db.query.projectStatuses.findFirst({
            where: eq(projectStatuses.id, input.statusId),
        });

        if (!status) return;

        // Check tickets
        const conflictTickets = await ctx.db.query.tickets.findMany({
            where: and(
                eq(tickets.projectId, input.projectId),
                eq(tickets.status, status.name)
            ),
            limit: 1,
        });

        if (conflictTickets.length > 0) {
            throw new TRPCError({
                code: "PRECONDITION_FAILED", 
                message: "Cannot delete status with existing tickets. Move them first."
            });
        }

        await ctx.db.delete(projectStatuses)
            .where(and(
                eq(projectStatuses.id, input.statusId),
                eq(projectStatuses.orgId, ctx.session.orgId)
            ));
    }),
});
