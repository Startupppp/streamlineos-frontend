import { withAuth, ok, err } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { attendance } from "@/lib/db/schema";
import { eq, and, isNull } from "drizzle-orm";
import { getTodayString } from "@/lib/date-utils";

export async function POST() {
  return withAuth(async (session) => {
    const today = getTodayString();

    try {
      const log = await db.query.attendance.findFirst({
        where: and(
          eq(attendance.userId, session.user.id),
          eq(attendance.date, today),
          eq(attendance.orgId, session.orgId),
          isNull(attendance.checkOut)
        ),
      });

      if (!log) return err("Invalid action", 400);

      const now = new Date();
      const breaks =
        (log.breaks as unknown as { start: string; end?: string }[]) || [];

      if (log.status === "PRESENT") {
        const newBreaks = [...breaks, { start: now.toISOString() }];
        await db
          .update(attendance)
          .set({ status: "ON_BREAK", breaks: newBreaks })
          .where(eq(attendance.id, log.id));
      } else {
        const lastBreak = breaks[breaks.length - 1];
        if (lastBreak && !lastBreak.end) {
          lastBreak.end = now.toISOString();
          const start = new Date(lastBreak.start);
          const duration =
            (now.getTime() - start.getTime()) / (1000 * 60 * 60);
          const totalBreak = (Number(log.breakHours) || 0) + duration;
          await db
            .update(attendance)
            .set({
              status: "PRESENT",
              breaks: breaks,
              breakHours: totalBreak.toFixed(2),
            })
            .where(eq(attendance.id, log.id));
        }
      }

      return ok({ success: true });
    } catch (e) {
      const message = e instanceof Error ? e.message : "Toggle break failed";
      return err(message, 400);
    }
  });
}
