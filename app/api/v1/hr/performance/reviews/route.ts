import { withAuth, ok, err } from "@/lib/api/helpers";
import { getPerformanceReviews } from "@/server/queries/hr";
import { db } from "@/lib/db";
import { performanceReviews, organizationMembers } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { isAdminOrOwner } from "@/lib/auth-helpers";
import { formatDateOnly } from "@/lib/date-utils";
import type { RatingEntry, GoalEntry } from "@/types/hr";
import type { NextRequest } from "next/server";

export async function GET(req: NextRequest) {
  return withAuth(async (session) => {
    const { searchParams } = req.nextUrl;
    const isAdmin = isAdminOrOwner(session.user.role);
    const filterUserId = searchParams.get("userId") ?? undefined;

    if (filterUserId && filterUserId !== session.user.id && !isAdmin) {
      return err("Not authorized.", 403);
    }

    const data = await getPerformanceReviews(
      session.orgId,
      session.user.id,
      isAdmin,
      filterUserId
    );
    return ok(data);
  });
}

export async function POST(req: NextRequest) {
  return withAuth(async (session) => {
    if (!isAdminOrOwner(session.user.role)) {
      return err("Only admins can create performance reviews.", 403);
    }

    const body = await req.json() as {
      userId: string;
      reviewerId?: string;
      periodStart: string;
      periodEnd: string;
      ratings?: RatingEntry[];
      strengths?: string;
      improvements?: string;
      goals?: GoalEntry[];
      overallRating?: number;
      comments?: string;
    };

    if (!body.userId || !body.periodStart || !body.periodEnd) {
      return err("userId, periodStart, and periodEnd are required.", 400);
    }

    const targetMember = await db.query.organizationMembers.findFirst({
      where: and(
        eq(organizationMembers.userId, body.userId),
        eq(organizationMembers.orgId, session.orgId)
      ),
    });
    if (!targetMember) {
      return err("Target user not found in your organization.", 404);
    }

    const [review] = await db
      .insert(performanceReviews)
      .values({
        orgId: session.orgId,
        userId: body.userId,
        reviewerId: body.reviewerId || session.user.id,
        periodStart: formatDateOnly(new Date(body.periodStart)),
        periodEnd: formatDateOnly(new Date(body.periodEnd)),
        ratings: body.ratings,
        strengths: body.strengths,
        improvements: body.improvements,
        goals: body.goals,
        overallRating: body.overallRating?.toString(),
        comments: body.comments,
        status: "DRAFT",
      })
      .returning();

    return ok(review);
  });
}
