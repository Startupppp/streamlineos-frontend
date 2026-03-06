import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "../../trpc";
import { helpdeskTickets } from "../../../../lib/db/schema";
import { eq, and, desc } from "drizzle-orm";

export const helpdeskRouter = createTRPCRouter({
  getHelpdeskTickets: protectedProcedure
    .input(
      z.object({ userId: z.string().optional(), status: z.string().optional() })
    )
    .query(async ({ ctx, input }) => {
      const conditions = [eq(helpdeskTickets.orgId, ctx.session.orgId)];
      if (input.userId) {
        conditions.push(eq(helpdeskTickets.userId, input.userId));
      }
      if (input.status) {
        conditions.push(eq(helpdeskTickets.status, input.status as any));
      }
      return await ctx.db.query.helpdeskTickets.findMany({
        where: and(...conditions),
        orderBy: [desc(helpdeskTickets.createdAt)],
      });
    }),

  createHelpdeskTicket: protectedProcedure
    .input(
      z.object({
        title: z.string().min(1),
        description: z.string().optional(),
        category: z.string().optional(),
        priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const [ticket] = await ctx.db
        .insert(helpdeskTickets)
        .values({
          orgId: ctx.session.orgId,
          userId: ctx.session.userId,
          title: input.title,
          description: input.description,
          category: input.category,
          priority: input.priority || "MEDIUM",
          status: "TODO",
        })
        .returning();
      return ticket;
    }),
});
