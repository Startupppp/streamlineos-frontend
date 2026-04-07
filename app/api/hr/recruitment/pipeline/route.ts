import { withAuth, ok } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { candidates } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
import type { CandidateStatus } from "@/types/hr";

const PIPELINE_STAGES: CandidateStatus[] = ["NEW", "SCREENING", "INTERVIEW", "OFFER", "HIRED", "REJECTED"];

export async function GET() {
  return withAuth(async (session) => {
    const allCandidates = await db.query.candidates.findMany({
      where: eq(candidates.orgId, session.orgId),
      orderBy: [desc(candidates.createdAt)],
    });

    const pipeline: Record<string, typeof allCandidates> = {};
    for (const stage of PIPELINE_STAGES) {
      pipeline[stage] = allCandidates.filter((c) => c.status === stage);
    }

    return ok(pipeline);
  });
}
