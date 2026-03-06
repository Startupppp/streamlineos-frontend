import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "../../trpc";
import { helpdeskTickets, ticketStatusEnum } from "../../../../lib/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { isAdminOrOwner } from "../../../../lib/auth-helpers";

export const helpdeskRouter = createTRPCRouter({
  getHelpdeskTickets: protectedProcedure
    .input(
      z.object({ userId: z.string().optional(), status: z.enum(ticketStatusEnum.enumValues).optional() })
    )
    .query(async ({ ctx, input }) => {
      const isAdmin = isAdminOrOwner(ctx.session.user.role);
      const conditions = [eq(helpdeskTickets.orgId, ctx.session.orgId)];
      if (input.userId) {
        if (input.userId !== ctx.session.userId && !isAdmin) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Not authorized to view other users' tickets" });
        }
        conditions.push(eq(helpdeskTickets.userId, input.userId));
      } else if (!isAdmin) {
        conditions.push(eq(helpdeskTickets.userId, ctx.session.userId));
      }
      if (input.status) {
        conditions.push(eq(helpdeskTickets.status, input.status));
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
