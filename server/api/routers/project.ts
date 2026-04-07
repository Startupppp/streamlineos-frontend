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
import { eq, and, desc, sql, or, inArray, gte, lte } from "drizzle-orm";
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
  updateTimeEntryInputSchema,
  deleteTimeEntryInputSchema,
} from "../../../lib/validations/project";
import { 
  sendProjectAssignmentEmail, 
  sendTicketAssignmentEmail,
  sendTicketReviewRequestEmail,
  sendTicketChangesRequestedEmail,
} from "../../../lib/email";

export const projectRouter = createTRPCRouter({
  getProjects: protectedProcedure.query(async ({ ctx }) => {
    const isOwnerOrAdmin = ctx.session.user.role === "OWNER" || ctx.session.user.role === "ADMIN";

    // OWNER/ADMIN can see all projects in the list
    if (isOwnerOrAdmin) {
      return await ctx.db.query.projects.findMany({
        where: eq(projects.orgId, ctx.session.orgId),
        orderBy: [desc(projects.id)],
      });
    }

    // Regular users can only see projects they are assigned to
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
      .where(
        and(
          eq(organizationMembers.orgId, ctx.session.orgId),
          eq(users.isActive, true)
        )
      );
    return members;
  }),

  getProjectDetails: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ ctx, input }) => {
      // Everyone must be manager or member to access project details
      const memberOf = await ctx.db
            .select({ projectId: projectMembers.projectId })
            .from(projectMembers)
            .where(and(eq(projectMembers.userId, ctx.session.userId), eq(projectMembers.projectId, input.id)));

      const isMember = memberOf.length > 0;
      
      // Check if user is manager
      const projectCheck = await ctx.db.query.projects.findFirst({
        where: and(
          eq(projects.id, input.id),
          eq(projects.orgId, ctx.session.orgId)
        )
      });

      if (!projectCheck) {
        return null;
      }

      const isManager = projectCheck.managerId === ctx.session.userId;
      
      // Only allow access if user is manager OR member
      if (!isManager && !isMember) {
        return null;
      }

      const project = await ctx.db.query.projects.findFirst({
        where: and(
          eq(projects.id, input.id),
          eq(projects.orgId, ctx.session.orgId)
        ),
        with: {
          members: {
             with: {
                 user: true
             }
          },
          tickets: {
            where: and(
              eq(tickets.projectId, input.id),
              eq(tickets.orgId, ctx.session.orgId)
            ),
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
      return project ?? null;
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
          settings: {
              modules: input.modules || {
                  sprints: true,
                  epics: true,
                  timeTracking: true,
                  wiki: true
              }
          }
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

          // Send email notifications to added members
          console.log(`[PROJECT CREATE] Adding ${input.memberIds.length} members to new project`);
          
          const currentUser = await ctx.db.query.users.findFirst({
            where: eq(users.id, ctx.session.userId),
          });

          const addedMembers = await ctx.db.query.users.findMany({
            where: inArray(users.id, input.memberIds),
          });

          console.log(`[PROJECT CREATE] Found ${addedMembers.length} members to notify`);

          for (const member of addedMembers) {
            console.log(`[PROJECT CREATE] Processing member: ${member.email}, has email: ${!!member.email}`);
            if (member.email) {
              try {
                console.log(`[PROJECT CREATE] Sending email to ${member.email}...`);
                await sendProjectAssignmentEmail(
                  member.email,
                  member.name || member.firstName || 'Team Member',
                  input.name,
                  projectKey,
                  project.id,
                  currentUser?.name || currentUser?.firstName || undefined
                );
                console.log(`[PROJECT CREATE] Email sent successfully to ${member.email}`);
              } catch (emailError) {
                console.error(`[PROJECT CREATE] Failed to send assignment email to ${member.email}:`, emailError);
              }
            }
          }
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
            eq(projects.orgId, ctx.session.orgId),
            eq(projects.id, input.projectId)
          )
        );

      if (input.memberIds) {
        // Get existing member IDs before deletion
        const existingMembers = await ctx.db
          .select({ userId: projectMembers.userId })
          .from(projectMembers)
          .where(eq(projectMembers.projectId, input.projectId));
        
        const existingMemberIds = new Set(existingMembers.map(m => m.userId));

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

          // Send email notifications to newly added members only
          const newMemberIds = input.memberIds.filter(id => !existingMemberIds.has(id));
          
          console.log(`[PROJECT UPDATE] Existing members: ${existingMemberIds.size}, New members to notify: ${newMemberIds.length}`);
          
          if (newMemberIds.length > 0) {
            const [currentUser, project, newMembers] = await Promise.all([
              ctx.db.query.users.findFirst({
                where: eq(users.id, ctx.session.userId),
              }),
              ctx.db.query.projects.findFirst({
                where: eq(projects.id, input.projectId),
              }),
              ctx.db.query.users.findMany({
                where: inArray(users.id, newMemberIds),
              }),
            ]);

            console.log(`[PROJECT UPDATE] Found ${newMembers.length} new members to email for project: ${project?.name}`);

            if (project) {
              for (const member of newMembers) {
                console.log(`[PROJECT UPDATE] Processing member: ${member.email}, has email: ${!!member.email}`);
                if (member.email) {
                  try {
                    console.log(`[PROJECT UPDATE] Sending email to ${member.email}...`);
                    await sendProjectAssignmentEmail(
                      member.email,
                      member.name || member.firstName || 'Team Member',
                      project.name,
                      project.key,
                      project.id,
                      currentUser?.name || currentUser?.firstName || undefined
                    );
                    console.log(`[PROJECT UPDATE] Email sent successfully to ${member.email}`);
                  } catch (emailError) {
                    console.error(`[PROJECT UPDATE] Failed to send assignment email to ${member.email}:`, emailError);
                  }
                }
              }
            }
          } else {
            console.log(`[PROJECT UPDATE] No new members to notify (all were already in project)`);
          }
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

      // Send email notification if ticket is assigned
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
        } catch (error) {
          // Don't fail ticket creation if email fails
        }
      }

      return ticket;
    }),

  updateTicket: protectedProcedure
    .input(updateTicketInputSchema)
    .mutation(async ({ ctx, input }) => {
      const { ticketId, ...updateData } = input;
      
      // Build update object conditionally
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
        updateFields.type = updateData.type;
      }
      if (updateData.status) {
        updateFields.status = updateData.status;
      }
      if (updateData.priority) {
        updateFields.priority = updateData.priority;
      }
      // Handle assigneeId - allow setting to null for unassigning
      if (updateData.assigneeId !== undefined) {
        // Convert empty string or "unassigned" to null
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
        console.error("Update ticket error:", error);
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
        } catch (error) {
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
      if (input.projectId) {
        // Filter by project through ticket relationship
        const projectTickets = await ctx.db.query.tickets.findMany({
          where: and(
            eq(tickets.orgId, ctx.session.orgId),
            eq(tickets.projectId, input.projectId)
          ),
          columns: { id: true }
        });
        const ticketIds = projectTickets.map(t => t.id);
        if (ticketIds.length > 0) {
          conditions.push(inArray(timesheets.ticketId, ticketIds));
        } else {
          // No tickets for this project, return empty result
          conditions.push(sql`1 = 0`);
        }
      }
      if (input.startDate) {
        conditions.push(gte(timesheets.date, input.startDate));
      }
      if (input.endDate) {
        conditions.push(lte(timesheets.date, input.endDate));
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

      // Only allow editing if status is PENDING
      if (entry.status !== "PENDING") {
        throw new TRPCError({ 
          code: "FORBIDDEN", 
          message: "Cannot edit timesheet entry that has been reviewed" 
        });
      }

      // Only allow users to edit their own entries (unless admin/owner)
      const isOwnerOrAdmin = ctx.session.user.role === "OWNER" || ctx.session.user.role === "ADMIN";
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

      // Update ticket time spent if hours changed
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

      // Only allow deleting if status is PENDING
      if (entry.status !== "PENDING") {
        throw new TRPCError({ 
          code: "FORBIDDEN", 
          message: "Cannot delete timesheet entry that has been reviewed" 
        });
      }

      // Only allow users to delete their own entries (unless admin/owner)
      const isOwnerOrAdmin = ctx.session.user.role === "OWNER" || ctx.session.user.role === "ADMIN";
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

      // Update ticket time spent
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

      // Use select with joins to get approver name
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

      // Fetch tickets separately with project info
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

      // Combine the data
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
        await ctx.db.transaction(async (tx) => {
            for (const item of input.items) {
                await tx.update(tickets)
                    .set({ 
                        status: item.status, 
                        order: item.order,
                        updatedAt: new Date()
                    })
                    .where(and(
                        eq(tickets.id, item.id),
                        eq(tickets.orgId, ctx.session.orgId)
                    ));
            }
        });
    }),
  deleteProject: protectedProcedure
    .input(z.object({ projectId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      if (ctx.session.user.role !== "OWNER") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only organization owners can delete projects",
        });
      }

      const project = await ctx.db.query.projects.findFirst({
        where: and(
          eq(projects.id, input.projectId),
          eq(projects.orgId, ctx.session.orgId)
        ),
      });

      if (!project) return;

      // 1. Get all ticket IDs in the project
      const projectTickets = await ctx.db
        .select({ id: tickets.id })
        .from(tickets)
        .where(eq(tickets.projectId, input.projectId));
      
      const ticketIds = projectTickets.map((t) => t.id);

      // 2. Delete ticket-related data
      if (ticketIds.length > 0) {
        await ctx.db.delete(ticketComments).where(inArray(ticketComments.ticketId, ticketIds));
        await ctx.db.delete(ticketAttachments).where(inArray(ticketAttachments.ticketId, ticketIds));
        await ctx.db.delete(ticketLabelMappings).where(inArray(ticketLabelMappings.ticketId, ticketIds));
        await ctx.db.delete(timesheets).where(inArray(timesheets.ticketId, ticketIds));
        
        // Delete tickets (self-references might need care, but single batch delete usually works on Postgres if not strict on order within table unless CASCADE is set. 
        // If parentTicketId checks exist, we might need multiple passes or set null first. 
        // For now, try simple delete.)
        await ctx.db.delete(tickets).where(inArray(tickets.id, ticketIds));
      }

      // 3. Delete other project children
      await ctx.db.delete(sprints).where(eq(sprints.projectId, input.projectId));
      await ctx.db.delete(projectMembers).where(eq(projectMembers.projectId, input.projectId));
      await ctx.db.delete(projectStatuses).where(eq(projectStatuses.projectId, input.projectId));

      // 4. Delete project
      await ctx.db.delete(projects).where(eq(projects.id, input.projectId));

      return { success: true };
    }),

  getEmployeeProjects: protectedProcedure
    .input(z.object({ userId: z.string() }))
    .query(async ({ ctx, input }) => {
      // 1. Get projects user is part of
      // 1. Get projects user is part of
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

      // 2. Get ticket stats for user per project
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

      // 3. Merge data
      return userProjects.map(({ project, role }) => {
          const stats = ticketStats.filter(s => s.projectId === project.id);
          const todo = stats.find(s => s.status === 'TODO')?.count || 0;
          const inProgress = stats.find(s => s.status === 'IN_PROGRESS')?.count || 0;
          const done = stats.find(s => s.status === 'DONE')?.count || 0;
          // Sum up others or just count active
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
    .input(z.object({ userId: z.string() }))
    .query(async ({ ctx, input }) => {
      // Fetch tickets assigned to the user
      const userTickets = await ctx.db.query.tickets.findMany({
        where: and(
            eq(tickets.assigneeId, input.userId),
            eq(tickets.orgId, ctx.session.orgId)
        ),
        with: {
          project: true,
          sprint: true,
        },
        orderBy: [desc(tickets.updatedAt)],
      });
      return userTickets;
    }),
});
