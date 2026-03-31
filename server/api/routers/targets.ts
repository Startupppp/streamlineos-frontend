import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { z } from "zod";
import { eq, and, desc, inArray } from "drizzle-orm";
import { targets, targetHistory, users } from "@/lib/db/schema";
import { TRPCError } from "@trpc/server";
import { createNotification } from "@/server/actions/create-notification";
import { createAuditLog } from "@/lib/audit-log";
import { ADMIN_ROLES } from "@/lib/constants/roles";
import type { db as dbInstance } from "@/lib/db";

async function assertCanManageTargets(
  db: typeof dbInstance,
  callerRole: string,
  callerId: string,
  userIds: string[],
) {
  if (ADMIN_ROLES.includes(callerRole)) return;

  const targetUsers = await db
    .select({ id: users.id, reportingTo: users.reportingTo })
    .from(users)
    .where(inArray(users.id, userIds));

  const allManaged = targetUsers.every((u: { reportingTo: string | null }) => u.reportingTo === callerId);
  if (!allManaged) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "You can only set targets for your direct reports.",
    });
  }
}

export const targetsRouter = createTRPCRouter({
  getAll: protectedProcedure
    .input(z.object({
      userId: z.string().optional(),
      period: z.string().optional(),
      limit: z.number().min(1).max(100).default(50),
      offset: z.number().min(0).default(0),
    }).optional())
    .query(async ({ ctx, input }) => {
      const orgId = ctx.session.orgId;
      const filters = [eq(targets.orgId, orgId)];

      if (input?.userId) filters.push(eq(targets.userId, input.userId));
      if (input?.period) filters.push(eq(targets.period, input.period));

      return ctx.db.query.targets.findMany({
        where: and(...filters),
        with: { user: { columns: { id: true, name: true, image: true } } },
        orderBy: [desc(targets.createdAt)],
        limit: input?.limit ?? 50,
        offset: input?.offset ?? 0,
      });
    }),

  getMyTargets: protectedProcedure.query(async ({ ctx }) => {
    return ctx.db.query.targets.findMany({
      where: and(
        eq(targets.orgId, ctx.session.orgId),
        eq(targets.userId, ctx.session.userId)
      ),
      orderBy: [desc(targets.startDate)],
    });
  }),

  create: protectedProcedure
    .input(z.object({
      userId: z.string().optional(),
      userIds: z.array(z.string()).optional(),
      metricType: z.string(),
      targetValue: z.string(),
      period: z.string().default("daily"),
      startDate: z.string(),
      endDate: z.string(),
      notes: z.string().optional(),
      branchId: z.number().optional(),
      parentTargetId: z.number().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const resolvedUserIds = input.userIds?.length
        ? input.userIds
        : input.userId
          ? [input.userId]
          : [];

      if (resolvedUserIds.length === 0) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "At least one user is required." });
      }

      // BRANCH_MANAGER can set targets but only for their branch users
      const role = ctx.session.user.role ?? "";
      if (role === "BRANCH_MANAGER") {
        // Verify target users are in the same branch
        const branchUsers = await ctx.db.query.users.findMany({
          where: and(inArray(users.id, resolvedUserIds)),
          columns: { id: true, branchId: true },
        });
        const callerUser = await ctx.db.query.users.findFirst({
          where: eq(users.id, ctx.session.userId),
          columns: { branchId: true },
        });
        const invalid = branchUsers.some(u => u.branchId !== callerUser?.branchId);
        if (invalid) {
          throw new TRPCError({ code: "FORBIDDEN", message: "You can only set targets for your branch members." });
        }
      } else {
        await assertCanManageTargets(ctx.db, role, ctx.session.userId, resolvedUserIds);
      }

      // If parentTargetId provided, validate sum doesn't exceed parent
      if (input.parentTargetId) {
        const parentTarget = await ctx.db.query.targets.findFirst({
          where: eq(targets.id, input.parentTargetId),
        });
        if (parentTarget) {
          const existingSiblings = await ctx.db.query.targets.findMany({
            where: eq(targets.parentTargetId, input.parentTargetId),
          });
          const existingSum = existingSiblings.reduce((s, t) => s + parseFloat(t.targetValue), 0);
          const newTotal = existingSum + parseFloat(input.targetValue) * resolvedUserIds.length;
          if (newTotal > parseFloat(parentTarget.targetValue)) {
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: `Sum of individual targets (${newTotal}) exceeds branch target (${parentTarget.targetValue})`,
            });
          }
        }
      }

      const created = await ctx.db.insert(targets).values(
        resolvedUserIds.map((uid) => ({
          orgId: ctx.session.orgId,
          userId: uid,
          metricType: input.metricType,
          targetValue: input.targetValue,
          period: input.period,
          startDate: input.startDate,
          endDate: input.endDate,
          notes: input.notes ?? null,
          setById: ctx.session.userId,
          branchId: input.branchId,
          parentTargetId: input.parentTargetId,
        }))
      ).returning();

      const metricLabel = input.metricType.replace(/_/g, " ");
      for (const uid of resolvedUserIds) {
        if (uid === ctx.session.userId) continue;
        createNotification({
          orgId: ctx.session.orgId,
          userId: uid,
          type: "INFO",
          title: "New target assigned",
          message: `You have a new ${input.period} target: ${input.targetValue} ${metricLabel}`,
          link: "/crm/targets",
        }).catch(() => {});
      }

      for (const t of created) {
        createAuditLog({
          action: "target.created",
          userId: ctx.session.userId,
          orgId: ctx.session.orgId,
          targetId: String(t.id),
          targetType: "target",
          metadata: {
            assignedTo: t.userId,
            metricType: input.metricType,
            targetValue: input.targetValue,
            period: input.period,
          },
        }).catch(() => {});
      }

      return created;
    }),

  update: protectedProcedure
    .input(z.object({
      id: z.number(),
      targetValue: z.string().optional(),
      currentValue: z.string().optional(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;

      const existing = await ctx.db.query.targets.findFirst({
        where: and(eq(targets.id, id), eq(targets.orgId, ctx.session.orgId)),
      });
      if (!existing) throw new TRPCError({ code: "NOT_FOUND" });

      await assertCanManageTargets(ctx.db, ctx.session.user.role ?? "", ctx.session.userId, [existing.userId]);

      const changes: { field: string; oldValue: string | null; newValue: string | null }[] = [];
      if (data.targetValue !== undefined && data.targetValue !== existing.targetValue) {
        changes.push({ field: "targetValue", oldValue: existing.targetValue, newValue: data.targetValue });
      }
      if (data.currentValue !== undefined && data.currentValue !== (existing.currentValue ?? "0")) {
        changes.push({ field: "currentValue", oldValue: existing.currentValue ?? "0", newValue: data.currentValue });
      }
      if (data.notes !== undefined && data.notes !== existing.notes) {
        changes.push({ field: "notes", oldValue: existing.notes, newValue: data.notes });
      }

      if (changes.length > 0) {
        await ctx.db.insert(targetHistory).values(
          changes.map((c) => ({
            targetId: id,
            orgId: ctx.session.orgId,
            changedById: ctx.session.userId,
            field: c.field,
            oldValue: c.oldValue,
            newValue: c.newValue,
          }))
        );
      }

      const updateData: Record<string, unknown> = { updatedAt: new Date() };
      if (data.targetValue !== undefined) updateData.targetValue = data.targetValue;
      if (data.currentValue !== undefined) updateData.currentValue = data.currentValue;
      if (data.notes !== undefined) updateData.notes = data.notes;

      const [updated] = await ctx.db.update(targets)
        .set(updateData)
        .where(and(eq(targets.id, id), eq(targets.orgId, ctx.session.orgId)))
        .returning();

      if (!updated) throw new TRPCError({ code: "NOT_FOUND" });

      createAuditLog({
        action: "target.updated",
        userId: ctx.session.userId,
        orgId: ctx.session.orgId,
        targetId: String(id),
        targetType: "target",
        metadata: { changes },
      }).catch(() => {});

      return updated;
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const existing = await ctx.db.query.targets.findFirst({
        where: and(eq(targets.id, input.id), eq(targets.orgId, ctx.session.orgId)),
      });
      if (!existing) throw new TRPCError({ code: "NOT_FOUND" });

      await assertCanManageTargets(ctx.db, ctx.session.user.role ?? "", ctx.session.userId, [existing.userId]);

      await ctx.db.delete(targets)
        .where(and(eq(targets.id, input.id), eq(targets.orgId, ctx.session.orgId)));

      createAuditLog({
        action: "target.deleted",
        userId: ctx.session.userId,
        orgId: ctx.session.orgId,
        targetId: String(input.id),
        targetType: "target",
        metadata: {
          assignedTo: existing.userId,
          metricType: existing.metricType,
        },
      }).catch(() => {});

      return { success: true };
    }),

  getHistory: protectedProcedure
    .input(z.object({ targetId: z.number() }))
    .query(async ({ ctx, input }) => {
      return ctx.db.query.targetHistory.findMany({
        where: and(
          eq(targetHistory.targetId, input.targetId),
          eq(targetHistory.orgId, ctx.session.orgId),
        ),
        with: { changedBy: { columns: { id: true, name: true, image: true } } },
        orderBy: [desc(targetHistory.createdAt)],
      });
    }),

  getLeaderboard: protectedProcedure
    .input(z.object({ metricType: z.string().optional() }).optional())
    .query(async ({ ctx, input }) => {
      const orgId = ctx.session.orgId;
      const filters = [eq(targets.orgId, orgId)];
      if (input?.metricType) filters.push(eq(targets.metricType, input.metricType));

      const allTargets = await ctx.db.query.targets.findMany({
        where: and(...filters),
        with: { user: { columns: { id: true, name: true, image: true } } },
        orderBy: [desc(targets.currentValue)],
      });

      const userMap = new Map<string, { name: string; image: string | null; totalTarget: number; totalCurrent: number }>();
      for (const t of allTargets) {
        if (!t.user) continue;
        const existing = userMap.get(t.userId) || { name: t.user.name ?? "", image: t.user.image, totalTarget: 0, totalCurrent: 0 };
        existing.totalTarget += Number(t.targetValue);
        existing.totalCurrent += Number(t.currentValue ?? 0);
        userMap.set(t.userId, existing);
      }

      return Array.from(userMap.entries())
        .map(([userId, data]) => ({
          userId,
          ...data,
          progress: data.totalTarget > 0 ? Math.round((data.totalCurrent / data.totalTarget) * 100) : 0,
        }))
        .sort((a, b) => b.progress - a.progress);
    }),
});
