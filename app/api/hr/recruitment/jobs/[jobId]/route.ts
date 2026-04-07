import { withAuth, ok, err } from "@/lib/api/helpers";
import { isAdminOrOwner } from "@/lib/auth-helpers";
import { db } from "@/lib/db";
import { jobPostings } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { formatDateOnly } from "@/lib/date-utils";
import type { NextRequest } from "next/server";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  return withAuth(async (session) => {
    const { jobId: id } = await params;
    const jobId = Number(id);
    if (!jobId) return err("Invalid job ID.", 400);

    const job = await db.query.jobPostings.findFirst({
      where: and(eq(jobPostings.id, jobId), eq(jobPostings.orgId, session.orgId)),
      with: { applications: true },
    });

    if (!job) return err("Job posting not found.", 404);
    return ok(job);
  });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  return withAuth(async (session) => {
    if (!isAdminOrOwner(session.user.role)) {
      return err("Only admins can update job postings.", 403);
    }

    const { jobId: id } = await params;
    const jobId = Number(id);
    if (!jobId) return err("Invalid job ID.", 400);

    const existing = await db.query.jobPostings.findFirst({
      where: and(eq(jobPostings.id, jobId), eq(jobPostings.orgId, session.orgId)),
    });
    if (!existing) return err("Job posting not found.", 404);

    const body = await req.json() as Record<string, unknown>;

    await db
      .update(jobPostings)
      .set({
        ...(body.title !== undefined && { title: body.title as string }),
        ...(body.departmentId !== undefined && { departmentId: body.departmentId as number }),
        ...(body.location !== undefined && { location: body.location as string }),
        ...(body.type !== undefined && { type: body.type as string }),
        ...(body.experience !== undefined && { experience: body.experience as string }),
        ...(body.salaryMin !== undefined && { salaryMin: String(body.salaryMin) }),
        ...(body.salaryMax !== undefined && { salaryMax: String(body.salaryMax) }),
        ...(body.description !== undefined && { description: body.description as string }),
        ...(body.requirements !== undefined && { requirements: body.requirements as string }),
        ...(body.benefits !== undefined && { benefits: body.benefits as string }),
        ...(body.status !== undefined && { status: body.status as typeof existing.status }),
        ...(body.openings !== undefined && { openings: body.openings as number }),
        ...(body.applicationDeadline !== undefined && {
          applicationDeadline: formatDateOnly(new Date(body.applicationDeadline as string)),
        }),
        updatedAt: new Date(),
      })
      .where(eq(jobPostings.id, jobId));

    return ok({ success: true });
  });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  return withAuth(async (session) => {
    if (!isAdminOrOwner(session.user.role)) {
      return err("Only admins can delete job postings.", 403);
    }

    const { jobId: id } = await params;
    const jobId = Number(id);
    if (!jobId) return err("Invalid job ID.", 400);

    await db.delete(jobPostings).where(
      and(eq(jobPostings.id, jobId), eq(jobPostings.orgId, session.orgId))
    );

    return ok({ success: true });
  });
}
