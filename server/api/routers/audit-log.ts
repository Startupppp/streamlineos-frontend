import { createTRPCRouter, adminProcedure } from "@/server/api/trpc";
import { z } from "zod";
import { eq, and, desc, gte, lte, ilike, sql } from "drizzle-orm";
import { auditLogs, users } from "@/lib/db/schema";

export const auditLogRouter = createTRPCRouter({
  list: adminProcedure
    .input(
      z.object({
        page: z.number().min(1).default(1),
        pageSize: z.number().min(1).max(100).default(25),
        userId: z.string().optional(),
        action: z.string().optional(),
        targetType: z.string().optional(),
        dateFrom: z.string().optional(),
        dateTo: z.string().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const { page, pageSize, userId, action, targetType, dateFrom, dateTo } = input;
      const offset = (page - 1) * pageSize;

      const filters = [eq(auditLogs.orgId, ctx.session.orgId)];
      if (userId) filters.push(eq(auditLogs.userId, userId));
      if (action) filters.push(ilike(auditLogs.action, `%${action}%`));
      if (targetType) filters.push(eq(auditLogs.targetType, targetType));
      if (dateFrom) filters.push(gte(auditLogs.createdAt, new Date(dateFrom)));
      if (dateTo) {
        const end = new Date(dateTo);
        end.setHours(23, 59, 59, 999);
        filters.push(lte(auditLogs.createdAt, end));
      }

      const where = and(...filters);

      const [rows, [countRow]] = await Promise.all([
        ctx.db
          .select({
            id: auditLogs.id,
            action: auditLogs.action,
            userId: auditLogs.userId,
            userName: users.name,
            userEmail: users.email,
            userImage: users.image,
            targetId: auditLogs.targetId,
            targetType: auditLogs.targetType,
            metadata: auditLogs.metadata,
            ipAddress: auditLogs.ipAddress,
            createdAt: auditLogs.createdAt,
          })
          .from(auditLogs)
          .leftJoin(users, eq(auditLogs.userId, users.id))
          .where(where)
          .orderBy(desc(auditLogs.createdAt))
          .limit(pageSize)
          .offset(offset),
        ctx.db
          .select({ count: sql<number>`count(*)` })
          .from(auditLogs)
          .where(where),
      ]);

      const total = Number(countRow?.count ?? 0);
      return {
        logs: rows,
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize),
      };
    }),

  getDistinctActions: adminProcedure.query(async ({ ctx }) => {
    const rows = await ctx.db
      .selectDistinct({ action: auditLogs.action })
      .from(auditLogs)
      .where(eq(auditLogs.orgId, ctx.session.orgId))
      .orderBy(auditLogs.action);
    return rows.map((r) => r.action);
  }),

  getDistinctTargetTypes: adminProcedure.query(async ({ ctx }) => {
    const rows = await ctx.db
      .selectDistinct({ targetType: auditLogs.targetType })
      .from(auditLogs)
      .where(
        and(
          eq(auditLogs.orgId, ctx.session.orgId),
          sql`${auditLogs.targetType} is not null`
        )
      )
      .orderBy(auditLogs.targetType);
    return rows.map((r) => r.targetType).filter(Boolean) as string[];
  }),
});
