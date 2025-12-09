import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import {
  projects,
  tickets,
  sprints,
  ticketComments,
  ticketAttachments,
  ticketLabels,
  ticketLabelMappings,
  timesheets,
} from "@/lib/db/schema";
import { eq, and, desc, sql } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { format } from "date-fns";
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
} from "@/lib/validations/project";

export const projectRouter = createTRPCRouter({
  getProjects: protectedProcedure.query(async ({ ctx }) => {
    return await ctx.db.query.projects.findMany({
      where: eq(projects.orgId, ctx.session.orgId),
      orderBy: [desc(projects.id)],
    });
  }),

  getProjectDetails: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ ctx, input }) => {
      const project = await ctx.db.query.projects.findFirst({
        where: and(eq(projects.id, input.id), eq(projects.orgId, ctx.session.orgId)),
        with: {
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
      const [project] = await ctx.db
        .insert(projects)
        .values({
          orgId: ctx.session.orgId,
          name: input.name,
          description: input.description,
          managerId: input.managerId,
          clientId: input.clientId,
          startDate: input.startDate,
          endDate: input.endDate,
          status: "ACTIVE",
        })
        .returning();
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
        .where(and(eq(projects.id, input.projectId), eq(projects.orgId, ctx.session.orgId)));
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

  createSprint: protectedProcedure.input(createSprintInputSchema).mutation(async ({ ctx, input }) => {
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

  updateSprint: protectedProcedure.input(updateSprintInputSchema).mutation(async ({ ctx, input }) => {
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
      .where(and(eq(sprints.id, sprintId), eq(sprints.orgId, ctx.session.orgId)));
  }),

  createTicket: protectedProcedure.input(createTicketInputSchema).mutation(async ({ ctx, input }) => {
    const [ticket] = await ctx.db
      .insert(tickets)
      .values({
        orgId: ctx.session.orgId,
        projectId: input.projectId,
        title: input.title,
        description: input.description,
        type: (input.type === "FEATURE" ? "STORY" : input.type) as "EPIC" | "STORY" | "TASK" | "BUG",
        priority: input.priority || "MEDIUM",
        assigneeId: input.assigneeId,
        reporterId: input.reporterId || ctx.session.userId,
        sprintId: input.sprintId,
        epicId: input.epicId,
        points: input.points,
        originalEstimate: input.originalEstimate?.toString(),
        status: "TODO",
      })
      .returning();
    return ticket;
  }),

  updateTicket: protectedProcedure.input(updateTicketInputSchema).mutation(async ({ ctx, input }) => {
    const { ticketId, ...updateData } = input;
    await ctx.db
      .update(tickets)
      .set({
        ...(updateData.title && { title: updateData.title }),
        ...(updateData.description !== undefined && { description: updateData.description }),
        ...(updateData.type && { type: updateData.type }),
        ...(updateData.status && { status: updateData.status }),
        ...(updateData.priority && { priority: updateData.priority }),
        ...(updateData.assigneeId !== undefined && { assigneeId: updateData.assigneeId }),
        ...(updateData.sprintId !== undefined && { sprintId: updateData.sprintId }),
        ...(updateData.epicId !== undefined && { epicId: updateData.epicId }),
        ...(updateData.points !== undefined && { points: updateData.points }),
        ...(updateData.originalEstimate !== undefined && {
          originalEstimate: updateData.originalEstimate.toString(),
        }),
        updatedAt: new Date(),
      })
      .where(and(eq(tickets.id, ticketId), eq(tickets.orgId, ctx.session.orgId)));
  }),

  updateTicketStatus: protectedProcedure
    .input(updateTicketStatusInputSchema)
    .mutation(async ({ ctx, input }) => {
      await ctx.db
        .update(tickets)
        .set({ status: input.status, updatedAt: new Date() })
        .where(and(eq(tickets.id, input.ticketId), eq(tickets.orgId, ctx.session.orgId)));
    }),

  getTicketDetails: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ ctx, input }) => {
      const ticket = await ctx.db.query.tickets.findFirst({
        where: and(eq(tickets.id, input.id), eq(tickets.orgId, ctx.session.orgId)),
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

  addComment: protectedProcedure.input(addCommentInputSchema).mutation(async ({ ctx, input }) => {
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

  addAttachment: protectedProcedure.input(addAttachmentInputSchema).mutation(async ({ ctx, input }) => {
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

  createLabel: protectedProcedure.input(createLabelInputSchema).mutation(async ({ ctx, input }) => {
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

  addTimeEntry: protectedProcedure.input(addTimeEntryInputSchema).mutation(async ({ ctx, input }) => {
    const [entry] = await ctx.db
      .insert(timesheets)
      .values({
        orgId: ctx.session.orgId,
        userId: ctx.session.userId,
        ticketId: input.ticketId,
        date: input.date,
        hours: input.hours.toString(),
        description: input.description,
      })
      .returning();

    const totalHours = await ctx.db
      .select({ total: sql<number>`COALESCE(SUM(${timesheets.hours}::numeric), 0)` })
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
    .input(z.object({ ticketId: z.number().optional(), userId: z.string().optional() }))
    .query(async ({ ctx, input }) => {
      const conditions = [eq(timesheets.orgId, ctx.session.orgId)];
      if (input.ticketId) {
        conditions.push(eq(timesheets.ticketId, input.ticketId));
      }
      if (input.userId) {
        conditions.push(eq(timesheets.userId, input.userId));
      }
      return await ctx.db.query.timesheets.findMany({
        where: and(...conditions),
        orderBy: [desc(timesheets.date)],
      });
    }),

  getSprintBurndown: protectedProcedure
    .input(z.object({ sprintId: z.number() }))
    .query(async ({ ctx, input }) => {
      const sprint = await ctx.db.query.sprints.findFirst({
        where: and(eq(sprints.id, input.sprintId), eq(sprints.orgId, ctx.session.orgId)),
        with: {
          tickets: true,
        },
      });

      if (!sprint) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Sprint not found" });
      }

      const startDate = new Date(sprint.startDate);
      const endDate = new Date(sprint.endDate);
      const totalPoints = sprint.tickets.reduce((sum, t) => sum + (t.points || 0), 0);
      const days = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));

      const idealBurndown = Array.from({ length: days + 1 }, (_, i) => {
        const date = new Date(startDate);
        date.setDate(date.getDate() + i);
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

      const completedTickets = sprint.tickets.filter((t) => t.status === "DONE");
      const completedPointsByDate = new Map<string, number>();

      completedTickets.forEach((ticket) => {
        const ticketEntries = allTimeEntries.filter((e) => e.ticketId === ticket.id);
        if (ticketEntries.length > 0) {
          const lastEntry = ticketEntries.reduce((latest, entry) => {
            return new Date(entry.date) > new Date(latest.date) ? entry : latest;
          });
          const dateKey = format(new Date(lastEntry.date), "yyyy-MM-dd");
          const currentPoints = completedPointsByDate.get(dateKey) || 0;
          completedPointsByDate.set(dateKey, currentPoints + (ticket.points || 0));
        }
      });

      const actualBurndown = Array.from(completedPointsByDate.entries()).map(([date, points]) => ({
        date,
        points,
      }));

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
});
