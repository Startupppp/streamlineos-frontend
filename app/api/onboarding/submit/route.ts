import { withAuth, ok, err } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { onboardingSteps, organizationMembers, leaveTypes, leaveBalances } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";

export async function POST() {
  return withAuth(async (session) => {
    // Mark the final review step as complete
    const existing = await db.query.onboardingSteps.findFirst({
      where: and(
        eq(onboardingSteps.userId, session.user.id),
        eq(onboardingSteps.stepName, "Final Review")
      ),
    });
    if (existing) {
      await db.update(onboardingSteps)
        .set({ status: "COMPLETED", completedAt: new Date() })
        .where(eq(onboardingSteps.id, existing.id));
    } else {
      await db.insert(onboardingSteps).values({
        userId: session.user.id,
        orgId: session.orgId,
        stepName: "Final Review",
        status: "COMPLETED",
        completedAt: new Date(),
      });
    }

    // Allocate default leaves if not already allocated
    const currentYear = new Date().getFullYear();
    const existingBalance = await db.query.leaveBalances.findFirst({
      where: and(
        eq(leaveBalances.userId, session.user.id),
        eq(leaveBalances.year, currentYear)
      ),
    });

    if (!existingBalance) {
      const orgLeaveTypes = await db.query.leaveTypes.findMany({
        where: eq(leaveTypes.orgId, session.orgId),
      });

      if (orgLeaveTypes.length > 0) {
        await db.insert(leaveBalances).values(
          orgLeaveTypes.map((lt) => ({
            orgId: session.orgId,
            userId: session.user.id,
            leaveTypeId: lt.id,
            balance: String(lt.daysPerYear),
            year: currentYear,
          }))
        );
      }
    }

    return ok({ success: true });
  });
}
