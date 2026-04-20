import { type NextRequest } from "next/server";
import { withAdmin, ok } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { leads, expenses, tasks, users, onboardingTasks, leaveRequests } from "@/lib/db/schema";
import { eq, and, isNull, lt, sql, count } from "drizzle-orm";

export async function GET(_req: NextRequest) {
  return withAdmin(async (session) => {
    const orgId = session.orgId;

    const [
      unassignedLeadsResult,
      overdueTasksResult,
      pendingExpensesResult,
      pendingLeavesResult,
      onboardingResult,
      totalEmployeesResult,
    ] = await Promise.all([
      db
        .select({ count: count() })
        .from(leads)
        .where(and(eq(leads.orgId, orgId), isNull(leads.assignedToId), sql`${leads.status} NOT IN ('CONVERTED', 'LOST')`)),

      db
        .select({ count: count() })
        .from(tasks)
        .where(and(eq(tasks.orgId, orgId), eq(tasks.status, "pending"), lt(tasks.dueDate, new Date()))),

      db
        .select({
          count: count(),
          totalAmount: sql<string>`COALESCE(SUM(${expenses.amount}::numeric), 0)`,
        })
        .from(expenses)
        .where(and(eq(expenses.orgId, orgId), eq(expenses.status, "PENDING"))),

      db
        .select({ count: count() })
        .from(leaveRequests)
        .where(and(eq(leaveRequests.orgId, orgId), eq(leaveRequests.status, "PENDING"))),

      db
        .select({
          total: count(),
          completed: sql<number>`COUNT(CASE WHEN ${onboardingTasks.status} = 'COMPLETED' THEN 1 END)`,
        })
        .from(onboardingTasks)
        .where(eq(onboardingTasks.orgId, orgId)),

      db
        .select({ count: count() })
        .from(users)
        .where(eq(users.isActive, true)),
    ]);

    const totalOnboarding = onboardingResult[0]?.total ?? 0;
    const completedOnboarding = onboardingResult[0]?.completed ?? 0;
    const onboardingPercent = totalOnboarding > 0 ? Math.round((completedOnboarding / totalOnboarding) * 100) : 100;

    return ok({
      unassignedLeads: unassignedLeadsResult[0]?.count ?? 0,
      overdueTasks: overdueTasksResult[0]?.count ?? 0,
      pendingExpenses: {
        count: pendingExpensesResult[0]?.count ?? 0,
        totalAmount: pendingExpensesResult[0]?.totalAmount ?? "0",
      },
      pendingLeaves: pendingLeavesResult[0]?.count ?? 0,
      onboarding: {
        totalTasks: totalOnboarding,
        completedTasks: completedOnboarding,
        completionPercent: onboardingPercent,
      },
      totalEmployees: totalEmployeesResult[0]?.count ?? 0,
    });
  });
}
