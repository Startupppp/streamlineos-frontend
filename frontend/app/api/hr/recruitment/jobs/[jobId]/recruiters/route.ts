import { withAuth, ok, err, parseBody } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { jobPostings, jobRecruiters, users } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { z } from "zod";
import type { NextRequest } from "next/server";

type RouteContext = { params: Promise<{ jobId: string }> };

const assignSchema = z.object({ userId: z.string().min(1) });

async function resolveJob(jobId: number, orgId: string) {
  return db.query.jobPostings.findFirst({
    where: and(eq(jobPostings.id, jobId), eq(jobPostings.orgId, orgId)),
  });
}

export async function GET(_req: NextRequest, { params }: RouteContext) {
  return withAuth(async (session) => {
    const { jobId } = await params;
    const id = Number(jobId);
    if (!Number.isFinite(id)) return err("Invalid job ID", 400);

    const job = await resolveJob(id, session.orgId);
    if (!job) return err("Job not found", 404);

    const rows = await db
      .select({
        id: jobRecruiters.id,
        userId: jobRecruiters.userId,
        assignedBy: jobRecruiters.assignedBy,
        assignedAt: jobRecruiters.assignedAt,
        name: users.name,
        email: users.email,
        image: users.image,
      })
      .from(jobRecruiters)
      .innerJoin(users, eq(jobRecruiters.userId, users.id))
      .where(eq(jobRecruiters.jobPostingId, id));

    return ok(rows);
  });
}

export async function POST(req: NextRequest, { params }: RouteContext) {
  return withAuth(async (session) => {
    const role = session.user.role ?? "";
    if (!["CEO", "HR", "ADMIN", "HR_MANAGER"].includes(role)) {
      return err("Forbidden", 403);
    }

    const { jobId } = await params;
    const id = Number(jobId);
    if (!Number.isFinite(id)) return err("Invalid job ID", 400);

    const job = await resolveJob(id, session.orgId);
    if (!job) return err("Job not found", 404);

    const body = await parseBody(req, assignSchema);

    const [row] = await db
      .insert(jobRecruiters)
      .values({ jobPostingId: id, userId: body.userId, assignedBy: session.user.id })
      .onConflictDoNothing()
      .returning();

    return ok(row ?? { message: "Already assigned" }, 201);
  });
}

export async function DELETE(req: NextRequest, { params }: RouteContext) {
  return withAuth(async (session) => {
    const role = session.user.role ?? "";
    if (!["CEO", "HR", "ADMIN", "HR_MANAGER"].includes(role)) {
      return err("Forbidden", 403);
    }

    const { jobId } = await params;
    const id = Number(jobId);
    if (!Number.isFinite(id)) return err("Invalid job ID", 400);

    const body = await parseBody(req, assignSchema);

    await db
      .delete(jobRecruiters)
      .where(and(eq(jobRecruiters.jobPostingId, id), eq(jobRecruiters.userId, body.userId)));

    return ok({ success: true });
  });
}
