import { withAuth, ok, err } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { candidateApplications, candidates } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import type { NextRequest } from "next/server";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ candidateId: string }> }
) {
  return withAuth(async (session) => {
    const { candidateId: id } = await params;
    const candidateId = Number(id);
    if (!candidateId) return err("Invalid candidate ID.", 400);

    const candidate = await db.query.candidates.findFirst({
      where: and(eq(candidates.id, candidateId), eq(candidates.orgId, session.orgId)),
    });
    if (!candidate) return err("Candidate not found.", 404);

    const body = await req.json() as {
      jobPostingId: number;
      coverLetter?: string;
    };

    if (!body.jobPostingId) return err("jobPostingId is required.", 400);

    const [application] = await db
      .insert(candidateApplications)
      .values({
        orgId: session.orgId,
        candidateId,
        jobPostingId: body.jobPostingId,
        coverLetter: body.coverLetter,
        status: "APPLIED",
      })
      .returning();

    return ok(application);
  });
}
