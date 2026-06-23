import { withAuth, ok, err, parseBody } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { performanceReviews } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { updatePerformanceReviewSchema } from "@/lib/validation/hr";
import type { NextRequest } from "next/server";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ reviewId: string }> }
) {
  return withAuth(async (session) => {
    const { reviewId: id } = await params;
    const reviewId = Number(id);
    if (!reviewId) return err("Invalid review ID.", 400);

    const review = await db.query.performanceReviews.findFirst({
      where: and(eq(performanceReviews.id, reviewId), eq(performanceReviews.orgId, session.orgId)),
      with: { user: true, reviewer: true, cycle: true },
    });
    if (!review) return err("Review not found.", 404);
    return ok(review);
  });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ reviewId: string }> }
) {
  return withAuth(async (session) => {
    const { reviewId: id } = await params;
    const reviewId = Number(id);
    if (!reviewId) return err("Invalid review ID.", 400);

    const existing = await db.query.performanceReviews.findFirst({
      where: and(eq(performanceReviews.id, reviewId), eq(performanceReviews.orgId, session.orgId)),
      columns: { id: true, status: true },
    });
    if (!existing) return err("Review not found.", 404);
    if (existing.status === "COMPLETED") return err("Completed reviews cannot be deleted.", 409);

    await db.delete(performanceReviews).where(
      and(eq(performanceReviews.id, reviewId), eq(performanceReviews.orgId, session.orgId))
    );
    return ok({ success: true });
  });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ reviewId: string }> }
) {
  return withAuth(async (session) => {
    const { reviewId: id } = await params;
    const reviewId = Number(id);
    if (!reviewId) return err("Invalid review ID.", 400);

    const existing = await db.query.performanceReviews.findFirst({
      where: and(eq(performanceReviews.id, reviewId), eq(performanceReviews.orgId, session.orgId)),
    });
    if (!existing) return err("Review not found.", 404);

    const body = await parseBody(req, updatePerformanceReviewSchema);
    await db.update(performanceReviews).set({
      ...(body.ratings !== undefined && { ratings: body.ratings }),
      ...(body.strengths !== undefined && { strengths: body.strengths }),
      ...(body.improvements !== undefined && { improvements: body.improvements }),
      ...(body.overallRating !== undefined && { overallRating: body.overallRating.toString() }),
      ...(body.comments !== undefined && { comments: body.comments }),
      ...(body.status !== undefined && { status: body.status }),
      updatedAt: new Date(),
    }).where(eq(performanceReviews.id, reviewId));
    return ok({ success: true });
  });
}
