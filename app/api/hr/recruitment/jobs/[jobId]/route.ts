import { withAuth, ok, err, parseBody } from "@/lib/api/helpers";
import { isAdminOrOwner } from "@/lib/auth-helpers";
import { db } from "@/lib/db";
import { jobPostings } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { formatDateOnly } from "@/lib/date-utils";
import { z } from "zod";
import type { NextRequest } from "next/server";

const updateJobSchema = z
  .object({
    title: z.string().min(1).max(200),
    departmentId: z.number().int().positive(),
    location: z.string().max(200),
    type: z.string().max(50),
    experience: z.string().max(100),
    salaryMin: z.union([z.number(), z.string()]),
    salaryMax: z.union([z.number(), z.string()]),
    description: z.string().max(20_000),
    requirements: z.string().max(20_000),
    benefits: z.string().max(20_000),
    status: z.enum(["DRAFT", "OPEN", "PAUSED", "CLOSED", "FILLED"]),
    openings: z.number().int().positive(),
    applicationDeadline: z.string().datetime().or(z.string().regex(/^\d{4}-\d{2}-\d{2}/)),
  })
  .partial();

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

    const body = await parseBody(req, updateJobSchema);

    await db
      .update(jobPostings)
      .set({
        ...(body.title !== undefined && { title: body.title }),
        ...(body.departmentId !== undefined && { departmentId: body.departmentId }),
        ...(body.location !== undefined && { location: body.location }),
        ...(body.type !== undefined && { type: body.type }),
        ...(body.experience !== undefined && { experience: body.experience }),
        ...(body.salaryMin !== undefined && { salaryMin: String(body.salaryMin) }),
        ...(body.salaryMax !== undefined && { salaryMax: String(body.salaryMax) }),
        ...(body.description !== undefined && { description: body.description }),
        ...(body.requirements !== undefined && { requirements: body.requirements }),
        ...(body.benefits !== undefined && { benefits: body.benefits }),
        ...(body.status !== undefined && { status: body.status }),
        ...(body.openings !== undefined && { openings: body.openings }),
        ...(body.applicationDeadline !== undefined && {
          applicationDeadline: formatDateOnly(new Date(body.applicationDeadline)),
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
