import { inngest } from "../client";
import { db } from "@/lib/db";
import { onboardingTasks, users } from "@/lib/db/schema";
import { and, eq, inArray, isNull, sql } from "drizzle-orm";

export const hrOnboardingCompleted = inngest.createFunction(
  { id: "hr-onboarding-completed", name: "HR Onboarding Completion Check", triggers: { cron: "0 10 * * *" } },
  async ({ step }) => {
    return step.run("check-onboarding-completions", async () => {
      const taskStats = await db
        .select({
          userId: onboardingTasks.userId,
          orgId: onboardingTasks.orgId,
          total: sql<number>`COUNT(*)`,
          pending: sql<number>`SUM(CASE WHEN ${onboardingTasks.status} != 'COMPLETED' THEN 1 ELSE 0 END)`,
        })
        .from(onboardingTasks)
        .groupBy(onboardingTasks.userId, onboardingTasks.orgId);

      const fullyCompleted = taskStats.filter((s) => Number(s.total) > 0 && Number(s.pending) === 0);
      if (fullyCompleted.length === 0) return { fired: 0 };

      const userIds = fullyCompleted.map((s) => s.userId);

      const employeeRows = await db
        .select({ id: users.id, name: users.name, email: users.email })
        .from(users)
        .where(
          and(
            inArray(users.id, userIds),
            isNull(users.onboardingCompletedAt),
          ),
        );

      if (employeeRows.length === 0) return { fired: 0 };

      const { runAutomationsForEvent } = await import("@/lib/services/automation/engine");

      const now = new Date();
      let fired = 0;

      for (const employee of employeeRows) {
        const stats = fullyCompleted.find((s) => s.userId === employee.id);
        if (!stats) continue;

        await runAutomationsForEvent(stats.orgId, "onboarding.completed", {
          userId: employee.id,
          employeeName: employee.name ?? "",
          employeeEmail: employee.email ?? "",
          totalTasks: Number(stats.total),
          completedAt: now.toISOString(),
        });

        await db
          .update(users)
          .set({ onboardingCompletedAt: now })
          .where(eq(users.id, employee.id));

        fired++;
      }

      return { fired };
    });
  },
);
