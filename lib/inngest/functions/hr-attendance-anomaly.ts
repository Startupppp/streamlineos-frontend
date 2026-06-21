import { inngest } from "../client";
import { db } from "@/lib/db";
import { attendance, users } from "@/lib/db/schema";
import { eq, and, gte, lte, sql } from "drizzle-orm";
import { subDays, format } from "date-fns";

export const hrAttendanceAnomaly = inngest.createFunction(
  { id: "hr-attendance-anomaly", name: "HR Attendance Anomaly Check", triggers: { cron: "0 8 * * 1" } },
  async ({ step }) => {
    return step.run("detect-attendance-anomalies", async () => {
      const now = new Date();
      const weekStart = subDays(now, 7);
      const weekStartStr = format(weekStart, "yyyy-MM-dd");
      const weekEndStr = format(now, "yyyy-MM-dd");

      const absentRows = await db
        .select({
          userId: attendance.userId,
          orgId: attendance.orgId,
          absentDays: sql<number>`SUM(CASE WHEN ${attendance.status} = 'ABSENT' THEN 1 ELSE 0 END)`,
          lateDays: sql<number>`SUM(CASE WHEN ${attendance.status} = 'LATE' THEN 1 ELSE 0 END)`,
          totalDays: sql<number>`COUNT(*)`,
        })
        .from(attendance)
        .where(
          and(
            gte(attendance.date, weekStartStr),
            lte(attendance.date, weekEndStr),
          ),
        )
        .groupBy(attendance.userId, attendance.orgId);

      const anomalies = absentRows.filter(
        (r) => Number(r.absentDays) >= 2 || Number(r.lateDays) >= 3,
      );

      if (anomalies.length === 0) return { fired: 0 };

      const userIds = anomalies.map((a) => a.userId);
      const employeeRows = await db.query.users.findMany({
        where: (u, { inArray }) => inArray(u.id, userIds),
        columns: { id: true, name: true },
      });
      const nameMap = new Map(employeeRows.map((u) => [u.id, u.name ?? ""]));

      const { runAutomationsForEvent } = await import("@/lib/services/automation/engine");

      let fired = 0;
      for (const row of anomalies) {
        await runAutomationsForEvent(row.orgId, "attendance.anomaly", {
          userId: row.userId,
          employeeName: nameMap.get(row.userId) ?? "",
          weekStart: weekStartStr,
          weekEnd: weekEndStr,
          absentDays: Number(row.absentDays),
          lateDays: Number(row.lateDays),
          totalDays: Number(row.totalDays),
        });
        fired++;
      }

      return { fired };
    });
  },
);
