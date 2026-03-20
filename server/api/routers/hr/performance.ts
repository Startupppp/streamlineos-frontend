import { z } from "zod";
import { createTRPCRouter, protectedProcedure, adminProcedure } from "@/server/api/trpc";
import { isAdminOrOwner } from "@/lib/auth-helpers";
import { performanceReviews, goals, organizationMembers } from "@/lib/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { formatDateOnly } from "@/lib/date-utils";
import { TRPCError } from "@trpc/server";
import {
  createPerformanceReviewInputSchema,
  createGoalInputSchema,
  updateGoalInputSchema,
} from "@/lib/validations/hr";

export const performanceRouter = createTRPCRouter({
  getPerformanceReviews: protectedProcedure
    .input(z.object({ userId: z.string().optional() }))
    .query(async ({ ctx, input }) => {
      const isAdmin = isAdminOrOwner(ctx.session.user.role);
      const conditions = [eq(performanceReviews.orgId, ctx.session.orgId)];
      if (input.userId) {
        if (input.userId !== ctx.session.userId && !isAdmin) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Not authorized" });
        }
        conditions.push(eq(performanceReviews.userId, input.userId));
      } else if (!isAdmin) {
        conditions.push(eq(performanceReviews.userId, ctx.session.userId));
      }
      return await ctx.db.query.performanceReviews.findMany({
        where: and(...conditions),
        orderBy: [desc(performanceReviews.periodEnd)],
      });
    }),

  createPerformanceReview: protectedProcedure
    .input(createPerformanceReviewInputSchema)
    .mutation(async ({ ctx, input }) => {
      if (ctx.session.user.role !== "CEO" && ctx.session.user.role !== "HR") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Only admins can create performance reviews" });
      }

      const targetMember = await ctx.db.query.organizationMembers.findFirst({
        where: and(
          eq(organizationMembers.userId, input.userId),
          eq(organizationMembers.orgId, ctx.session.orgId)
        ),
      });
      if (!targetMember) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Target user not found in your organization" });
      }

      const [review] = await ctx.db
        .insert(performanceReviews)
        .values({
          orgId: ctx.session.orgId,
          userId: input.userId,
          reviewerId: input.reviewerId || ctx.session.userId,
          periodStart: formatDateOnly(input.periodStart),
          periodEnd: formatDateOnly(input.periodEnd),
          ratings: input.ratings,
          strengths: input.strengths,
          improvements: input.improvements,
          goals: input.goals,
          overallRating: input.overallRating?.toString(),
          comments: input.comments,
          status: "DRAFT",
        })
        .returning();
      return review;
    }),

  getGoals: protectedProcedure
    .input(z.object({ userId: z.string().optional() }))
    .query(async ({ ctx, input }) => {
      const isAdmin = isAdminOrOwner(ctx.session.user.role);
      const conditions = [eq(goals.orgId, ctx.session.orgId)];
      if (input.userId) {
        if (input.userId !== ctx.session.userId && !isAdmin) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Not authorized" });
        }
        conditions.push(eq(goals.userId, input.userId));
      } else if (!isAdmin) {
        conditions.push(eq(goals.userId, ctx.session.userId));
      }
      return await ctx.db.query.goals.findMany({
        where: and(...conditions),
        orderBy: [desc(goals.createdAt)],
      });
    }),

  createGoal: protectedProcedure
    .input(createGoalInputSchema)
    .mutation(async ({ ctx, input }) => {
      if (ctx.session.user.role !== "CEO" && ctx.session.user.role !== "HR") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Only admins can create goals" });
      }
      const [goal] = await ctx.db
        .insert(goals)
        .values({
          orgId: ctx.session.orgId,
          userId: input.userId,
          title: input.title,
          description: input.description,
          type: input.type,
          targetValue: input.targetValue?.toString(),
          currentValue: input.currentValue.toString(),
          unit: input.unit,
          startDate: formatDateOnly(input.startDate),
          endDate: formatDateOnly(input.endDate),
          status: "IN_PROGRESS",
          progress: 0,
          parentGoalId: input.parentGoalId,
        })
        .returning();
      return goal;
    }),

  updateGoal: adminProcedure
    .input(updateGoalInputSchema)
    .mutation(async ({ ctx, input }) => {
      const { goalId, ...updateData } = input;
      await ctx.db
        .update(goals)
        .set({
          ...(updateData.title && { title: updateData.title }),
          ...(updateData.description !== undefined && {
            description: updateData.description,
          }),
          ...(updateData.targetValue !== undefined && {
            targetValue: updateData.targetValue.toString(),
          }),
          ...(updateData.currentValue !== undefined && {
            currentValue: updateData.currentValue.toString(),
          }),
          ...(updateData.status && { status: updateData.status }),
          ...(updateData.progress !== undefined && {
            progress: updateData.progress,
          }),
          updatedAt: new Date(),
        })
        .where(and(eq(goals.id, goalId), eq(goals.orgId, ctx.session.orgId)));
    }),
});
