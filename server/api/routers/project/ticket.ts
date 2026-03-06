import { z } from "zod";
import { logger } from "../../../../lib/logger";
import { createTRPCRouter, protectedProcedure } from "../../trpc";
import {
  projects,
  tickets,
  ticketComments,
  ticketAttachments,
  ticketLabels,
  ticketLabelMappings,
  users,
  projectMembers,
} from "../../../../lib/db/schema";
import { eq, and, desc, sql, inArray } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import {
  createTicketInputSchema,
  updateTicketInputSchema,
  updateTicketStatusInputSchema,
  addCommentInputSchema,
  addAttachmentInputSchema,
  createLabelInputSchema,
} from "../../../../lib/validations/project";
import {
  createPaginatedResponse,
  getOffset,
  DEFAULT_PAGE,
  DEFAULT_LIMIT,
} from "../../../../lib/pagination";
import {
  sendTicketAssignmentEmail,
  sendTicketReviewRequestEmail,
  sendTicketChangesRequestedEmail,
} from "../../../../lib/email";

function normalizeTicketType(type: string): string {
  const upper = type.toUpperCase();
  return upper === "FEATURE" ? "STORY" : upper;
}

export const ticketRouter = createTRPCRouter({
  createTicket: protectedProcedure
    .input(createTicketInputSchema)
    .mutation(async ({ ctx, input }) => {
      const [ticket] = await ctx.db.transaction(async (tx) => {
        const maxTicketResult = await tx
          .select({ maxTicketNumber: sql<number>`COALESCE(MAX(${tickets.ticketNumber}), 0)` })
          .from(tickets)
          .where(
            and(
              eq(tickets.projectId, input.projectId),
              eq(tickets.orgId, ctx.session.orgId)
            )
          );

        const nextTicketNumber = (maxTicketResult[0]?.maxTicketNumber || 0) + 1;

        return await tx
          .insert(tickets)
          .values({
            orgId: ctx.session.orgId,
            projectId: input.projectId,
            ticketNumber: nextTicketNumber,
            title: input.title,
            description: input.description,
            type: normalizeTicketType(input.type),
            priority: input.priority || "MEDIUM",
            assigneeId: input.assigneeId,
            reporterId: input.reporterId || ctx.session.userId,
            sprintId: input.sprintId,
            epicId: input.epicId,
            points: input.points,
            link: input.link,
            originalEstimate: input.originalEstimate?.toString(),
            parentTicketId: input.parentTicketId,
            status: input.status || "TODO",
          })
          .returning();
      });
      if (input.assigneeId) {
        try {
          const [assignee, creator, project] = await Promise.all([
            ctx.db.query.users.findFirst({
              where: eq(users.id, input.assigneeId),
            }),
            ctx.db.query.users.findFirst({
              where: eq(users.id, input.reporterId || ctx.session.userId),
            }),
            ctx.db.query.projects.findFirst({
              where: eq(projects.id, input.projectId),
            }),
          ]);

          if (assignee?.email && creator && project) {
            await sendTicketAssignmentEmail(
              assignee.email,
              assignee.name || assignee.firstName || 'Team Member',
              input.title,
              input.type,
              input.priority || 'MEDIUM',
              project.name,
              input.projectId,
              ticket.id,
              creator.name || creator.firstName || 'Team Member'
            );
          }
        } catch (emailError) {
          logger.error("Failed to send ticket assignment email", { error: emailError });
        }
      }

      return ticket;
    }),

  updateTicket: protectedProcedure
    .input(updateTicketInputSchema)
    .mutation(async ({ ctx, input }) => {
      const { ticketId, ...updateData } = input;
      const updateFields: Record<string, unknown> = {
        updatedAt: new Date(),
      };

      if (updateData.title) {
        updateFields.title = updateData.title;
      }
      if (updateData.description !== undefined) {
        updateFields.description = updateData.description;
      }
      if (updateData.type) {
        updateFields.type = normalizeTicketType(updateData.type);
      }
      if (updateData.status) {
        updateFields.status = updateData.status;
      }
      if (updateData.priority) {
        updateFields.priority = updateData.priority;
      }
      if (updateData.assigneeId !== undefined) {
        updateFields.assigneeId =
          updateData.assigneeId === "" || updateData.assigneeId === "unassigned"
            ? null
            : updateData.assigneeId;
      }
      if (updateData.sprintId !== undefined) {
        updateFields.sprintId = updateData.sprintId;
      }
      if (updateData.epicId !== undefined) {
        updateFields.epicId = updateData.epicId;
      }
      if (updateData.points !== undefined) {
        updateFields.points = updateData.points;
      }
      if (updateData.originalEstimate !== undefined) {
        updateFields.originalEstimate = updateData.originalEstimate.toString();
      }

      try {
        await ctx.db
          .update(tickets)
          .set(updateFields)
          .where(
            and(eq(tickets.id, ticketId), eq(tickets.orgId, ctx.session.orgId))
          );

        return { success: true };
      } catch (error) {
        logger.error("Update ticket error", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to update ticket",
        });
      }
    }),

  updateTicketStatus: protectedProcedure
    .input(updateTicketStatusInputSchema)
    .mutation(async ({ ctx, input }) => {
      const oldTicket = await ctx.db.query.tickets.findFirst({
        where: and(
          eq(tickets.id, input.ticketId),
          eq(tickets.orgId, ctx.session.orgId)
        ),
        with: {
          assignee: true,
          reporter: true,
          project: true,
        },
      });

      await ctx.db
        .update(tickets)
        .set({ status: input.status, updatedAt: new Date() })
        .where(
          and(
            eq(tickets.id, input.ticketId),
            eq(tickets.orgId, ctx.session.orgId)
          )
        );

      if (oldTicket && oldTicket.status !== input.status) {
        try {
          const currentUser = await ctx.db.query.users.findFirst({
            where: eq(users.id, ctx.session.userId),
          });

          if (input.status === 'IN_REVIEW' && oldTicket.reporter?.email) {
            await sendTicketReviewRequestEmail(
              oldTicket.reporter.email,
              oldTicket.reporter.name || oldTicket.reporter.firstName || 'Team Member',
              oldTicket.title,
              oldTicket.type || 'TASK',
              oldTicket.project?.name || 'Project',
              oldTicket.projectId!,
              oldTicket.id,
              currentUser?.name || currentUser?.firstName || 'Team Member',
              undefined
            );
          }

          if (
            oldTicket.status === 'IN_REVIEW' &&
            input.status === 'IN_PROGRESS' &&
            oldTicket.assignee?.email
          ) {
            await sendTicketChangesRequestedEmail(
              oldTicket.assignee.email,
              oldTicket.assignee.name || oldTicket.assignee.firstName || 'Team Member',
              oldTicket.title,
              oldTicket.project?.name || 'Project',
              oldTicket.projectId!,
              oldTicket.id,
              currentUser?.name || currentUser?.firstName || 'Reviewer',
              undefined
            );
          }
        } catch (emailError) {
          logger.error("Failed to send ticket status change email", { error: emailError });
        }
      }
    }),

  deleteTicket: protectedProcedure
    .input(z.object({ ticketId: z.number() }))
    .mutation(async ({ ctx, input }) => {
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

  getSubtasks: protectedProcedure
    .input(z.object({ parentTicketId: z.number() }))
    .query(async ({ ctx, input }) => {
      return await ctx.db.query.tickets.findMany({
        where: and(
          eq(tickets.parentTicketId, input.parentTicketId),
          eq(tickets.orgId, ctx.session.orgId)
        ),
        with: {
          assignee: true,
        },
        orderBy: [desc(tickets.createdAt)],
      });
    }),

  getEmployeeProjects: protectedProcedure
    .input(z.object({ userId: z.string() }))
    .query(async ({ ctx, input }) => {
      const userProjects = await ctx.db
        .select({
            project: {
                id: projects.id,
                name: projects.name,
                description: projects.description,
                status: projects.status,
            },
            role: projectMembers.role,
        })
        .from(projectMembers)
        .innerJoin(projects, eq(projectMembers.projectId, projects.id))
        .where(eq(projectMembers.userId, input.userId));

      if (userProjects.length === 0) return [];
      const projectIds = userProjects.map(p => p.project.id);

      const ticketStats = await ctx.db
        .select({
            projectId: tickets.projectId,
            status: tickets.status,
            count: sql<number>`count(*)`.mapWith(Number),
        })
        .from(tickets)
        .where(and(
            eq(tickets.assigneeId, input.userId),
            inArray(tickets.projectId, projectIds)
        ))
        .groupBy(tickets.projectId, tickets.status);
      return userProjects.map(({ project, role }) => {
          const stats = ticketStats.filter(s => s.projectId === project.id);
          const todo = stats.find(s => s.status === 'TODO')?.count || 0;
          const inProgress = stats.find(s => s.status === 'IN_PROGRESS')?.count || 0;
          const done = stats.find(s => s.status === 'DONE')?.count || 0;
          const total = stats.reduce((acc, curr) => acc + curr.count, 0);

          return {
              ...project,
              role,
              stats: {
                  todo,
                  inProgress,
                  done,
                  total
              }
          };
      });
    }),

  getEmployeeTickets: protectedProcedure
    .input(z.object({
      userId: z.string(),
      page: z.number().min(1).optional(),
      limit: z.number().min(1).max(100).optional(),
      status: z.string().optional(),
    }))
    .query(async ({ ctx, input }) => {
      const page = input.page || DEFAULT_PAGE;
      const limit = input.limit || DEFAULT_LIMIT;
      const offset = getOffset(page, limit);

      const conditions = [
        eq(tickets.assigneeId, input.userId),
        eq(tickets.orgId, ctx.session.orgId),
      ];

      if (input.status) {
        conditions.push(eq(tickets.status, input.status));
      }
      const [countResult] = await ctx.db
        .select({ count: sql<number>`count(*)` })
        .from(tickets)
        .where(and(...conditions));

      const total = Number(countResult?.count || 0);
      const userTickets = await ctx.db.query.tickets.findMany({
        where: and(...conditions),
        with: {
          project: {
            columns: {
              id: true,
              name: true,
              key: true,
            },
          },
          sprint: {
            columns: {
              id: true,
              name: true,
            },
          },
        },
        orderBy: [desc(tickets.updatedAt)],
        limit,
        offset,
      });

      return createPaginatedResponse(userTickets, total, page, limit);
    }),

  updateTicketOrder: protectedProcedure
    .input(z.object({
        projectId: z.number(),
        items: z.array(z.object({
            id: z.number(),
            status: z.string(),
            order: z.number(),
        })),
    }))
    .mutation(async ({ ctx, input }) => {
        if (input.items.length === 0) return;
        await ctx.db.transaction(async (tx) => {
            for (const item of input.items) {
                await tx.update(tickets)
                    .set({
                        status: item.status,
                        order: item.order,
                        updatedAt: new Date(),
                    })
                    .where(and(
                        eq(tickets.id, item.id),
                        eq(tickets.orgId, ctx.session.orgId)
                    ));
            }
        });
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
      const ticket = await ctx.db.query.tickets.findFirst({
        where: and(eq(tickets.id, input.ticketId), eq(tickets.orgId, ctx.session.orgId)),
        columns: { id: true },
      });
      if (!ticket) throw new TRPCError({ code: "NOT_FOUND", message: "Ticket not found" });

      const label = await ctx.db.query.ticketLabels.findFirst({
        where: and(eq(ticketLabels.id, input.labelId), eq(ticketLabels.orgId, ctx.session.orgId)),
        columns: { id: true },
      });
      if (!label) throw new TRPCError({ code: "NOT_FOUND", message: "Label not found" });

      await ctx.db.insert(ticketLabelMappings).values({
        ticketId: input.ticketId,
        labelId: input.labelId,
      });
    }),

  removeLabelFromTicket: protectedProcedure
    .input(z.object({ ticketId: z.number(), labelId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const ticket = await ctx.db.query.tickets.findFirst({
        where: and(eq(tickets.id, input.ticketId), eq(tickets.orgId, ctx.session.orgId)),
        columns: { id: true },
      });
      if (!ticket) throw new TRPCError({ code: "NOT_FOUND", message: "Ticket not found" });

      await ctx.db
        .delete(ticketLabelMappings)
        .where(
          and(
            eq(ticketLabelMappings.ticketId, input.ticketId),
            eq(ticketLabelMappings.labelId, input.labelId)
          )
        );
    }),
});
