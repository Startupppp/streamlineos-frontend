import { withAuth, ok, err, parseBody } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { candidates, candidateApplications, jobPostings } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { z } from "zod";
import type { NextRequest } from "next/server";

const schema = z.object({
  coverLetter: z.string().max(5000).optional(),
  notes: z.string().max(2000).optional(),
});

type RouteContext = { params: Promise<{ jobId: string }> };

export async function POST(req: NextRequest, { params }: RouteContext) {
  return withAuth(async (session) => {
    const { jobId } = await params;
    const id = Number(jobId);
    if (!Number.isFinite(id)) return err("Invalid job ID", 400);

    const job = await db.query.jobPostings.findFirst({
      where: and(
        eq(jobPostings.id, id),
        eq(jobPostings.orgId, session.orgId),
        eq(jobPostings.isInternal, true),
        eq(jobPostings.status, "OPEN")
      ),
    });
    if (!job) return err("Job not found or not accepting internal applications", 404);

    const body = await parseBody(req, schema);

    let candidateId: number;

    const existing = await db.query.candidates.findFirst({
      where: and(eq(candidates.email, session.user.email ?? ""), eq(candidates.orgId, session.orgId)),
    });

    if (existing) {
      candidateId = existing.id;
    } else {
      const [created] = await db.insert(candidates).values({
        orgId: session.orgId,
        firstName: session.user.name?.split(" ")[0] ?? "Employee",
        lastName: session.user.name?.split(" ").slice(1).join(" ") ?? "",
        email: session.user.email ?? "",
        source: "INTERNAL",
      }).returning({ id: candidates.id });
      candidateId = created.id;
    }

    const existingApp = await db.query.candidateApplications.findFirst({
      where: and(
        eq(candidateApplications.candidateId, candidateId),
        eq(candidateApplications.jobPostingId, id)
      ),
    });

    if (existingApp) return err("You have already applied for this position", 409);

    const [application] = await db.insert(candidateApplications).values({
      orgId: session.orgId,
      candidateId,
      jobPostingId: id,
      coverLetter: body.coverLetter,
      notes: body.notes,
      status: "APPLIED",
    }).returning();

    return ok(application, 201);
  });
}
