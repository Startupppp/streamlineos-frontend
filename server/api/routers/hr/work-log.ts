import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { timesheets, users, organizationMembers } from "@/lib/db/schema";
import { eq, and, desc, ilike, or, count, gte, lte, sql } from "drizzle-orm";
import { formatDateOnly } from "@/lib/date-utils";
import { TRPCError } from "@trpc/server";
import { isAdminOrOwner } from "@/lib/auth-helpers";
import {
  upsertWorkLogInputSchema,
  getWorkLogsInputSchema,
  updateWorkLogStatusSchema,
} from "@/lib/validations/hr";

export const workLogRouter = createTRPCRouter({
  getWorkLogs: protectedProcedure
    .input(getWorkLogsInputSchema)
    .query(async ({ ctx, input }) => {
      const { year, quarter, userId } = input;
      const isAdmin = isAdminOrOwner(ctx.session.user.role);
      if (userId && userId !== ctx.session.userId && !isAdmin) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Not authorized to view other users' work logs" });
      }
      const targetUserId = userId || ctx.session.userId;

      const startMonth = (quarter - 1) * 3;
      const startDate = new Date(year, startMonth, 1);
      const endDate = new Date(year, startMonth + 3, 0);

      const startStr = formatDateOnly(startDate);
      const endStr = formatDateOnly(endDate);

      const logs = await ctx.db.query.timesheets.findMany({
        where: and(
           eq(timesheets.orgId, ctx.session.orgId),
           eq(timesheets.userId, targetUserId),
        ),
      });
      return logs.filter(l => l.date >= startStr && l.date <= endStr);
    }),

  upsertWorkLog: protectedProcedure
    .input(upsertWorkLogInputSchema)
    .mutation(async ({ ctx, input }) => {
        const dateStr = formatDateOnly(input.date);
        // Capitalize first letter of each sentence for consistency
        const normalizedDescription = input.description
          ? input.description.replace(/(^\s*\w|[.!?]\s+\w)/g, (c) => c.toUpperCase())
          : input.description;

        const existing = await ctx.db.query.timesheets.findFirst({
            where: and(
                eq(timesheets.orgId, ctx.session.orgId),
                eq(timesheets.userId, ctx.session.userId),
                eq(timesheets.date, dateStr)
            )
        });

        if (existing) {
             const [updated] = await ctx.db.update(timesheets)
                .set({
                    description: normalizedDescription,
                    hours: input.hours?.toString() || existing.hours,
                })
                .where(eq(timesheets.id, existing.id))
                .returning();
             return updated;
        } else {
             const [created] = await ctx.db.insert(timesheets).values({
                 orgId: ctx.session.orgId,
                 userId: ctx.session.userId,
                 date: dateStr,
                 description: normalizedDescription,
                 hours: input.hours?.toString() || "0",
             }).returning();
             return created;
        }
    }),

  updateWorkLogStatus: protectedProcedure
    .input(updateWorkLogStatusSchema)
    .mutation(async ({ ctx, input }) => {
      const isAdmin = isAdminOrOwner(ctx.session.user.role);
      if (!isAdmin) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Only admins can approve or reject work logs" });
      }

      const existing = await ctx.db.query.timesheets.findFirst({
        where: and(
          eq(timesheets.id, input.id),
          eq(timesheets.orgId, ctx.session.orgId),
        ),
      });

      if (!existing) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Work log not found" });
      }

      const [updated] = await ctx.db.update(timesheets)
        .set({
          status: input.status,
          approvedBy: ctx.session.userId,
          approvedAt: new Date(),
          rejectionReason: input.status === "REJECTED" ? input.rejectionReason : null,
        })
        .where(eq(timesheets.id, input.id))
        .returning();

      return updated;
    }),

  getWorkLogsPaginated: protectedProcedure
    .input(
      z.object({
        page: z.number().min(1).default(1),
        limit: z.number().min(1).max(100).default(20),
        search: z.string().optional(),
        year: z.number().optional(),
        quarter: z.number().min(1).max(4).optional(),
        userId: z.string().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const isAdmin = isAdminOrOwner(ctx.session.user.role);
      if (input.userId && input.userId !== ctx.session.userId && !isAdmin) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Not authorized to view other users' work logs" });
      }

      const { page, limit, search, year, quarter, userId } = input;
      const offset = (page - 1) * limit;

      const baseConditions = [eq(timesheets.orgId, ctx.session.orgId)];

      // If not admin, restrict to own logs
      if (!isAdmin) {
        baseConditions.push(eq(timesheets.userId, ctx.session.userId));
      } else if (userId) {
        baseConditions.push(eq(timesheets.userId, userId));
      }

      // Date range filter
      if (year && quarter) {
        const startMonth = (quarter - 1) * 3;
        const startDate = new Date(year, startMonth, 1);
        const endDate = new Date(year, startMonth + 3, 0);
        const startStr = formatDateOnly(startDate);
        const endStr = formatDateOnly(endDate);
        baseConditions.push(gte(timesheets.date, startStr));
        baseConditions.push(lte(timesheets.date, endStr));
      }

      const searchConditions = search
        ? [
            ...baseConditions,
            or(
              ilike(timesheets.description, `%${search}%`),
              ilike(users.name, `%${search}%`),
              ilike(users.email, `%${search}%`)
            ),
          ]
        : baseConditions;

      const [dataResult, countResult] = await Promise.all([
        ctx.db
          .select({
            id: timesheets.id,
            orgId: timesheets.orgId,
            userId: timesheets.userId,
            date: timesheets.date,
            hours: timesheets.hours,
            description: timesheets.description,
            status: timesheets.status,
            approvedBy: timesheets.approvedBy,
            approvedAt: timesheets.approvedAt,
            rejectionReason: timesheets.rejectionReason,
            createdAt: timesheets.createdAt,
            userName: users.name,
            userEmail: users.email,
          })
          .from(timesheets)
          .leftJoin(users, eq(timesheets.userId, users.id))
          .where(and(...searchConditions))
          .orderBy(desc(timesheets.date))
          .limit(limit)
          .offset(offset),
        ctx.db
          .select({ total: count() })
          .from(timesheets)
          .leftJoin(users, eq(timesheets.userId, users.id))
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
