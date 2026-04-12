import { type NextRequest } from "next/server";
import { withAuth, ok, err, parseBody } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { leaveBalances, leaveTypes } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { z } from "zod";

export const dynamic = "force-dynamic";

const creditSchema = z.object({
  userId: z.string().min(1),
  days: z.number().positive().max(30),
  reason: z.string().optional(),
});

/** POST /api/hr/leaves/comp-off — credit compensatory leave to an employee
 *  Called by HR/Admin when employee works on a holiday.
 */
export async function POST(req: NextRequest) {
  return withAuth(async (session) => {
    const role = session.user.role;
    if (!["CEO", "ADMIN", "HR", "BRANCH_HR", "BRANCH_MANAGER"].includes(role)) {
      return err("Forbidden", 403);
    }

    const input = await parseBody(req, creditSchema);
    

    // Find or create a "Compensatory Off" leave type
    let compOffType = await db.query.leaveTypes.findFirst({
      where: and(eq(leaveTypes.orgId, session.orgId), eq(leaveTypes.name, "Compensatory Off")),
    });

    if (!compOffType) {
      const [created] = await db
        .insert(leaveTypes)
        .values({
          orgId: session.orgId,
          name: "Compensatory Off",
          daysPerYear: 30,
          carryForward: false,
        })
        .returning();
      compOffType = created;
    }

    if (!compOffType) return err("Failed to find/create comp-off leave type", 500);

    // Upsert leave balance
    const existing = await db.query.leaveBalances.findFirst({
      where: and(
        eq(leaveBalances.userId, input.userId),
        eq(leaveBalances.leaveTypeId, compOffType.id),
      ),
    });

    if (existing) {
      const newBalance = Number(existing.balance ?? 0) + input.days;
      await db
        .update(leaveBalances)
        .set({ balance: String(newBalance) })
        .where(eq(leaveBalances.id, existing.id));
    } else {
      await db.insert(leaveBalances).values({
        orgId: session.orgId,
        userId: input.userId,
        leaveTypeId: compOffType.id,
        balance: String(input.days),
        year: new Date().getFullYear(),
      });
    }

    return ok({
      success: true,
      credited: input.days,
      leaveTypeId: compOffType.id,
    });
  });
}
