import { z } from "zod";
import { logger } from "../../../../lib/logger";
import { createTRPCRouter, protectedProcedure } from "../../trpc";
import { isAdminOrOwner } from "../../../../lib/auth-helpers";
import {
  projects,
  tickets,
  ticketComments,
  ticketAttachments,
  ticketLabelMappings,
  timesheets,
  sprints,
  organizationMembers,
  users,
  projectStatuses,
  projectMembers,
} from "../../../../lib/db/schema";
import { eq, and, desc, asc, sql, or, inArray, ilike, count } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import {
  updateProjectSettingsInputSchema,
  createProjectInputSchema,
} from "../../../../lib/validations/project";
import {
  createPaginatedResponse,
  getOffset,
} from "../../../../lib/pagination";
import { sendProjectAssignmentEmail } from "../../../../lib/email";

export const coreRouter = createTRPCRouter({
  getProjects: protectedProcedure.query(async ({ ctx }) => {
    const isOwnerOrAdmin = isAdminOrOwner(ctx.session.user.role);
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

  getProjectsListing: protectedProcedure
    .input(
      z.object({
        page: z.number().min(1).default(1),
        limit: z.number().min(1).max(100).default(9),
        search: z.string().optional(),
        status: z.enum(["ALL", "ACTIVE", "COMPLETED", "ARCHIVED"]).default("ALL"),
      })
    )
    .query(async ({ ctx, input }) => {
      const { page, limit, search, status } = input;
      const offset = getOffset(page, limit);

      // Build where conditions
      const conditions = [eq(projects.orgId, ctx.session.orgId)];

      // Role-based access (same as getProjects)
      const isOwnerOrAdmin = isAdminOrOwner(ctx.session.user.role);
      if (!isOwnerOrAdmin) {
        const memberOf = await ctx.db
          .select({ projectId: projectMembers.projectId })
          .from(projectMembers)
          .where(eq(projectMembers.userId, ctx.session.userId));
        const projectIds = memberOf.map((m) => m.projectId);

        conditions.push(
          or(
            eq(projects.managerId, ctx.session.userId),
            projectIds.length > 0 ? inArray(projects.id, projectIds) : sql`false`
          )!
        );
      }

      if (search && search.trim()) {
        const term = `%${search.trim()}%`;
        conditions.push(
          or(ilike(projects.name, term), ilike(projects.key, term))!
        );
      }

      if (status !== "ALL") {
        conditions.push(eq(projects.status, status));
      }

      const whereClause = and(...conditions);

      // Count total
      const [{ total }] = await ctx.db
        .select({ total: count() })
        .from(projects)
        .where(whereClause);

      // Fetch paginated projects with manager
      const projectRows = await ctx.db
        .select({
          id: projects.id,
          name: projects.name,
          description: projects.description,
          key: projects.key,
          status: projects.status,
          startDate: projects.startDate,
          endDate: projects.endDate,
          managerId: projects.managerId,
          managerFirstName: users.firstName,
          managerLastName: users.lastName,
          managerImage: users.image,
        })
        .from(projects)
        .leftJoin(users, eq(projects.managerId, users.id))
        .where(whereClause)
        .orderBy(desc(projects.id))
        .limit(limit)
        .offset(offset);

      if (projectRows.length === 0) {
        return createPaginatedResponse([], total, page, limit);
      }

      const projectIds = projectRows.map((p) => p.id);

      // Aggregate ticket progress per project
      const progressRows = await ctx.db
        .select({
          projectId: tickets.projectId,
          total: count(),
          done: sql<number>`count(*) filter (where ${tickets.status} = 'DONE')`.as("done"),
        })
        .from(tickets)
        .where(inArray(tickets.projectId, projectIds))
        .groupBy(tickets.projectId);

      const progressMap = new Map(
        progressRows.map((r) => [r.projectId, { total: r.total, done: r.done }])
      );

      // Fetch members per project (limited to 5 per project)
      const memberRows = await ctx.db
        .select({
          projectId: projectMembers.projectId,
          userId: projectMembers.userId,
          firstName: users.firstName,
          lastName: users.lastName,
          image: users.image,
        })
        .from(projectMembers)
        .innerJoin(users, eq(projectMembers.userId, users.id))
        .where(inArray(projectMembers.projectId, projectIds));

      const membersMap = new Map<number, { id: string; firstName: string | null; lastName: string | null; image: string | null }[]>();
      for (const m of memberRows) {
        if (!membersMap.has(m.projectId)) membersMap.set(m.projectId, []);
        const arr = membersMap.get(m.projectId)!;
        if (arr.length < 5) {
          arr.push({ id: m.userId, firstName: m.firstName, lastName: m.lastName, image: m.image });
        }
      }

      const data = projectRows.map((p) => {
        const progress = progressMap.get(p.id) ?? { total: 0, done: 0 };
        const pct = progress.total > 0 ? Math.round((progress.done / progress.total) * 100) : 0;
        return {
          id: p.id,
          name: p.name,
          description: p.description,
          key: p.key,
          status: p.status,
          startDate: p.startDate,
          endDate: p.endDate,
          manager: p.managerId
            ? { id: p.managerId, firstName: p.managerFirstName, lastName: p.managerLastName, image: p.managerImage }
            : null,
          progress: { total: progress.total, done: progress.done, percentage: pct },
          members: membersMap.get(p.id) ?? [],
        };
      });

      return createPaginatedResponse(data, total, page, limit);
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
      const isOwnerOrAdmin = isAdminOrOwner(ctx.session.user.role);
      const projectCheck = await ctx.db.query.projects.findFirst({
        where: and(
          eq(projects.id, input.id),
          eq(projects.orgId, ctx.session.orgId)
        )
      });

      if (!projectCheck) {
        return null;
      }
      if (!isOwnerOrAdmin) {
        const isManager = projectCheck.managerId === ctx.session.userId;
        if (!isManager) {
          const memberOf = await ctx.db
            .select({ projectId: projectMembers.projectId })
            .from(projectMembers)
            .where(and(
              eq(projectMembers.userId, ctx.session.userId),
              eq(projectMembers.projectId, input.id)
            ));

          if (memberOf.length === 0) {
            return null;
          }
        }
      }

      const project = await ctx.db.query.projects.findFirst({
        where: and(
          eq(projects.id, input.id),
          eq(projects.orgId, ctx.session.orgId)
        ),
        with: {
          statuses: {
            orderBy: [asc(projectStatuses.order)],
          },
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
          key: projectKey,
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
      if (input.memberIds && input.memberIds.length > 0) {
          await ctx.db.insert(projectMembers).values(
              input.memberIds.map(userId => ({
                  projectId: project.id,
                  userId: userId,
                  role: "CONTRIBUTOR",
              }))
          );
          const currentUser = await ctx.db.query.users.findFirst({
            where: eq(users.id, ctx.session.userId),
          });

          const addedMembers = await ctx.db.query.users.findMany({
            where: inArray(users.id, input.memberIds),
          });

          for (const member of addedMembers) {
            if (member.email) {
              try {
                await sendProjectAssignmentEmail(
                  member.email,
                  member.name || member.firstName || 'Team Member',
                  input.name,
                  projectKey,
                  project.id,
                  currentUser?.name || currentUser?.firstName || undefined
                );
              } catch (emailError) {
                logger.error(`Failed to send project assignment email`, { to: member.email, error: emailError });
              }
            }
          }
      }

      return project;
    }),

  updateProjectSettings: protectedProcedure
    .input(updateProjectSettingsInputSchema)
    .mutation(async ({ ctx, input }) => {
      const isOwnerOrAdmin = isAdminOrOwner(ctx.session.user.role);
      if (!isOwnerOrAdmin) {
        const project = await ctx.db.query.projects.findFirst({
          where: and(
            eq(projects.id, input.projectId),
            eq(projects.orgId, ctx.session.orgId)
          ),
          columns: { managerId: true },
        });
        if (!project || project.managerId !== ctx.session.userId) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Only project managers or admins can update project settings.",
          });
        }
      }

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
        const existingMembers = await ctx.db
          .select({ userId: projectMembers.userId })
          .from(projectMembers)
          .where(eq(projectMembers.projectId, input.projectId));

        const existingMemberIds = new Set(existingMembers.map(m => m.userId));
        await ctx.db
          .delete(projectMembers)
          .where(eq(projectMembers.projectId, input.projectId));
        if (input.memberIds.length > 0) {
          await ctx.db.insert(projectMembers).values(
            input.memberIds.map((userId) => ({
              projectId: input.projectId,
              userId,
              role: "CONTRIBUTOR",
            }))
          );
          const newMemberIds = input.memberIds.filter(id => !existingMemberIds.has(id));

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

            if (project) {
              for (const member of newMembers) {
                if (member.email) {
                  try {
                    await sendProjectAssignmentEmail(
                      member.email,
                      member.name || member.firstName || 'Team Member',
                      project.name,
                      project.key,
                      project.id,
                      currentUser?.name || currentUser?.firstName || undefined
                    );
                  } catch (emailError) {
                    logger.error(`Failed to send project update email`, { to: member.email, error: emailError });
                  }
                }
              }
            }
          }
        }
      }
    }),

  createProjectStatus: protectedProcedure
    .input(z.object({
        projectId: z.number(),
        name: z.string(),
        color: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
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
        statusIds: z.array(z.number()),
    }))
    .mutation(async ({ ctx, input }) => {
        if (input.statusIds.length === 0) return;
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
        const status = await ctx.db.query.projectStatuses.findFirst({
            where: eq(projectStatuses.id, input.statusId),
        });

        if (!status) return;
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
      const projectTickets = await ctx.db
        .select({ id: tickets.id })
        .from(tickets)
        .where(eq(tickets.projectId, input.projectId));

      const ticketIds = projectTickets.map((t) => t.id);
      if (ticketIds.length > 0) {
        await ctx.db.delete(ticketComments).where(inArray(ticketComments.ticketId, ticketIds));
        await ctx.db.delete(ticketAttachments).where(inArray(ticketAttachments.ticketId, ticketIds));
        await ctx.db.delete(ticketLabelMappings).where(inArray(ticketLabelMappings.ticketId, ticketIds));
        await ctx.db.delete(timesheets).where(inArray(timesheets.ticketId, ticketIds));
        await ctx.db.delete(tickets).where(inArray(tickets.id, ticketIds));
      }
      await ctx.db.delete(sprints).where(eq(sprints.projectId, input.projectId));
      await ctx.db.delete(projectMembers).where(eq(projectMembers.projectId, input.projectId));
      await ctx.db.delete(projectStatuses).where(eq(projectStatuses.projectId, input.projectId));
      await ctx.db.delete(projects).where(eq(projects.id, input.projectId));

      return { success: true };
    }),
});
