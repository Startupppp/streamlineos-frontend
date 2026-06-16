import { type NextRequest } from "next/server";
import { withAuth, ok, err } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { users, organizationMembers } from "@/lib/db/schema";
import { attendance, leaveRequests, performanceReviews } from "@/lib/db/schema/hr";
import { eq, and, avg, count, gte } from "drizzle-orm";
import { getSessionAbility } from "@/lib/abilities-server";
import { subDays, format } from "date-fns";

export interface ManagerScorecard {
  managerId: string;
  teamSize: number;
  avgPerformanceRating: number | null;
  teamAttendanceRate: number | null;
  pendingLeaveRequests: number;
  directReports: Array<{
    id: string;
    name: string | null;
    image: string | null;
    designation: string | null;
    avgRating: number | null;
  }>;
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ employeeId: string }> },
) {
  return withAuth(async (session) => {
    const { employeeId } = await params;

    const isSelf = session.user.id === employeeId;
    const ability = await getSessionAbility();
    if (!isSelf && !ability.can("manage", "hr:performance")) {
      return err("Access denied", 403);
    }

    const member = await db.query.organizationMembers.findFirst({
      where: and(
        eq(organizationMembers.userId, employeeId),
        eq(organizationMembers.orgId, session.orgId),
      ),
    });
    if (!member) return err("Employee not found", 404);

    const reports = await db
      .select({
        id: users.id,
        name: users.name,
        image: users.image,
        designation: users.designation,
      })
      .from(users)
      .innerJoin(organizationMembers, eq(organizationMembers.userId, users.id))
      .where(
        and(
          eq(organizationMembers.orgId, session.orgId),
          eq(users.reportingTo, employeeId),
          eq(users.isActive, true),
        ),
      );

    if (reports.length === 0) {
      return ok({
        managerId: employeeId,
        teamSize: 0,
        avgPerformanceRating: null,
        teamAttendanceRate: null,
        pendingLeaveRequests: 0,
        directReports: [],
      });
    }

    const reportIds = reports.map((r) => r.id);

    const ratingsPerReport = await Promise.all(
      reportIds.map(async (userId) => {
        const [r] = await db
          .select({ avg: avg(performanceReviews.overallRating) })
          .from(performanceReviews)
          .where(
            and(
              eq(performanceReviews.orgId, session.orgId),
              eq(performanceReviews.userId, userId),
            ),
          );
        return { userId, avg: r?.avg ? parseFloat(String(r.avg)) : null };
      }),
    );

    const thirtyDaysAgo = format(subDays(new Date(), 30), "yyyy-MM-dd");
    const attendanceCounts = await Promise.all(
      reportIds.map(async (userId) => {
        const [r] = await db
          .select({ cnt: count() })
          .from(attendance)
          .where(
            and(
              eq(attendance.orgId, session.orgId),
              eq(attendance.userId, userId),
              gte(attendance.date, thirtyDaysAgo),
            ),
          );
        return r?.cnt ?? 0;
      }),
    );
    const totalPresent = attendanceCounts.reduce((a, b) => a + b, 0);
    const maxPossible = reportIds.length * 30;
    const teamAttendanceRate = maxPossible > 0 ? Math.round((totalPresent / maxPossible) * 100) : null;

    const [pendingResult] = await db
      .select({ cnt: count() })
      .from(leaveRequests)
      .where(
        and(
          eq(leaveRequests.orgId, session.orgId),
          eq(leaveRequests.status, "PENDING"),
          eq(leaveRequests.approverId, employeeId),
        ),
      );
    const pendingLeaveRequests = pendingResult?.cnt ?? 0;

    const ratingValues = ratingsPerReport.map((r) => r.avg).filter((v): v is number => v !== null);
    const avgPerformanceRating = ratingValues.length > 0
      ? Math.round((ratingValues.reduce((a, b) => a + b, 0) / ratingValues.length) * 10) / 10
      : null;

    const directReports = reports.map((r) => ({
      ...r,
      avgRating: ratingsPerReport.find((rr) => rr.userId === r.id)?.avg ?? null,
    }));

    return ok({
      managerId: employeeId,
      teamSize: reports.length,
      avgPerformanceRating,
      teamAttendanceRate,
      pendingLeaveRequests,
      directReports,
    });
  });
}
