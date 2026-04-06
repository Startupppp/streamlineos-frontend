import { withAuth, ok, err, parseBody } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { performanceReviews, organizationMembers } from "@/lib/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { isAdminOrOwner } from "@/lib/auth-helpers";
import { createPerformanceReviewSchema } from "@/lib/validations/hr";
import type { NextRequest } from "next/server";

export async function GET(req: NextRequest) {
  return withAuth(async (session) => {
    const isAdmin = isAdminOrOwner(session.user.role);
    const filterUserId = req.nextUrl.searchParams.get("userId") ?? undefined;
    const cycleId = req.nextUrl.searchParams.get("cycleId");

    if (filterUserId && filterUserId !== session.user.id && !isAdmin) {
      return err("Not authorized.", 403);
    }

    const conditions = [eq(performanceReviews.orgId, session.orgId)];
    if (filterUserId) conditions.push(eq(performanceReviews.userId, filterUserId));
    else if (!isAdmin) conditions.push(eq(performanceReviews.userId, session.user.id));
    if (cycleId) conditions.push(eq(performanceReviews.cycleId, Number(cycleId)));

    const data = await db.query.performanceReviews.findMany({
      where: and(...conditions),
      with: { user: true, reviewer: true, cycle: true },
      orderBy: [desc(performanceReviews.createdAt)],
    });
    return ok(data);
  });
}

export async function POST(req: NextRequest) {
  return withAuth(async (session) => {
    if (!isAdminOrOwner(session.user.role)) {
      return err("Only admins can create reviews.", 403);
    }

    const body = await parseBody(req, createPerformanceReviewSchema);

    const targetMember = await db.query.organizationMembers.findFirst({
      where: and(
        eq(organizationMembers.userId, body.userId),
        eq(organizationMembers.orgId, session.orgId)
      ),
    });
    if (!targetMember) return err("Employee not found in your organization.", 404);

    const [review] = await db
      .insert(performanceReviews)
      .values({
        orgId: session.orgId,
        userId: body.userId,
        reviewerId: body.reviewerId ?? session.user.id,
        cycleId: body.cycleId,
        periodStart: body.periodStart,
        periodEnd: body.periodEnd,
        ratings: body.ratings,
        strengths: body.strengths,
        improvements: body.improvements,
        overallRating: body.overallRating?.toString(),
        comments: body.comments,
        status: "DRAFT",
      })
      .returning();

    return ok(review, 201);
  });
}
