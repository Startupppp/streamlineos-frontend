import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { projects, tickets } from "@/lib/db/schema";
import { eq, and, desc } from "drizzle-orm";

export const projectRouter = createTRPCRouter({
  getProjects: protectedProcedure.query(async ({ ctx }) => {
    return await ctx.db.query.projects.findMany({
      where: eq(projects.orgId, ctx.session.orgId),
      orderBy: [desc(projects.id)], // projects table has no updatedAt, using id
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
                  assignee: true
              }
          }
        }
      });
      return project;
    }),

  createTicket: protectedProcedure
    .input(z.object({
        projectId: z.number(),
        title: z.string().min(1),
        description: z.string().optional(),
        type: z.enum(["BUG", "FEATURE", "TASK", "EPIC", "STORY"]),
        priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).optional(),
        assigneeId: z.string().optional()
    }))
    .mutation(async ({ ctx, input }) => {
        // Map generic priority or type if needed. Schema has Epic/Story/Task/Bug.
        await ctx.db.insert(tickets).values({
            orgId: ctx.session.orgId,
            projectId: input.projectId,
            title: input.title,
            description: input.description,
            type: (input.type === "FEATURE" ? "STORY" : input.type) as "EPIC" | "STORY" | "TASK" | "BUG",
            priority: input.priority || "MEDIUM",
            assigneeId: input.assigneeId,
            status: "TODO"
        });
    }),

  updateTicketStatus: protectedProcedure
    .input(z.object({ ticketId: z.number(), status: z.enum(["TODO", "IN_PROGRESS", "IN_REVIEW", "DONE"]) }))
    .mutation(async ({ ctx, input }) => {
        await ctx.db.update(tickets)
            .set({ status: input.status })
            .where(and(eq(tickets.id, input.ticketId), eq(tickets.orgId, ctx.session.orgId)));
    }),

  updateProjectSettings: protectedProcedure
    .input(z.object({ projectId: z.number(), name: z.string(), description: z.string().optional(), status: z.string() }))
    .mutation(async ({ ctx, input }) => {
        await ctx.db.update(projects)
            .set({
                name: input.name,
                description: input.description,
                status: input.status
            })
            .where(and(eq(projects.id, input.projectId), eq(projects.orgId, ctx.session.orgId)));
    })
});
