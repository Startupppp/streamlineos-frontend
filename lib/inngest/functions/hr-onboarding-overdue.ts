import { inngest } from "../client";
import { db } from "@/lib/db";
import { onboardingTasks, users } from "@/lib/db/schema";
import { eq, and, lt, isNotNull } from "drizzle-orm";

export const hrOnboardingOverdue = inngest.createFunction(
  { id: "hr-onboarding-overdue", name: "HR Onboarding Task Overdue Check", triggers: { cron: "0 9 * * *" } },
  async ({ step }) => {
    return step.run("check-overdue-onboarding-tasks", async () => {
      const now = new Date();

      const overdueTasks = await db
        .select({
          id: onboardingTasks.id,
          orgId: onboardingTasks.orgId,
          userId: onboardingTasks.userId,
          title: onboardingTasks.title,
          dueDate: onboardingTasks.dueDate,
        })
        .from(onboardingTasks)
        .where(
          and(
            eq(onboardingTasks.status, "PENDING"),
            isNotNull(onboardingTasks.dueDate),
            lt(onboardingTasks.dueDate, now),
          ),
        )
        .limit(500);

      if (overdueTasks.length === 0) return { fired: 0 };

      const { runAutomationsForEvent } = await import("@/lib/services/automation/engine");

      const userIds = [...new Set(overdueTasks.map((t) => t.userId))];
      const employeeRows = await db.query.users.findMany({
        where: (u, { inArray }) => inArray(u.id, userIds),
        columns: { id: true, name: true },
      });
      const nameMap = new Map(employeeRows.map((u) => [u.id, u.name ?? ""]));

      let fired = 0;
      for (const task of overdueTasks) {
        await runAutomationsForEvent(task.orgId, "onboarding.task_overdue", {
          taskId: task.id,
          taskTitle: task.title,
          userId: task.userId,
          employeeName: nameMap.get(task.userId) ?? "",
          dueDate: task.dueDate?.toISOString() ?? "",
          overdueAt: now.toISOString(),
        });
        fired++;
      }

      return { fired };
    });
  },
);
