import { createTRPCRouter, protectedProcedure } from "../../trpc";
import { timesheets } from "../../../../lib/db/schema";
import { eq, and } from "drizzle-orm";
import { formatDateOnly } from "../../../../lib/date-utils";
import {
  upsertWorkLogInputSchema,
  getWorkLogsInputSchema,
} from "../../../../lib/validations/hr";

export const workLogRouter = createTRPCRouter({
  getWorkLogs: protectedProcedure
    .input(getWorkLogsInputSchema)
    .query(async ({ ctx, input }) => {
      const { year, quarter, userId } = input;
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
                    description: input.description,
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
                 description: input.description,
                 hours: input.hours?.toString() || "0",
             }).returning();
             return created;
        }
    }),
});
