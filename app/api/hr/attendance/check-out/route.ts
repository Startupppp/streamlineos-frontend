import { withAuth, ok, err } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { attendance } from "@/lib/db/schema";
import { eq, and, desc, isNull } from "drizzle-orm";
import { getTodayString } from "@/lib/date-utils";

export async function POST() {
  return withAuth(async (session) => {
    const today = getTodayString();

    try {
      await db.transaction(async (tx) => {
        const result = await tx
          .select()
          .from(attendance)
          .where(
            and(
              eq(attendance.userId, session.user.id),
              eq(attendance.date, today),
              eq(attendance.orgId, session.orgId),
              isNull(attendance.checkOut)
            )
          )
          .orderBy(desc(attendance.createdAt))
          .limit(1)
          .for("update");

        const log = result[0];
        if (!log) throw new Error("Cannot check out");
        if (!log.checkIn) throw new Error("Missing check-in time");

        const now = new Date();
        let totalBreakHours = Number(log.breakHours) || 0;
        const breaks =
          (log.breaks as unknown as { start: string; end?: string }[]) || [];
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
          durationMs / (1000 * 60 * 60) - totalBreakHours
        );

        const todayLogs = await tx.query.attendance.findMany({
          where: and(
            eq(attendance.userId, session.user.id),
            eq(attendance.date, today),
            eq(attendance.orgId, session.orgId)
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

      return ok({ success: true });
    } catch (e) {
      const message = e instanceof Error ? e.message : "Check-out failed";
      return err(message, 400);
    }
  });
}
