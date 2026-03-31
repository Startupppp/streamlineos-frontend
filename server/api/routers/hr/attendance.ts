import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { attendance } from "@/lib/db/schema";
import { eq, and, desc, isNull, gte, lte, asc } from "drizzle-orm";
import { formatDateOnly, getTodayString } from "@/lib/date-utils";
import { TRPCError } from "@trpc/server";
import { checkInInputSchema } from "@/lib/validations/attendance";

export const attendanceRouter = createTRPCRouter({
  getAttendanceStatus: protectedProcedure.query(async ({ ctx }) => {
    const today = getTodayString();
    const userId = ctx.session.userId;
    const orgId = ctx.session.orgId;

    const todayLogs = await ctx.db.query.attendance.findMany({
      where: and(
        eq(attendance.userId, userId),
        eq(attendance.date, today),
        eq(attendance.orgId, orgId)
      ),
    });

    let dailyWorkHours = 0;
    let dailyBreakHours = 0;
    let isDailyOvertime = false;

    const now = new Date();

    for (const log of todayLogs) {
      dailyBreakHours += Number(log.breakHours || 0);

      if (!log.checkOut && log.checkIn) {
         const start = new Date(log.checkIn);
         const durationMs = now.getTime() - start.getTime();
         const durationHours = durationMs / (1000 * 60 * 60);
         const netWork = durationHours - (Number(log.breakHours) || 0);
         dailyWorkHours += Math.max(0, netWork);
      } else {
         // BUG-005 fix: subtract break hours from stored work hours
         const rawWork = Number(log.workHours || 0);
         const breakHrs = Number(log.breakHours || 0);
         dailyWorkHours += Math.max(0, rawWork - breakHrs);
      }

      if (log.isOvertime) isDailyOvertime = true;
    }

    const todayLog = await ctx.db.query.attendance.findFirst({
        where: and(
          eq(attendance.userId, userId),
          eq(attendance.date, today),
          eq(attendance.orgId, orgId)
        ),
        orderBy: [desc(attendance.createdAt)],
    });

    let status = "OFFLINE";
    if (todayLog) {
      if (todayLog.checkOut) status = "CHECKED_OUT";
      else if (todayLog.status === "ON_BREAK") status = "ON_BREAK";
      else status = "PRESENT";
    }

    const logs = await ctx.db.query.attendance.findMany({
      where: and(eq(attendance.userId, userId), eq(attendance.orgId, orgId)),
      orderBy: [desc(attendance.createdAt)],
      limit: 10,
    });
    let cooldownRemaining = 0;
    if (status === "CHECKED_OUT" && todayLog?.checkOut) {
      const lastCheckOut = new Date(todayLog.checkOut);
      const diffMs = now.getTime() - lastCheckOut.getTime();
      const diffMinutes = diffMs / (1000 * 60);
      if (diffMinutes < 2) {
        cooldownRemaining = Math.ceil((2 * 60 * 1000 - diffMs) / 1000);
      }
    }

    return {
        status,
        logs,
        todayLog,
        dailyStats: {
            workHours: dailyWorkHours.toFixed(2),
            breakHours: dailyBreakHours.toFixed(2),
            isOvertime: isDailyOvertime
        },
        cooldownRemaining,
    };
  }),

  checkIn: protectedProcedure
    .input(checkInInputSchema)
    .mutation(async ({ ctx, input }) => {
      const today = getTodayString();
      await ctx.db.transaction(async (tx) => {
        const result = await tx.select().from(attendance)
          .where(and(
            eq(attendance.userId, ctx.session.userId),
            eq(attendance.date, today),
            eq(attendance.orgId, ctx.session.orgId)
          ))
          .orderBy(desc(attendance.createdAt))
          .limit(1)
          .for('update');
          
        const existing = result[0];

        if (existing) {
          if (!existing.checkOut) {
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: "Already checked in",
            });
          }

          const lastCheckOut = new Date(existing.checkOut);
          const cooldownDiff = new Date().getTime() - lastCheckOut.getTime();
          const diffMinutes = cooldownDiff / (1000 * 60);
          if (diffMinutes < 2) {
             throw new TRPCError({
              code: "BAD_REQUEST",
              message: "Please wait 2 minutes before clocking in again.",
            });
          }

          const now = new Date();
          const gapMs = now.getTime() - lastCheckOut.getTime();
          const gapHours = gapMs / (1000 * 60 * 60);

          const currentBreaks = (existing.breaks as { start: string; end?: string }[]) || [];
          const newBreaks = [
            ...currentBreaks,
            { start: lastCheckOut.toISOString(), end: now.toISOString() }
          ];
          const newBreakHours = (Number(existing.breakHours) || 0) + gapHours;

          await tx
            .update(attendance)
            .set({
              status: "PRESENT",
              checkOut: null,
              breaks: newBreaks,
              breakHours: newBreakHours.toFixed(2),
            })
            .where(eq(attendance.id, existing.id));

          return;
        }

        await tx.insert(attendance).values({
          orgId: ctx.session.orgId,
          userId: ctx.session.userId,
          date: today,
          checkIn: new Date(),
          status: "PRESENT",
          locationData: input.location,
        });
      });
    }),

  checkOut: protectedProcedure.mutation(async ({ ctx }) => {
    const today = getTodayString();
    await ctx.db.transaction(async (tx) => {
      const result = await tx.select().from(attendance)
        .where(and(
          eq(attendance.userId, ctx.session.userId),
          eq(attendance.date, today),
          eq(attendance.orgId, ctx.session.orgId),
          isNull(attendance.checkOut)
        ))
        .orderBy(desc(attendance.createdAt))
        .limit(1)
        .for('update');
        
      const log = result[0];

      if (!log)
        throw new TRPCError({ code: "BAD_REQUEST", message: "Cannot check out" });

      if (!log.checkIn) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Missing check-in time" });
      }

      const now = new Date();
      let totalBreakHours = Number(log.breakHours) || 0;
      const breaks = (log.breaks as unknown as { start: string; end?: string }[]) || [];
      const updatedBreaks = [...breaks];

      const lastBreak = updatedBreaks[updatedBreaks.length - 1];
      if (lastBreak && !lastBreak.end) {
        lastBreak.end = now.toISOString();
        const start = new Date(lastBreak.start);
        const duration = (now.getTime() - start.getTime()) / (1000 * 60 * 60);
        totalBreakHours += Math.max(0, duration);
      }

      const checkInTime = new Date(log.checkIn);
      const durationMs = Math.max(0, now.getTime() - checkInTime.getTime());
      const sessionWorkHours = Math.max(
        0,
        (durationMs / (1000 * 60 * 60)) - totalBreakHours
      );

      const todayLogs = await tx.query.attendance.findMany({
        where: and(
          eq(attendance.userId, ctx.session.userId),
          eq(attendance.date, today),
          eq(attendance.orgId, ctx.session.orgId)
        ),
      });

      let previousWorkHours = 0;
      for (const l of todayLogs) {
        if (l.id !== log.id) {
          previousWorkHours += Number(l.workHours || 0);
        }
      }

      const totalDailyWork = previousWorkHours + sessionWorkHours;
      const isOvertime = totalDailyWork > 8;

      await tx
        .update(attendance)
        .set({
          checkOut: now,
          status: "PRESENT",
          workHours: sessionWorkHours.toFixed(2),
          breakHours: totalBreakHours.toFixed(2),
          breaks: updatedBreaks,
          isOvertime,
        })
        .where(eq(attendance.id, log.id));
    });
  }),

  toggleBreak: protectedProcedure.mutation(async ({ ctx }) => {
    const today = getTodayString();
    const log = await ctx.db.query.attendance.findFirst({
      where: and(
        eq(attendance.userId, ctx.session.userId),
        eq(attendance.date, today),
        eq(attendance.orgId, ctx.session.orgId),
        isNull(attendance.checkOut)
      ),
    });
    if (!log)
      throw new TRPCError({ code: "BAD_REQUEST", message: "Invalid action" });

    const now = new Date();
    const breaks =
      (log.breaks as unknown as { start: string; end?: string }[]) || [];

    if (log.status === "PRESENT") {
      const newBreaks = [...breaks, { start: now.toISOString() }];
      await ctx.db
        .update(attendance)
        .set({ status: "ON_BREAK", breaks: newBreaks })
        .where(eq(attendance.id, log.id));
    } else {
      const lastBreak = breaks[breaks.length - 1];
      if (lastBreak && !lastBreak.end) {
        lastBreak.end = now.toISOString();
        const start = new Date(lastBreak.start);
        const duration = (now.getTime() - start.getTime()) / (1000 * 60 * 60);
        const totalBreak = (Number(log.breakHours) || 0) + duration;
        await ctx.db
          .update(attendance)
          .set({
            status: "PRESENT",
            breaks: breaks,
            breakHours: totalBreak.toFixed(2),
          })
          .where(eq(attendance.id, log.id));
      }
    }
    }),

  getMonthlyAttendance: protectedProcedure
    .input(z.object({
        userId: z.string(),
        year: z.number(),
        month: z.number()
    }))
    .query(async ({ ctx, input }) => {
        if (ctx.session.user.id !== input.userId && ctx.session.user.role !== "CEO" && ctx.session.user.role !== "HR") {
            throw new TRPCError({ code: "FORBIDDEN" });
        }

        const startDate = new Date(input.year, input.month, 1);
        const endDate = new Date(input.year, input.month + 1, 0);

        return await ctx.db.query.attendance.findMany({
            where: and(
                eq(attendance.userId, input.userId),
                eq(attendance.orgId, ctx.session.orgId),
                gte(attendance.date, formatDateOnly(startDate)),
                lte(attendance.date, formatDateOnly(endDate))
            ),
            orderBy: [asc(attendance.date)]
        });
    }),
});
