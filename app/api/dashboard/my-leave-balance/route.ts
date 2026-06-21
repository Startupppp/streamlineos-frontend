import { withAuth, ok } from "@/lib/api/helpers";
import { cached, CACHE_TTL } from "@/lib/cache";
import { db } from "@/lib/db";
import { leaveBalances, leaveTypes } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";

export async function GET() {
  return withAuth(async (session) => {
    const currentYear = new Date().getFullYear();
    const orgId = session.orgId;
    const userId = session.user.id;

    const key = `dashboard:my-leave-balance:${orgId}:${userId}:${currentYear}`;
    const data = await cached(
      key,
      () =>
        db
          .select({
            id: leaveBalances.id,
            balance: leaveBalances.balance,
            year: leaveBalances.year,
            leaveTypeName: leaveTypes.name,
            daysPerYear: leaveTypes.daysPerYear,
          })
          .from(leaveBalances)
          .leftJoin(leaveTypes, eq(leaveBalances.leaveTypeId, leaveTypes.id))
          .where(
            and(
              eq(leaveBalances.orgId, orgId),
              eq(leaveBalances.userId, userId),
              eq(leaveBalances.year, currentYear)
            )
          ),
      { ttlSeconds: CACHE_TTL.SHORT },
    );

    return ok(data);
  });
}
