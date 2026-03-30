import { z } from "zod";
import { createTRPCRouter, protectedProcedure, adminProcedure } from "@/server/api/trpc";
import { isAdminOrOwner } from "@/lib/auth-helpers";
import { performanceReviews, goals, organizationMembers, users } from "@/lib/db/schema";
import { eq, and, desc, ilike, or, count } from "drizzle-orm";
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
      if (!isAdminOrOwner(ctx.session.user.role)) {
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
      if (!isAdminOrOwner(ctx.session.user.role)) {
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

  getPerformanceReviewsPaginated: protectedProcedure
    .input(
      z.object({
        page: z.number().min(1).default(1),
        limit: z.number().min(1).max(100).default(20),
        search: z.string().optional(),
        userId: z.string().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const isAdmin = isAdminOrOwner(ctx.session.user.role);
      const { page, limit, search, userId } = input;
      const offset = (page - 1) * limit;

      if (userId && userId !== ctx.session.userId && !isAdmin) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Not authorized" });
      }

      const baseConditions = [eq(performanceReviews.orgId, ctx.session.orgId)];
      if (userId) {
        baseConditions.push(eq(performanceReviews.userId, userId));
      } else if (!isAdmin) {
        baseConditions.push(eq(performanceReviews.userId, ctx.session.userId));
      }

      const searchConditions = search
        ? [
            ...baseConditions,
            or(
              ilike(users.name, `%${search}%`),
              ilike(users.email, `%${search}%`),
              ilike(performanceReviews.strengths, `%${search}%`),
              ilike(performanceReviews.comments, `%${search}%`)
            ),
          ]
        : baseConditions;

      const [dataResult, countResult] = await Promise.all([
        ctx.db
          .select({
            id: performanceReviews.id,
            orgId: performanceReviews.orgId,
            userId: performanceReviews.userId,
            reviewerId: performanceReviews.reviewerId,
            periodStart: performanceReviews.periodStart,
            periodEnd: performanceReviews.periodEnd,
            status: performanceReviews.status,
            ratings: performanceReviews.ratings,
            strengths: performanceReviews.strengths,
            improvements: performanceReviews.improvements,
            goals: performanceReviews.goals,
            overallRating: performanceReviews.overallRating,
            comments: performanceReviews.comments,
            createdAt: performanceReviews.createdAt,
            updatedAt: performanceReviews.updatedAt,
            userName: users.name,
            userEmail: users.email,
          })
          .from(performanceReviews)
          .leftJoin(users, eq(performanceReviews.userId, users.id))
          .where(and(...searchConditions))
          .orderBy(desc(performanceReviews.periodEnd))
          .limit(limit)
          .offset(offset),
        ctx.db
          .select({ total: count() })
          .from(performanceReviews)
          .leftJoin(users, eq(performanceReviews.userId, users.id))
          .where(and(...searchConditions)),
      ]);

      const total = countResult[0]?.total ?? 0;

      return {
        data: dataResult,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      };
    }),

  getGoalsPaginated: protectedProcedure
    .input(
      z.object({
        page: z.number().min(1).default(1),
        limit: z.number().min(1).max(100).default(20),
        search: z.string().optional(),
        userId: z.string().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const isAdmin = isAdminOrOwner(ctx.session.user.role);
      const { page, limit, search, userId } = input;
      const offset = (page - 1) * limit;

      if (userId && userId !== ctx.session.userId && !isAdmin) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Not authorized" });
      }

      const baseConditions = [eq(goals.orgId, ctx.session.orgId)];
      if (userId) {
        baseConditions.push(eq(goals.userId, userId));
      } else if (!isAdmin) {
        baseConditions.push(eq(goals.userId, ctx.session.userId));
      }

      const searchConditions = search
        ? [
            ...baseConditions,
            or(
              ilike(goals.title, `%${search}%`),
              ilike(goals.description, `%${search}%`),
              ilike(users.name, `%${search}%`)
            ),
          ]
        : baseConditions;

      const [dataResult, countResult] = await Promise.all([
        ctx.db
          .select({
            id: goals.id,
            orgId: goals.orgId,
            userId: goals.userId,
            title: goals.title,
            description: goals.description,
            type: goals.type,
            targetValue: goals.targetValue,
            currentValue: goals.currentValue,
            unit: goals.unit,
            startDate: goals.startDate,
            endDate: goals.endDate,
            status: goals.status,
            progress: goals.progress,
            parentGoalId: goals.parentGoalId,
            createdAt: goals.createdAt,
            updatedAt: goals.updatedAt,
            userName: users.name,
            userEmail: users.email,
          })
          .from(goals)
          .leftJoin(users, eq(goals.userId, users.id))
          .where(and(...searchConditions))
          .orderBy(desc(goals.createdAt))
          .limit(limit)
          .offset(offset),
        ctx.db
          .select({ total: count() })
          .from(goals)
          .leftJoin(users, eq(goals.userId, users.id))
          .where(and(...searchConditions)),
      ]);

      const total = countResult[0]?.total ?? 0;

      return {
        data: dataResult,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      };
    }),
});
