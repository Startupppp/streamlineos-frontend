import { withAuth, ok, err } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { headcountRequests, jobPostings } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import type { NextRequest } from "next/server";

type RouteContext = { params: Promise<{ requestId: string }> };

export async function POST(_req: NextRequest, { params }: RouteContext) {
  return withAuth(async (session) => {
    const role = session.user.role ?? "";
    if (!["CEO", "HR", "ADMIN", "HR_MANAGER"].includes(role)) return err("Forbidden", 403);

    const { requestId } = await params;
    const id = Number(requestId);
    if (!Number.isFinite(id)) return err("Invalid request ID", 400);

    const request = await db.query.headcountRequests.findFirst({
      where: and(eq(headcountRequests.id, id), eq(headcountRequests.orgId, session.orgId)),
    });
    if (!request) return err("Not found", 404);
    if (request.status !== "APPROVED") return err("Only APPROVED requests can create a job posting", 400);
    if (request.linkedJobPostingId) return err("A job posting has already been created for this request", 409);

    const [job] = await db
      .insert(jobPostings)
      .values({
        orgId: session.orgId,
        title: request.requestedRole,
        departmentId: request.departmentId,
        postedBy: session.user.id,
        status: "DRAFT",
      })
      .returning();

    await db
      .update(headcountRequests)
      .set({ status: "JOB_CREATED", linkedJobPostingId: job.id })
      .where(eq(headcountRequests.id, id));

    return ok({ jobId: job.id, jobTitle: job.title }, 201);
  });
}
